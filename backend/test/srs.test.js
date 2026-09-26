const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  clampLevel,
  nextReviewAtForLevel,
  scheduleAnswer,
  scheduleLevel,
  statusForLevel,
} = require("../src/utils/srs");

// 2026-09-26 10:00 gio VN (03:00 UTC)
const NOW = new Date("2026-09-26T03:00:00.000Z");

function vnMidnightAfter(days) {
  // 00:00 gio VN ngay 26/09 = 17:00 UTC ngay 25/09
  return new Date(Date.UTC(2026, 8, 25, 17) + days * 24 * 60 * 60 * 1000);
}

test("interval by level is 0/1/3/7/14/30 days, due at VN midnight", () => {
  assert.equal(nextReviewAtForLevel(0, NOW).getTime(), NOW.getTime());
  for (const [level, days] of [[1, 1], [2, 3], [3, 7], [4, 14], [5, 30]]) {
    assert.equal(
      nextReviewAtForLevel(level, NOW).toISOString(),
      vnMidnightAfter(days).toISOString(),
      `Lv${level}`
    );
  }
});

test("VN day boundary: 23:30 VN still counts as the same day", () => {
  const lateNight = new Date("2026-09-26T16:30:00.000Z"); // 23:30 VN ngay 26
  assert.equal(nextReviewAtForLevel(1, lateNight).toISOString(), vnMidnightAfter(1).toISOString());
});

test("correct answer moves up one level and waits for the new level's interval", () => {
  assert.deepEqual(scheduleAnswer(0, true, NOW), { level: 1, nextReviewAt: vnMidnightAfter(1) });
  assert.deepEqual(scheduleAnswer(3, true, NOW), { level: 4, nextReviewAt: vnMidnightAfter(14) });
  assert.deepEqual(scheduleAnswer(5, true, NOW), { level: 5, nextReviewAt: vnMidnightAfter(30) });
});

test("wrong answer moves down one level (min 0) and is due now", () => {
  assert.deepEqual(scheduleAnswer(4, false, NOW), { level: 3, nextReviewAt: NOW });
  assert.deepEqual(scheduleAnswer(0, false, NOW), { level: 0, nextReviewAt: NOW });
});

test("choosing a level directly schedules by that level", () => {
  assert.deepEqual(scheduleLevel(2, NOW), { level: 2, nextReviewAt: vnMidnightAfter(3) });
  assert.deepEqual(scheduleLevel(9, NOW), { level: 5, nextReviewAt: vnMidnightAfter(30) });
  assert.deepEqual(scheduleLevel(0, NOW), { level: 0, nextReviewAt: NOW });
});

test("clampLevel and statusForLevel", () => {
  assert.equal(clampLevel("3"), 3);
  assert.equal(clampLevel(-2), 0);
  assert.equal(clampLevel("abc"), 0);
  assert.equal(statusForLevel(4), "active");
  assert.equal(statusForLevel(5), "mastered");
});
