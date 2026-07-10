const pool = require("../config/db");
const {
  cleanNullableText,
  cleanNullableTextWithLimit,
  cleanText,
  cleanTextWithLimit,
  createHttpError,
  parsePositiveInt,
} = require("../utils/http");
const { updateProgressFromAnswer } = require("../utils/cardProgress");

const VALID_STATUSES = new Set(["active", "mastered"]);
const VALID_RESULTS = new Set(["again", "hard", "good", "easy", "correct", "wrong"]);

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

function addHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function intervalDaysForLevel(level) {
  if (level <= 1) return 1;
  if (level === 2) return 3;
  if (level === 3) return 7;
  if (level === 4) return 14;
  return 30;
}

function normalizeReview(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    card_id: row.card_id,
    deck_id: row.deck_id,
    deck_title: row.deck_title || null,
    term_en: row.term_en,
    meaning_vi: row.meaning_vi,
    example_sentence: row.example_sentence || null,
    source: row.source,
    level: Number(row.level || 0),
    ease: row.ease || null,
    review_count: Number(row.review_count || 0),
    last_reviewed_at: row.last_reviewed_at,
    next_review_at: row.next_review_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function readReviewPayload(body) {
  const cardId = parseOptionalPositiveInt(
    body.card_id ?? body.cardId ?? body.id,
    "card_id"
  );
  const deckId = parseOptionalPositiveInt(body.deck_id ?? body.deckId, "deck_id");
  const rawLevel = Number(body.level ?? body.mastery_level ?? 0);
  const rawReviewCount = Number(body.review_count ?? body.reviewCount ?? 0);
  const status = cleanText(body.status);

  return {
    cardId,
    deckId,
    termEn: cleanTextWithLimit(body.term_en ?? body.word, 255, "term_en"),
    meaningVi: cleanTextWithLimit(
      body.meaning_vi ?? body.meaning,
      255,
      "meaning_vi"
    ),
    exampleSentence: cleanNullableText(body.example_sentence ?? body.example),
    source: cleanTextWithLimit(body.source, 40, "source") || "quiz",
    level: Number.isInteger(rawLevel) && rawLevel >= 0 ? Math.min(rawLevel, 5) : 0,
    ease: cleanNullableTextWithLimit(body.ease, 20, "ease"),
    reviewCount:
      Number.isInteger(rawReviewCount) && rawReviewCount >= 0 ? rawReviewCount : 0,
    lastReviewedAt: parseDate(body.last_reviewed_at ?? body.lastReviewedAt),
    nextReviewAt: parseDate(body.next_review_at ?? body.nextReviewAt, new Date()),
    status: VALID_STATUSES.has(status) ? status : "active",
  };
}

async function resolveReadableCardLink(connection, userId, payload) {
  if (payload.cardId) {
    const [rows] = await connection.query(
      `SELECT c.id, c.deck_id, c.term_en, c.meaning_vi, c.example_sentence
       FROM cards c
       JOIN decks d ON d.id = c.deck_id
       WHERE c.id = ?
         AND (d.user_id = ? OR d.user_id IS NULL OR d.is_public = TRUE)
       LIMIT 1`,
      [payload.cardId, userId]
    );

    if (rows[0]) {
      return {
        cardId: rows[0].id,
        deckId: rows[0].deck_id,
        termEn: payload.termEn || rows[0].term_en,
        meaningVi: payload.meaningVi || rows[0].meaning_vi,
        exampleSentence: payload.exampleSentence ?? rows[0].example_sentence ?? null,
      };
    }
  }

  if (payload.deckId) {
    const [rows] = await connection.query(
      `SELECT id
       FROM decks
       WHERE id = ? AND (user_id = ? OR user_id IS NULL OR is_public = TRUE)
       LIMIT 1`,
      [payload.deckId, userId]
    );

    if (rows[0]) {
      return {
        cardId: null,
        deckId: rows[0].id,
        termEn: payload.termEn,
        meaningVi: payload.meaningVi,
        exampleSentence: payload.exampleSentence,
      };
    }
  }

  return {
    cardId: null,
    deckId: null,
    termEn: payload.termEn,
    meaningVi: payload.meaningVi,
    exampleSentence: payload.exampleSentence,
  };
}

async function findReviewById(connection, userId, reviewId, { lock = false } = {}) {
  const [rows] = await connection.query(
    `SELECT cr.*, d.title AS deck_title
     FROM card_reviews cr
     LEFT JOIN decks d ON d.id = cr.deck_id
     WHERE cr.id = ? AND cr.user_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [reviewId, userId]
  );

  return normalizeReview(rows[0]);
}

async function findReviewByCard(connection, userId, cardId, { lock = false } = {}) {
  if (!cardId) return null;

  const [rows] = await connection.query(
    `SELECT cr.*, d.title AS deck_title
     FROM card_reviews cr
     LEFT JOIN decks d ON d.id = cr.deck_id
     WHERE cr.user_id = ? AND cr.card_id = ?
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [userId, cardId]
  );

  return normalizeReview(rows[0]);
}

async function loadReadableCard(connection, userId, cardId) {
  const [rows] = await connection.query(
    `SELECT c.id, c.deck_id, c.term_en, c.meaning_vi, c.example_sentence
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = ?
       AND (d.user_id = ? OR d.user_id IS NULL OR d.is_public = TRUE)
     LIMIT 1`,
    [cardId, userId]
  );

  return rows[0] || null;
}

async function upsertReview(connection, userId, rawPayload) {
  const payload = readReviewPayload(rawPayload);
  const cardLink = await resolveReadableCardLink(connection, userId, payload);

  const termEn = cardLink.termEn || payload.termEn;
  const meaningVi = cardLink.meaningVi || payload.meaningVi;

  if (!termEn) {
    throw createHttpError(400, "term_en la bat buoc");
  }

  if (!meaningVi) {
    throw createHttpError(400, "meaning_vi la bat buoc");
  }

  const current = await findReviewByCard(connection, userId, cardLink.cardId, {
    lock: Boolean(cardLink.cardId),
  });

  if (current) {
    const reviewCount = Math.max(current.review_count, payload.reviewCount);
    const level = Math.max(current.level, payload.level);
    const status =
      current.status === "mastered" || payload.status === "mastered"
        ? "mastered"
        : "active";
    const nextReviewAt =
      parseDate(payload.nextReviewAt) ||
      parseDate(current.next_review_at) ||
      new Date();
    const lastReviewedAt =
      parseDate(payload.lastReviewedAt) || parseDate(current.last_reviewed_at);

    await connection.execute(
      `UPDATE card_reviews
       SET deck_id = ?,
           term_en = ?,
           meaning_vi = ?,
           example_sentence = ?,
           source = ?,
           level = ?,
           ease = ?,
           review_count = ?,
           last_reviewed_at = ?,
           next_review_at = ?,
           status = ?
       WHERE id = ? AND user_id = ?`,
      [
        cardLink.deckId,
        termEn,
        meaningVi,
        cardLink.exampleSentence,
        payload.source,
        level,
        payload.ease || current.ease,
        reviewCount,
        lastReviewedAt,
        nextReviewAt,
        status,
        current.id,
        userId,
      ]
    );

    return findReviewById(connection, userId, current.id);
  }

  const [result] = await connection.execute(
    `INSERT INTO card_reviews
      (
        user_id,
        card_id,
        deck_id,
        term_en,
        meaning_vi,
        example_sentence,
        source,
        level,
        ease,
        review_count,
        last_reviewed_at,
        next_review_at,
        status
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      cardLink.cardId,
      cardLink.deckId,
      termEn,
      meaningVi,
      cardLink.exampleSentence,
      payload.source,
      payload.level,
      payload.ease,
      payload.reviewCount,
      payload.lastReviewedAt,
      payload.nextReviewAt,
      payload.status,
    ]
  );

  return findReviewById(connection, userId, result.insertId);
}

function computeReviewResult(current, result) {
  const oldLevel = Number(current?.level || 0);
  let level = oldLevel;
  let nextReviewAt = addDays(3);
  let ease = result;

  if (result === "again" || result === "wrong") {
    level = Math.max(0, oldLevel - 1);
    nextReviewAt = addHours(4);
    ease = result === "wrong" ? "again" : result;
  } else if (result === "hard") {
    level = oldLevel;
    nextReviewAt = addDays(1);
  } else if (result === "good") {
    level = Math.min(5, oldLevel + 1);
    nextReviewAt = addDays(3);
  } else if (result === "easy") {
    level = Math.min(5, oldLevel + 2);
    nextReviewAt = addDays(7);
  } else if (result === "correct") {
    level = Math.min(5, oldLevel + 1);
    nextReviewAt = addDays(intervalDaysForLevel(level));
    ease = "good";
  }

  return {
    level,
    ease,
    nextReviewAt,
    status: level >= 5 ? "mastered" : "active",
    isCorrect: !["again", "wrong"].includes(result),
  };
}

async function listReviews(req, res) {
  const userId = currentUserId(req);
  const conditions = ["cr.user_id = ?"];
  const params = [userId];

  const deckId = parseOptionalPositiveInt(req.query.deckId ?? req.query.deck_id, "deckId");
  if (deckId) {
    conditions.push("cr.deck_id = ?");
    params.push(deckId);
  }

  const status = cleanText(req.query.status);
  if (status) {
    if (!VALID_STATUSES.has(status)) {
      throw createHttpError(400, "status khong hop le");
    }
    conditions.push("cr.status = ?");
    params.push(status);
  }

  const level = req.query.level === undefined ? null : Number(req.query.level);
  if (level !== null) {
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      throw createHttpError(400, "level khong hop le");
    }
    conditions.push("cr.level = ?");
    params.push(level);
  }

  const source = cleanText(req.query.source);
  if (source) {
    conditions.push("cr.source = ?");
    params.push(source);
  }

  if (cleanText(req.query.due) === "today") {
    conditions.push("cr.status = 'active'");
    conditions.push("(cr.next_review_at IS NULL OR cr.next_review_at <= CURRENT_TIMESTAMP)");
  }

  const search = cleanText(req.query.search);
  if (search) {
    conditions.push("(cr.term_en LIKE ? OR cr.meaning_vi LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  const [rows] = await pool.query(
    `SELECT cr.*, d.title AS deck_title
     FROM card_reviews cr
     LEFT JOIN decks d ON d.id = cr.deck_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY cr.next_review_at ASC, cr.updated_at DESC, cr.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json(rows.map(normalizeReview));
}

async function listDueReviews(req, res) {
  req.query.due = "today";
  req.query.status = "active";
  return listReviews(req, res);
}

async function createReview(req, res) {
  const userId = currentUserId(req);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const review = await upsertReview(connection, userId, req.body);
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
      reviews.push(await upsertReview(connection, userId, item));
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

async function applyReviewResult(connection, userId, current, result) {
  if (!VALID_RESULTS.has(result)) {
    throw createHttpError(400, "result khong hop le");
  }

  const next = computeReviewResult(current, result);

  await connection.execute(
    `UPDATE card_reviews
     SET level = ?,
         ease = ?,
         review_count = review_count + 1,
         last_reviewed_at = CURRENT_TIMESTAMP,
         next_review_at = ?,
         status = ?
     WHERE id = ? AND user_id = ?`,
    [
      next.level,
      next.ease,
      next.nextReviewAt,
      next.status,
      current.id,
      userId,
    ]
  );

  if (current.card_id) {
    await updateProgressFromAnswer(connection, {
      userId,
      cardId: current.card_id,
      isCorrect: next.isCorrect,
    });
  }

  return findReviewById(connection, userId, current.id);
}

async function updateReviewResult(req, res) {
  const userId = currentUserId(req);
  const reviewId = parsePositiveInt(req.params.reviewId, "reviewId");
  const result = cleanText(req.body.result ?? req.body.ease);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const current = await findReviewById(connection, userId, reviewId, {
      lock: true,
    });

    if (!current) {
      throw createHttpError(404, "Khong tim thay lich on tap");
    }

    const review = await applyReviewResult(connection, userId, current, result);
    await connection.commit();
    res.json(review);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateReviewResultByCard(req, res) {
  const userId = currentUserId(req);
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const result = cleanText(req.body.result ?? req.body.ease);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let current = await findReviewByCard(connection, userId, cardId, {
      lock: true,
    });

    if (!current) {
      const card = await loadReadableCard(connection, userId, cardId);
      if (!card) {
        throw createHttpError(404, "Khong tim thay tu vung");
      }

      current = await upsertReview(connection, userId, {
        card_id: card.id,
        deck_id: card.deck_id,
        term_en: card.term_en,
        meaning_vi: card.meaning_vi,
        example_sentence: card.example_sentence,
        source: req.body.source || "review",
        level: 0,
        review_count: 0,
        next_review_at: new Date().toISOString(),
      });
    }

    const review = await applyReviewResult(connection, userId, current, result);
    await connection.commit();
    res.json(review);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteReview(req, res) {
  const userId = currentUserId(req);
  const reviewId = parsePositiveInt(req.params.reviewId, "reviewId");
  const [result] = await pool.execute(
    "DELETE FROM card_reviews WHERE id = ? AND user_id = ?",
    [reviewId, userId]
  );

  res.json({ success: true, deleted: result.affectedRows > 0 });
}

async function deleteReviewByCard(req, res) {
  const userId = currentUserId(req);
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  const [result] = await pool.execute(
    "DELETE FROM card_reviews WHERE card_id = ? AND user_id = ?",
    [cardId, userId]
  );

  res.json({ success: true, deleted: result.affectedRows > 0 });
}

module.exports = {
  listReviews,
  listDueReviews,
  createReview,
  bulkUpsertReviews,
  updateReviewResult,
  updateReviewResultByCard,
  deleteReview,
  deleteReviewByCard,
};
