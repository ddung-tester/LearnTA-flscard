const { test } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const { updateCardProgress } = require("../src/controllers/progressController");
const { getStudySessionsSummary } = require("../src/controllers/studyController");

test("manual mastery rejects values outside 0-5 before opening a write transaction", async () => {
  pool.query = async sql => [[sql.includes("FROM decks d") ? { id: 10, user_id: 7 } : { id: 1, deck_id: 10 }]];
  let transactions = 0;
  pool.getConnection = async () => { transactions += 1; throw new Error("unexpected transaction"); };
  for (const mastery_level of [99, 6, -1, 1.5, "bad"]) {
    await assert.rejects(updateCardProgress({ user: { id: 7 }, params: { cardId: "1" }, body: { mastery_level } }, { json() {} }), { statusCode: 400 });
  }
  assert.equal(transactions, 0);
});
test("summary only queries completed sessions for totals, activities, modes and recent list", async () => {
  const queries = [];
  pool.query = async sql => { queries.push(sql); return [[]]; };
  let result;
  await getStudySessionsSummary({ user: { id: 7 } }, { json(body) { result = body; } });
  assert.equal(queries.length, 4);
  for (const sql of queries) assert.match(sql, /WHERE (?:ss\.)?user_id = \?\s+AND (?:ss\.)?ended_at IS NOT NULL/);
  assert.equal(result.total_sessions, 0);
});


test("manual mastery accepts both ends of 0-5 and preserves other progress fields", async () => {
  const row = { id: 11, user_id: 7, card_id: 1, mastery_level: 2, review_count: 3, correct_count: 2, wrong_count: 1 };
  pool.query = async sql => [[sql.includes("FROM decks d") ? { id: 10, user_id: 7 } : { id: 1, deck_id: 10 }]];
  const writes = [];
  pool.getConnection = async () => ({
    async query() { return [[row]]; },
    async execute(_sql, values) { writes.push(values); row.mastery_level = values[0]; },
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
  });
  for (const mastery_level of [0, 5]) {
    let response;
    await updateCardProgress({ user: { id: 7 }, params: { cardId: "1" }, body: { mastery_level } }, { json(data) { response = data; } });
    assert.equal(response.mastery_level, mastery_level);
    assert.deepEqual(writes.at(-1).slice(0, 4), [mastery_level, 3, 2, 1]);
  }
});
