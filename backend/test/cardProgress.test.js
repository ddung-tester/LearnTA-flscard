const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeProgress, updateProgressFromAnswer } = require("../src/utils/cardProgress");

const DAY_MS = 24 * 60 * 60 * 1000;

function fakeConnection(existingRow) {
  const executed = [];
  return {
    executed,
    async query() {
      return [existingRow ? [existingRow] : []];
    },
    async execute(sql, params) {
      executed.push({ sql, params });
      return [{}];
    },
  };
}

function daysFromNow(date) {
  return Math.round((date.getTime() - Date.now()) / DAY_MS);
}

test("normalizeProgress fills defaults when there is no row", () => {
  const progress = normalizeProgress(null, 7, 42);
  assert.equal(progress.user_id, 7);
  assert.equal(progress.card_id, 42);
  assert.equal(progress.mastery_level, 0);
  assert.equal(progress.review_count, 0);
  assert.equal(progress.next_review_at, null);
});

test("updateProgressFromAnswer returns null for anonymous users", async () => {
  const connection = fakeConnection(null);
  const result = await updateProgressFromAnswer(connection, { userId: null, cardId: 1, isCorrect: true });
  assert.equal(result, null);
  assert.equal(connection.executed.length, 0);
});

test("first correct answer inserts mastery 1, due in 1 day", async () => {
  const connection = fakeConnection(null);
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true });

  const [{ sql, params }] = connection.executed;
  assert.match(sql, /INSERT INTO card_progress/);
  const [userId, cardId, mastery, correct, wrong, nextReviewAt] = params;
  assert.deepEqual([userId, cardId, mastery, correct, wrong], [1, 2, 1, 1, 0]);
  assert.equal(daysFromNow(nextReviewAt), 1);
});

test("mastery is capped at 5 and schedules 14 days", async () => {
  const connection = fakeConnection({ id: 9, mastery_level: 5 });
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true });

  const [{ sql, params }] = connection.executed;
  assert.match(sql, /UPDATE card_progress/);
  const [mastery, correct, wrong, nextReviewAt, id] = params;
  assert.deepEqual([mastery, correct, wrong, id], [5, 1, 0, 9]);
  assert.equal(daysFromNow(nextReviewAt), 14);
});

test("wrong answer lowers mastery but not below 0", async () => {
  for (const [current, expected, expectedDays] of [[4, 3, 3], [0, 0, 1]]) {
    const connection = fakeConnection({ id: 1, mastery_level: current });
    await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: false });

    const [mastery, correct, wrong, nextReviewAt] = connection.executed[0].params;
    assert.deepEqual([mastery, correct, wrong], [expected, 0, 1]);
    assert.equal(daysFromNow(nextReviewAt), expectedDays);
  }
});
