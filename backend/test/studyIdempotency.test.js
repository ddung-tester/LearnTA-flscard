const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseClientRequestId, requestFingerprint, insertOnce } = require("../src/utils/studyIdempotency");

test("request keys accept legacy omission but reject malformed supplied keys", () => {
  assert.equal(parseClientRequestId(undefined), null);
  assert.equal(parseClientRequestId("local-123-abc"), "local-123-abc");
  for (const value of ["", "x".repeat(81), "a b", "a/b", 7, {}]) {
    assert.throws(() => parseClientRequestId(value), { statusCode: 400 });
  }
});

test("new inserts return their generated id without a replay query", async () => {
  const result = await insertOnce({ query() { throw new Error("unexpected query"); } }, "study_sessions", 7, "key", "hash", async () => [{ insertId: 12 }]);
  assert.deepEqual(result, { id: 12, replayed: false });
});

test("duplicate replay is scoped to both user and key and checks the payload", async () => {
  const duplicate = Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
  const insert = async () => { throw duplicate; };
  const fingerprint = requestFingerprint([10, "quiz", 1]);
  const connection = { query: async (sql, params) => {
    assert.match(sql, /WHERE user_id = \? AND client_request_id = \?/);
    assert.deepEqual(params, [7, "key"]);
    return [[{ id: 12, request_hash: fingerprint }]];
  } };
  assert.deepEqual(await insertOnce(connection, "study_sessions", 7, "key", fingerprint, insert), { id: 12, replayed: true });
  await assert.rejects(insertOnce(connection, "study_sessions", 7, "key", requestFingerprint([10, "quiz", 2]), insert), { statusCode: 409 });
});

test("unrelated database failures and duplicate errors without a matching key are preserved", async () => {
  for (const [code, requestId] of [["ER_LOCK_DEADLOCK", "key"], ["ER_DUP_ENTRY", null], ["ER_DUP_ENTRY", "key"]]) {
    const error = Object.assign(new Error(code), { code });
    await assert.rejects(insertOnce({ query: async () => [[]] }, "quiz_results", 7, requestId, "hash", async () => { throw error; }), error);
  }
});
