function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function nextReviewDate(masteryLevel) {
  if (masteryLevel <= 1) return addDays(1);
  if (masteryLevel <= 3) return addDays(3);
  if (masteryLevel === 4) return addDays(7);
  return addDays(14);
}

function progressWhereClause(userId) {
  if (userId === null || userId === undefined) {
    return { sql: "user_id IS NULL", params: [] };
  }

  return { sql: "user_id = ?", params: [userId] };
}

async function findProgress(connection, userId, cardId, { lock = false } = {}) {
  const userWhere = progressWhereClause(userId);
  const [rows] = await connection.query(
    `SELECT *
     FROM card_progress
     WHERE card_id = ? AND ${userWhere.sql}
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [cardId, ...userWhere.params]
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

async function updateProgressFromAnswer(connection, { userId, cardId, isCorrect }) {
  const current = await findProgress(connection, userId, cardId, { lock: true });
  const currentMastery = current?.mastery_level || 0;
  const nextMastery = isCorrect
    ? Math.min(5, currentMastery + 1)
    : Math.max(0, currentMastery - 1);
  const nextReviewAt = nextReviewDate(nextMastery);

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
      [nextMastery, isCorrect ? 1 : 0, isCorrect ? 0 : 1, nextReviewAt, current.id]
    );
  } else {
    await connection.execute(
      `INSERT INTO card_progress
        (user_id, card_id, mastery_level, review_count, correct_count, wrong_count, last_reviewed_at, next_review_at)
       VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [userId ?? null, cardId, nextMastery, isCorrect ? 1 : 0, isCorrect ? 0 : 1, nextReviewAt]
    );
  }

  return findProgress(connection, userId, cardId);
}

module.exports = {
  findProgress,
  normalizeProgress,
  updateProgressFromAnswer,
};
