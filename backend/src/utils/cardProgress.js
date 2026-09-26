const { scheduleAnswer, scheduleLevel } = require("./srs");

async function findProgress(connection, userId, cardId, { lock = false } = {}) {
  if (userId === null || userId === undefined) {
    return null;
  }

  const [rows] = await connection.query(
    `SELECT *
     FROM card_progress
     WHERE user_id = ? AND card_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId, cardId]
  );

  return rows[0] || null;
}

function normalizeProgress(row, userId, cardId) {
  return {
    id: row?.id || null,
    user_id: row?.user_id ?? userId ?? null,
    card_id: row?.card_id ?? cardId,
    mastery_level: row?.mastery_level || 0,
    review_count: row?.review_count || 0,
    correct_count: row?.correct_count || 0,
    wrong_count: row?.wrong_count || 0,
    last_reviewed_at: row?.last_reviewed_at || null,
    next_review_at: row?.next_review_at || null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  };
}

async function writeProgress(connection, current, { userId, cardId, level, nextReviewAt, correct, wrong }) {
  if (current) {
    await connection.execute(
      `UPDATE card_progress
       SET mastery_level = ?,
           review_count = review_count + 1,
           correct_count = correct_count + ?,
           wrong_count = wrong_count + ?,
           last_reviewed_at = CURRENT_TIMESTAMP,
           next_review_at = ?
       WHERE id = ?`,
      [level, correct, wrong, nextReviewAt, current.id]
    );
  } else {
    await connection.execute(
      `INSERT INTO card_progress
        (user_id, card_id, mastery_level, review_count, correct_count, wrong_count, last_reviewed_at, next_review_at)
       VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [userId, cardId, level, correct, wrong, nextReviewAt]
    );
  }

  return findProgress(connection, userId, cardId);
}

async function updateProgressFromAnswer(connection, { userId, cardId, isCorrect, now = new Date() }) {
  if (userId === null || userId === undefined) {
    return null;
  }

  const current = await findProgress(connection, userId, cardId, { lock: true });
  const next = scheduleAnswer(current?.mastery_level || 0, isCorrect, now);

  return writeProgress(connection, current, {
    userId,
    cardId,
    level: next.level,
    nextReviewAt: next.nextReviewAt,
    correct: isCorrect ? 1 : 0,
    wrong: isCorrect ? 0 : 1,
  });
}

// Nguoi hoc tu chon level sau khi lat the (giong luyentu).
async function setProgressLevel(connection, { userId, cardId, level, now = new Date() }) {
  if (userId === null || userId === undefined) {
    return null;
  }

  const current = await findProgress(connection, userId, cardId, { lock: true });
  const next = scheduleLevel(level, now);

  return writeProgress(connection, current, {
    userId,
    cardId,
    level: next.level,
    nextReviewAt: next.nextReviewAt,
    correct: 0,
    wrong: 0,
  });
}

module.exports = {
  findProgress,
  normalizeProgress,
  setProgressLevel,
  updateProgressFromAnswer,
};
