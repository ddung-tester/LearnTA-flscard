const pool = require("../config/db");
const {
  cleanText,
  createHttpError,
  parsePositiveInt,
} = require("../utils/http");
const {
  setProgressLevel,
  updateProgressFromAnswer,
} = require("../utils/cardProgress");
const {
  clampLevel,
  nextReviewAtForLevel,
  statusForLevel,
} = require("../utils/srs");

// Lich on SRS doc/ghi truc tiep tu card_progress: moi user + card chi co mot level,
// moi che do hoc cung ap dung mot luat (utils/srs.js).
// Bang card_reviews cu da duoc gop vao card_progress (migration 007).

const CORRECT_RESULTS = new Set(["correct", "hard", "good", "easy"]);
const WRONG_RESULTS = new Set(["wrong", "again"]);
const VALID_STATUSES = new Set(["active", "mastered"]);

const READABLE_DECK = "(d.user_id = ? OR d.user_id IS NULL OR d.is_public = TRUE)";

const REVIEW_SELECT = `SELECT
       cp.id,
       cp.user_id,
       cp.card_id,
       c.deck_id,
       d.title AS deck_title,
       c.term_en,
       c.meaning_vi,
       c.example_sentence,
       cp.mastery_level,
       cp.review_count,
       cp.last_reviewed_at,
       cp.next_review_at,
       cp.created_at,
       cp.updated_at
     FROM card_progress cp
     JOIN cards c ON c.id = cp.card_id
     JOIN decks d ON d.id = c.deck_id`;

function currentUserId(req) {
  return req.user?.id;
}

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveInt(value, fieldName);
}

