const { test } = require("node:test");
const assert = require("node:assert/strict");

// Opt-in: creates and removes only a uniquely named, disposable database.
test("study requests remain unique through retries and concurrency on MySQL", {
  skip: process.env.LEARNTA_MYSQL_TEST !== "1", timeout: 120000,
}, async (t) => {
  require("dotenv").config({ quiet: true });
  const mysql = require("mysql2/promise");
  const fs = require("node:fs/promises");
  const path = require("node:path");
  const express = require("express");
  const jwt = require("jsonwebtoken");
  const { randomBytes } = require("node:crypto");
  const config = require("../src/config/env");
  const database = `learnta_audit_${Date.now()}_${process.pid}`;
  const admin = await mysql.createConnection({ ...config.db, multipleStatements: true });
  let created = false, connection, pool, server;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    config.db.database = database;
    process.env.JWT_SECRET = randomBytes(32).toString("hex");
    connection = await mysql.createConnection({ ...config.db, multipleStatements: true });
    let schema = await fs.readFile(path.join(__dirname, "../database/schema.sql"), "utf8");
    schema = schema.slice(schema.indexOf("CREATE TABLE"))
      .replace(/^  (?:client_request_id|request_hash).*\r?\n/gm, "")
      .replace(/^  UNIQUE KEY uq_(?:study_sessions|quiz_results)_user_request.*\r?\n/gm, "");
    await connection.query(schema);
    const [userA] = await connection.execute("INSERT INTO users (fullname, email) VALUES (?, ?)", ["Audit A", `${database}-a@example.test`]);
    const [userB] = await connection.execute("INSERT INTO users (fullname, email) VALUES (?, ?)", ["Audit B", `${database}-b@example.test`]);
    const [deckA] = await connection.execute("INSERT INTO decks (user_id, title) VALUES (?, ?)", [userA.insertId, "Audit A deck"]);
    const [deckB] = await connection.execute("INSERT INTO decks (user_id, title) VALUES (?, ?)", [userB.insertId, "Audit B deck"]);
    const [card] = await connection.execute("INSERT INTO cards (deck_id, term_en, meaning_vi) VALUES (?, ?, ?)", [deckA.insertId, "apple", "test meaning"]);
    await connection.execute("INSERT INTO study_sessions (user_id, deck_id, mode, direction) VALUES (?, ?, 'quiz', 'vi-en')", [userA.insertId, deckA.insertId]);
    await connection.execute("INSERT INTO quiz_results (user_id, deck_id, question_type, direction) VALUES (?, ?, 'written', 'vi-en')", [userA.insertId, deckA.insertId]);
    await connection.query(await fs.readFile(path.join(__dirname, "../database/migrations/015_add_study_request_idempotency.sql"), "utf8"));
    pool = require("../src/config/db");
    const app = express();
    app.use(express.json());
    app.use("/api", require("../src/routes/studyRoutes"));
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (route, method, body, userId = userA.insertId) => {
      const response = await fetch(base + route, {
        method, headers: { "content-type": "application/json", ...(userId ? { authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}` } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
      });
      return { status: response.status, body: await response.json() };
    };
    const create = { deck_id: deckA.insertId, mode: "quiz", direction: "vi-en", total: 1, client_request_id: "create-lost" };
    const count = async (table, key) => {
      const [rows] = await connection.execute(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ? AND client_request_id = ?`, [userA.insertId, key]);
      return rows[0].n;
    };
    let sessionId;
    await t.test("migration preserves existing rows and sequential replay returns the committed session", async () => {
      for (const table of ["study_sessions", "quiz_results"]) {
        const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM ${table} WHERE client_request_id IS NULL AND request_hash IS NULL`);
        assert.equal(rows[0].n, 1);
      }
      const first = await request("/study-sessions", "POST", create);
      assert.equal(first.status, 201, JSON.stringify(first.body));
      sessionId = first.body.id; // Treat the first response as lost, then resend its request.
      const retry = await request("/study-sessions", "POST", create);
      assert.equal(retry.status, 200, JSON.stringify(retry.body));
      assert.equal(retry.body.id, sessionId);
      assert.equal(await count("study_sessions", "create-lost"), 1);
    });
    await t.test("eight concurrent completed creates add XP once; changed payload is rejected", async () => {
      const body = { ...create, client_request_id: "create-race", correct: 1, review: 0, ended_at: "2026-10-08T03:00:00Z" };
      const replies = await Promise.all(Array.from({ length: 8 }, () => request("/study-sessions", "POST", body)));
      assert.equal(replies.filter(r => r.status === 201).length, 1, JSON.stringify(replies));
      assert.equal(replies.filter(r => r.status === 200).length, 7, JSON.stringify(replies));
      assert.equal(new Set(replies.map(r => r.body.id)).size, 1);
      assert.equal(await count("study_sessions", "create-race"), 1);
      const [users] = await connection.query("SELECT total_xp FROM users WHERE id = ?", [userA.insertId]);
      assert.equal(users[0].total_xp, 10);
      assert.equal((await request("/study-sessions", "POST", { ...body, direction: "en-vi" })).status, 409);
      assert.equal((await request("/study-sessions", "POST", { ...create, deck_id: deckB.insertId }, userB.insertId)).status, 201);
    });
    await t.test("finish and answer retries keep XP and SRS stable", async () => {
      const finish = { total: 1, correct: 1, review: 0 };
      const answers = { answers: [{ card_id: card.insertId, is_correct: true, user_answer: "apple" }] };
      for (let retry = 0; retry < 2; retry++) {
        assert.equal((await request(`/study-sessions/${sessionId}/finish`, "PATCH", finish)).status, 200);
        assert.equal((await request(`/study-sessions/${sessionId}/answers`, "POST", answers)).status, 201);
      }
      const [progress] = await connection.query("SELECT mastery_level, review_count FROM card_progress WHERE user_id = ? AND card_id = ?", [userA.insertId, card.insertId]);
      assert.equal(progress[0].mastery_level, 1);
      assert.equal(progress[0].review_count, 1);
      const [users] = await connection.query("SELECT total_xp FROM users WHERE id = ?", [userA.insertId]);
      assert.equal(users[0].total_xp, 20);
      const [answersRows] = await connection.query("SELECT COUNT(*) AS n FROM study_answers WHERE session_id = ?", [sessionId]);
      assert.equal(answersRows[0].n, 1);
    });
    await t.test("lost and concurrent quiz responses keep one result per account and key", async () => {
      const quiz = { deck_id: deckA.insertId, question_type: "written", direction: "vi-en", correct: 1, review: 0, total: 1, client_request_id: "quiz-lost" };
      const first = await request("/quiz-results", "POST", quiz);
      const retry = await request("/quiz-results", "POST", quiz);
      assert.equal(first.status, 201, JSON.stringify(first.body));
      assert.equal(retry.status, 200, JSON.stringify(retry.body));
      assert.equal(first.body.id, retry.body.id);
      assert.equal(await count("quiz_results", "quiz-lost"), 1);
      const race = { ...quiz, client_request_id: "quiz-race" };
      const replies = await Promise.all(Array.from({ length: 8 }, () => request("/quiz-results", "POST", race)));
      assert.equal(replies.filter(r => r.status === 201).length, 1, JSON.stringify(replies));
      assert.equal(replies.filter(r => r.status === 200).length, 7, JSON.stringify(replies));
      assert.equal(new Set(replies.map(r => r.body.id)).size, 1);
      assert.equal(await count("quiz_results", "quiz-race"), 1);
      assert.equal((await request("/quiz-results", "POST", { ...quiz, correct: 0, review: 1 })).status, 409);
      assert.equal((await request("/quiz-results", "POST", { ...quiz, deck_id: deckB.insertId }, userB.insertId)).status, 201);
      assert.equal((await request("/quiz-results", "POST", quiz, null)).status, 401);
      assert.equal((await request("/study-sessions", "POST", { ...create, client_request_id: "bad key" })).status, 400);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    if (connection) await connection.end();
    if (created && /^learnta_audit_[0-9]+_[0-9]+$/.test(database)) await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
  }
});
