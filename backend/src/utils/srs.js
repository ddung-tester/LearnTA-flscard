// Luat SRS duy nhat cho moi che do hoc (giong luyentu): 6 cap Lv0-Lv5.
// Dung -> len 1 cap, on lai sau khoang cua cap moi.
// Sai  -> xuong 1 cap (toi thieu Lv0), on lai ngay.
// Chon cap truc tiep (flashcard) -> on lai sau khoang cua cap da chon.

const MAX_LEVEL = 5;
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function clampLevel(level) {
  const number = Math.trunc(Number(level));
  if (!Number.isFinite(number)) return 0;
  return Math.min(MAX_LEVEL, Math.max(0, number));
}

// Lv0 den han ngay; Lv>=1 den han luc 00:00 (gio VN) cua ngay thu N.
function nextReviewAtForLevel(level, now = new Date()) {
  const days = INTERVAL_DAYS[clampLevel(level)];
  if (days === 0) return new Date(now.getTime());

  const startOfTodayVN =
    Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
  return new Date(startOfTodayVN + days * DAY_MS);
}

function scheduleAnswer(level, isCorrect, now = new Date()) {
  const current = clampLevel(level);

  if (!isCorrect) {
    return { level: Math.max(0, current - 1), nextReviewAt: new Date(now.getTime()) };
  }

  const nextLevel = Math.min(MAX_LEVEL, current + 1);
  return { level: nextLevel, nextReviewAt: nextReviewAtForLevel(nextLevel, now) };
}

function scheduleLevel(level, now = new Date()) {
  const nextLevel = clampLevel(level);
  return { level: nextLevel, nextReviewAt: nextReviewAtForLevel(nextLevel, now) };
}

function statusForLevel(level) {
  return clampLevel(level) >= MAX_LEVEL ? "mastered" : "active";
}

module.exports = {
  INTERVAL_DAYS,
  MAX_LEVEL,
  clampLevel,
  nextReviewAtForLevel,
  scheduleAnswer,
  scheduleLevel,
  statusForLevel,
};