function parseLimit(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function parseOffset(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function parseDate(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeReview(row) {
  if (!row) return null;

  const level = Number(row.mastery_level || 0);

  return {
    id: row.id,
    user_id: row.user_id,
    card_id: row.card_id,
    deck_id: row.deck_id,
    deck_title: row.deck_title || null,
    term_en: row.term_en,
    meaning_vi: row.meaning_vi,
    example_sentence: row.example_sentence || null,
    level,
    review_count: Number(row.review_count || 0),
    last_reviewed_at: row.last_reviewed_at,
    next_review_at: row.next_review_at,
    status: statusForLevel(level),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findReviewByCard(connection, userId, cardId) {
  const [rows] = await connection.query(
    `${REVIEW_SELECT}
     WHERE cp.card_id = ? AND cp.user_id = ? AND ${READABLE_DECK}
     LIMIT 1`,
    [cardId, userId, userId]
  );

  return normalizeReview(rows[0]);
}

async function isCardReadable(connection, userId, cardId) {
  const [rows] = await connection.query(
    `SELECT c.id
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = ? AND ${READABLE_DECK}
     LIMIT 1`,
    [cardId, userId]
  );

  return Boolean(rows[0]);
}

// Them tu vao lich on neu chua co (vd: du lieu hoc luc chua dang nhap).
// Tu da co tien do tren server thi giu nguyen: server la nguon dung.
async function ensureReview(connection, userId, body) {
  const cardId = parseOptionalPositiveInt(
    body.card_id ?? body.cardId ?? body.id,
    "card_id"
  );
  if (!cardId || !(await isCardReadable(connection, userId, cardId))) return null;

  const level = clampLevel(body.level ?? body.mastery_level ?? 0);
  const reviewCount = Number(body.review_count ?? body.reviewCount ?? 0);
  const nextReviewAt = parseDate(
    body.next_review_at ?? body.nextReviewAt,
    nextReviewAtForLevel(level)
  );
  const lastReviewedAt = parseDate(body.last_reviewed_at ?? body.lastReviewedAt);

  await connection.execute(
    `INSERT INTO card_progress
      (user_id, card_id, mastery_level, review_count, last_reviewed_at, next_review_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      userId,
      cardId,
      level,
      Number.isInteger(reviewCount) && reviewCount >= 0 ? reviewCount : 0,
      lastReviewedAt,
      nextReviewAt,
    ]
  );

  return findReviewByCard(connection, userId, cardId);
}

async function queryReviews(req, res, { dueOnly }) {
  const userId = currentUserId(req);
  const query = req.query;
  const conditions = ["cp.user_id = ?", READABLE_DECK];
  const params = [userId, userId];

  const deckId = parseOptionalPositiveInt(query.deckId ?? query.deck_id, "deckId");
  if (deckId) {
    conditions.push("c.deck_id = ?");
    params.push(deckId);
  }

  const status = cleanText(query.status);
  if (status) {
    if (!VALID_STATUSES.has(status)) {
      throw createHttpError(400, "status khong hop le");
    }
    conditions.push(status === "mastered" ? "cp.mastery_level >= 5" : "cp.mastery_level < 5");
  }

  const level = query.level === undefined ? null : Number(query.level);
  if (level !== null) {
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      throw createHttpError(400, "level khong hop le");
    }
    conditions.push("cp.mastery_level = ?");
    params.push(level);
  }

  if (dueOnly || cleanText(query.due) === "today") {
    conditions.push("(cp.next_review_at IS NULL OR cp.next_review_at <= CURRENT_TIMESTAMP)");
  }

  const search = cleanText(query.search);
  if (search) {
    conditions.push("(c.term_en LIKE ? OR c.meaning_vi LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const limit = parseLimit(query.limit);
  const offset = parseOffset(query.offset);

  const [rows] = await pool.query(
    `${REVIEW_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY cp.next_review_at ASC, cp.updated_at DESC, cp.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json(rows.map(normalizeReview));
}

async function listReviews(req, res) {
  return queryReviews(req, res, { dueOnly: false });
}

async function listDueReviews(req, res) {
  return queryReviews(req, res, { dueOnly: true });
}

async function createReview(req, res) {
  const userId = currentUserId(req);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const review = await ensureReview(connection, userId, req.body);
    if (!review) {
      throw createHttpError(404, "Khong tim thay tu vung");
    }
    await connection.commit();
    res.status(201).json(review);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function bulkUpsertReviews(req, res) {
  const userId = currentUserId(req);
  const items = Array.isArray(req.body.items)
    ? req.body.items
    : Array.isArray(req.body.reviews)
      ? req.body.reviews
      : [];

  if (items.length === 0) {
    throw createHttpError(400, "items la bat buoc");
  }

  if (items.length > 200) {
    throw createHttpError(400, "items khong duoc vuot qua 200 phan tu");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const reviews = [];

    for (const item of items) {
      const review = await ensureReview(connection, userId, item);
      if (review) reviews.push(review);
    }

    await connection.commit();
    res.status(201).json({ synced_count: reviews.length, reviews });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Body: { result: "correct" | "wrong" } hoac { level: 0-5 } (tu chon level).
async function applyReviewResult(connection, userId, cardId, body) {
  if (body.level !== undefined && body.level !== null && body.level !== "") {
    const level = Number(body.level);
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      throw createHttpError(400, "level khong hop le");
    }
    await setProgressLevel(connection, { userId, cardId, level });
  } else {
    const result = cleanText(body.result ?? body.ease);
    if (!CORRECT_RESULTS.has(result) && !WRONG_RESULTS.has(result)) {
      throw createHttpError(400, "result khong hop le");
    }
    await updateProgressFromAnswer(connection, {
      userId,
      cardId,
      isCorrect: CORRECT_RESULTS.has(result),
    });
  }

  return findReviewByCard(connection, userId, cardId);
}

async function updateReviewResultByCard(req, res) {
  const userId = currentUserId(req);
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (!(await isCardReadable(connection, userId, cardId))) {
      throw createHttpError(404, "Khong tim thay tu vung");
    }

    const review = await applyReviewResult(connection, userId, cardId, req.body);
    await connection.commit();
    res.json(review);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteReviewByCard(req, res) {
  const userId = currentUserId(req);
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const [result] = await pool.execute(
    "DELETE FROM card_progress WHERE card_id = ? AND user_id = ?",
    [cardId, userId]
  );

  res.json({ success: true, deleted: result.affectedRows > 0 });
}

module.exports = {
  listReviews,
  listDueReviews,
  createReview,
  bulkUpsertReviews,
  updateReviewResultByCard,
  deleteReviewByCard,
};
