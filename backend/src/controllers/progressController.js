const pool = require("../config/db");
const { findCardById } = require("./cardController");
const { findDeckById } = require("./deckController");
const {
  findProgress,
  normalizeProgress,
  updateProgressFromAnswer,
} = require("../utils/cardProgress");
const {
  createHttpError,
  parseBoolean,
  parseOptionalUserId,
  parsePositiveInt,
} = require("../utils/http");

function parseNonNegativeInt(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw createHttpError(400, `${fieldName} khong hop le`);
  }
  return number;
}

async function ensureCardExists(cardId) {
  const card = await findCardById(cardId);

  if (!card) {
    throw createHttpError(404, "Khong tim thay tu vung");
  }

  return card;
}

async function getCardProgress(req, res) {
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const userId = parseOptionalUserId(req.query.user_id);

  await ensureCardExists(cardId);

  const progress = await findProgress(pool, userId, cardId);
  res.json(normalizeProgress(progress, userId, cardId));
}

async function updateCardProgress(req, res) {
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const userId = parseOptionalUserId(req.body.user_id ?? req.query.user_id);

  await ensureCardExists(cardId);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let progress;
    if (req.body.is_correct !== undefined) {
      progress = await updateProgressFromAnswer(connection, {
        userId,
        cardId,
        isCorrect: parseBoolean(req.body.is_correct, false),
      });
    } else {
      const current = await findProgress(connection, userId, cardId, { lock: true });
      const payload = {
        mastery_level:
          req.body.mastery_level === undefined
            ? current?.mastery_level || 0
            : parseNonNegativeInt(req.body.mastery_level, "mastery_level"),
        review_count:
          req.body.review_count === undefined
            ? current?.review_count || 0
            : parseNonNegativeInt(req.body.review_count, "review_count"),
        correct_count:
          req.body.correct_count === undefined
            ? current?.correct_count || 0
            : parseNonNegativeInt(req.body.correct_count, "correct_count"),
        wrong_count:
          req.body.wrong_count === undefined
            ? current?.wrong_count || 0
            : parseNonNegativeInt(req.body.wrong_count, "wrong_count"),
        last_reviewed_at:
          req.body.last_reviewed_at === undefined
            ? current?.last_reviewed_at || null
            : req.body.last_reviewed_at || null,
        next_review_at:
          req.body.next_review_at === undefined
            ? current?.next_review_at || null
            : req.body.next_review_at || null,
      };

      if (current) {
        await connection.execute(
          `UPDATE card_progress
           SET mastery_level = ?,
               review_count = ?,
               correct_count = ?,
               wrong_count = ?,
               last_reviewed_at = ?,
               next_review_at = ?
           WHERE id = ?`,
          [
            payload.mastery_level,
            payload.review_count,
            payload.correct_count,
            payload.wrong_count,
            payload.last_reviewed_at,
            payload.next_review_at,
            current.id,
          ]
        );
      } else {
        await connection.execute(
          `INSERT INTO card_progress
            (user_id, card_id, mastery_level, review_count, correct_count, wrong_count, last_reviewed_at, next_review_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            cardId,
            payload.mastery_level,
            payload.review_count,
            payload.correct_count,
            payload.wrong_count,
            payload.last_reviewed_at,
            payload.next_review_at,
          ]
        );
      }

      progress = await findProgress(connection, userId, cardId);
    }

    await connection.commit();
    res.json(normalizeProgress(progress, userId, cardId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getDeckProgressSummary(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const userId = parseOptionalUserId(req.query.user_id);
  const deck = await findDeckById(deckId);

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  const userWhere =
    userId === null ? "cp.user_id IS NULL" : "cp.user_id = ?";
  const params = userId === null ? [deckId] : [userId, deckId];

  const [rows] = await pool.query(
    `SELECT
       COUNT(c.id) AS total_cards,
       COALESCE(SUM(CASE WHEN cp.mastery_level >= 5 THEN 1 ELSE 0 END), 0) AS mastered_cards,
       COALESCE(SUM(cp.review_count), 0) AS total_reviews,
       COALESCE(SUM(cp.correct_count), 0) AS total_correct,
       COALESCE(SUM(cp.wrong_count), 0) AS total_wrong
     FROM cards c
     LEFT JOIN card_progress cp
       ON cp.card_id = c.id AND ${userWhere}
     WHERE c.deck_id = ?`,
    params
  );

  res.json({
    deck_id: deckId,
    total_cards: Number(rows[0]?.total_cards || 0),
    mastered_cards: Number(rows[0]?.mastered_cards || 0),
    total_reviews: Number(rows[0]?.total_reviews || 0),
    total_correct: Number(rows[0]?.total_correct || 0),
    total_wrong: Number(rows[0]?.total_wrong || 0),
  });
}

module.exports = {
  getCardProgress,
  updateCardProgress,
  getDeckProgressSummary,
};
