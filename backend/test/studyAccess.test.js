const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test", JWT_SECRET: "local-regression-test-secret" });
const pool = require("../src/config/db");
const router = require("../src/routes/studyRoutes");
const { finishStudySession, addStudyAnswers } = require("../src/controllers/studyController");
let server, base, owner = 7, deckOwner = 7, queries = 0, writes = 0;
const session = () => ({ id: 42, user_id: owner, deck_id: 1, mode: "quiz", total: 1, correct: 1, review: 0, ended_at: new Date() });
const connection = {
  async query(sql) {
    queries += 1;
    if (sql.includes("FROM study_sessions ss")) return [[session()]];
    if (sql.includes("FROM cards")) return [[{ id: 101, deck_id: 1 }]];
    if (sql.includes("SELECT id") && sql.includes("FROM study_answers")) return [[{ id: 5 }]];
    if (sql.includes("FROM study_answers")) return [[{ id: 5, card_id: 101, is_correct: 1 }]];
    throw new Error("Unexpected SQL");
  },
  async execute() { writes += 1; throw new Error("Unexpected write"); },
  async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
};
before(async () => {
  pool.query = async (sql) => {
    queries += 1;
    if (sql.includes("FROM decks d")) return [[{ id: 1, user_id: deckOwner, is_public: 1, title: "Test deck" }]];
    if (sql.includes("FROM cards")) return [[{ id: 101, deck_id: 1 }]];
    if (sql.includes("FROM users")) return [[{ id: 7, fullname: "Local test" }]];
    throw new Error("Unexpected pool query");
  };
  pool.getConnection = async () => connection;
  const app = express(); app.use(express.json()); app.use("/api", router);
  app.use("/api/decks", require("../src/routes/deckRoutes"));
  app.use("/api", require("../src/routes/cardRoutes"));
  app.use("/api", require("../src/routes/progressRoutes"));
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());
const finish = { total: 1, correct: 1, review: 0 };
const answer = { answers: [{ card_id: 101, is_correct: true }] };
async function request(path, method, body, auth = false) {
  return fetch(base + path, { method, headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${jwt.sign({ id: 7 }, process.env.JWT_SECRET)}` } : {}) }, body: JSON.stringify(body) });
}
test("all study writes reject anonymous requests before touching the database", async () => {
  const beforeQueries = queries;
  for (const [path, method, body] of [
    ["/study-sessions", "POST", { deck_id: 1, mode: "quiz", total: 1 }],
    ["/study-sessions/42/finish", "PATCH", finish],
    ["/study-sessions/42/answers", "POST", answer],
    ["/quiz-results", "POST", { deck_id: 1, question_type: "written", ...finish }],
  ]) assert.equal((await request(path, method, body)).status, 401, path);
  assert.equal(queries, beforeQueries);
  assert.equal(writes, 0);
});
test("an authenticated user cannot finish or answer another user's or a legacy guest session", async () => {
  for (owner of [8, null]) {
    assert.equal((await request("/study-sessions/42/finish", "PATCH", finish, true)).status, 403);
    assert.equal((await request("/study-sessions/42/answers", "POST", answer, true)).status, 403);
  }
  assert.equal(writes, 0);
});
test("direct controller calls also forbid anonymous mutations of legacy guest sessions", async () => {
  owner = null;
  const req = { user: null, params: { sessionId: "42" } };
  await assert.rejects(finishStudySession({ ...req, body: finish }, { json() {} }), { statusCode: 403 });
  await assert.rejects(addStudyAnswers({ ...req, body: answer }, { json() {} }), { statusCode: 403 });
  assert.equal(writes, 0);
});
test("the owner can retry already finished sessions and already recorded answers", async () => {
  owner = 7;
  assert.equal((await request("/study-sessions/42/finish", "PATCH", finish, true)).status, 200);
  assert.equal((await request("/study-sessions/42/answers", "POST", answer, true)).status, 201);
  assert.equal(writes, 0);
});


test("HTTP reads block public decks outside the viewer ownership on every deck path", async () => {
  for (const [auth, targetOwner] of [[false, 7], [true, 8], [true, null]]) {
    deckOwner = targetOwner;
    for (const path of ["/decks/1", "/decks/1/cards", "/cards/101/progress", "/decks/1/progress-summary", "/decks/1/quiz-results/latest"]) {
      assert.equal((await request(path, "GET", undefined, auth)).status, 404, path);
    }
  }
  deckOwner = null;
  assert.equal((await request("/decks/1", "GET")).status, 200);
  deckOwner = 7;
  assert.equal((await request("/decks/1", "GET", undefined, true)).status, 200);
  assert.equal(writes, 0);
});
