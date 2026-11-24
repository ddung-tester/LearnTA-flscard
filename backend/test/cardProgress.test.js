const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeProgress,
  setProgressLevel,
  updateProgressFromAnswer,
} = require("../src/utils/cardProgress");
const { nextReviewAtForLevel } = require("../src/utils/srs");

// 2026-09-26 10:00 gio VN
const NOW = new Date("2026-09-26T03:00:00.000Z");

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

test("first correct answer inserts mastery 1, due after the Lv1 interval", async () => {
  const connection = fakeConnection(null);
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true, now: NOW });

  const [{ sql, params }] = connection.executed;
  assert.match(sql, /INSERT INTO card_progress/);
  const [userId, cardId, mastery, correct, wrong, nextReviewAt] = params;
  assert.deepEqual([userId, cardId, mastery, correct, wrong], [1, 2, 1, 1, 0]);
  assert.deepEqual(nextReviewAt, nextReviewAtForLevel(1, NOW));
});

test("mastery is capped at 5 and schedules the Lv5 interval", async () => {
  const connection = fakeConnection({ id: 9, mastery_level: 5 });
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true, now: NOW });

  const [{ sql, params }] = connection.executed;
  assert.match(sql, /UPDATE card_progress/);
  const [mastery, correct, wrong, nextReviewAt, id] = params;
  assert.deepEqual([mastery, correct, wrong, id], [5, 1, 0, 9]);
  assert.deepEqual(nextReviewAt, nextReviewAtForLevel(5, NOW));
});

test("wrong answer lowers mastery (not below 0) and is due now", async () => {
  for (const [current, expected] of [[4, 3], [0, 0]]) {
    const connection = fakeConnection({ id: 1, mastery_level: current });
    await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: false, now: NOW });

    const [mastery, correct, wrong, nextReviewAt] = connection.executed[0].params;
    assert.deepEqual([mastery, correct, wrong], [expected, 0, 1]);
    assert.deepEqual(nextReviewAt, NOW);
  }
});

test("setProgressLevel stores the chosen level without touching correct/wrong counts", async () => {
  const connection = fakeConnection({ id: 3, mastery_level: 1 });
  await setProgressLevel(connection, { userId: 1, cardId: 2, level: 4, now: NOW });

  const [mastery, correct, wrong, nextReviewAt, id] = connection.executed[0].params;
  assert.deepEqual([mastery, correct, wrong, id], [4, 0, 0, 3]);
  assert.deepEqual(nextReviewAt, nextReviewAtForLevel(4, NOW));
});

test("đúng khi chưa đến hạn: giữ nguyên cấp và hạn ôn (không học dồn lên Lv5)", async () => {
  const hanOn = new Date(NOW.getTime() + 3 * 24 * 3600 * 1000);
  const connection = fakeConnection({ id: 4, mastery_level: 2, next_review_at: hanOn });
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true, now: NOW });
  const [mastery, correct, wrong, nextReviewAt] = connection.executed[0].params;
  assert.deepEqual([mastery, correct, wrong], [2, 1, 0]);
  assert.deepEqual(nextReviewAt, hanOn);
});

test("đúng khi đã đến hạn vẫn lên 1 cấp; sai khi chưa đến hạn vẫn hạ cấp", async () => {
  const quaHan = new Date(NOW.getTime() - 3600 * 1000);
  const c1 = fakeConnection({ id: 4, mastery_level: 2, next_review_at: quaHan });
  await updateProgressFromAnswer(c1, { userId: 1, cardId: 2, isCorrect: true, now: NOW });
  assert.equal(c1.executed[0].params[0], 3);

  const chuaHan = new Date(NOW.getTime() + 3600 * 1000 * 48);
  const c2 = fakeConnection({ id: 4, mastery_level: 2, next_review_at: chuaHan });
  await updateProgressFromAnswer(c2, { userId: 1, cardId: 2, isCorrect: false, now: NOW });
  assert.deepEqual([c2.executed[0].params[0], c2.executed[0].params[3]], [1, NOW]);
});

test("đúng nhờ gợi ý: giữ cấp, hẹn theo khoảng của cấp hiện tại", async () => {
  const connection = fakeConnection({ id: 4, mastery_level: 2, next_review_at: null });
  await updateProgressFromAnswer(connection, { userId: 1, cardId: 2, isCorrect: true, coTroGiup: true, now: NOW });
  const [mastery, , , nextReviewAt] = connection.executed[0].params;
  assert.equal(mastery, 2);
  assert.deepEqual(nextReviewAt, nextReviewAtForLevel(2, NOW));
});
