const pool = require("../config/db");
const {
  cleanNullableText,
  cleanTextWithLimit,
  cleanText,
  createHttpError,
  parsePositiveInt,
} = require("../utils/http");

const VALID_STATUSES = new Set(["active", "reviewed"]);
const VALID_SORTS = new Set([
  "newest",
  "most_mistakes",
  "mistake_count",
  "last_wrong",
  "deck",
  "az",
]);

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

function pickLaterDate(left, right) {
  const leftDate = parseDate(left);
  const rightDate = parseDate(right);
  if (!leftDate) return rightDate;
  if (!rightDate) return leftDate;
  return leftDate > rightDate ? leftDate : rightDate;
}

function normalizeMistake(row) {
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
    mistake_count: Number(row.mistake_count || 0),
    status: row.status,
    last_wrong_at: row.last_wrong_at,
    last_reviewed_at: row.last_reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function readMistakePayload(body) {
  const cardId = parseOptionalPositiveInt(
    body.card_id ?? body.cardId ?? body.id,
    "card_id"
  );
  const deckId = parseOptionalPositiveInt(body.deck_id ?? body.deckId, "deck_id");
  const mistakeCount = Number(body.mistake_count ?? body.mistakeCount ?? 1);

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
    mistakeCount:
      Number.isInteger(mistakeCount) && mistakeCount > 0 ? mistakeCount : 1,
    status: VALID_STATUSES.has(body.status) ? body.status : "active",
    lastWrongAt: parseDate(body.last_wrong_at ?? body.lastWrongAt, new Date()),
    lastReviewedAt: parseDate(body.last_reviewed_at ?? body.lastReviewedAt),
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

async function findMistakeById(connection, userId, mistakeId) {
  const [rows] = await connection.query(
    `SELECT mw.*, d.title AS deck_title
     FROM mistake_words mw
     LEFT JOIN decks d ON d.id = mw.deck_id
     WHERE mw.id = ? AND mw.user_id = ?
     LIMIT 1`,
    [mistakeId, userId]
  );

  return normalizeMistake(rows[0]);
}

async function findMistakeByCard(connection, userId, cardId) {
  if (!cardId) return null;

  const [rows] = await connection.query(
    "SELECT * FROM mistake_words WHERE user_id = ? AND card_id = ? LIMIT 1",
    [userId, cardId]
  );

  return rows[0] || null;
}

async function upsertMistake(connection, userId, rawPayload, { mode = "increment" } = {}) {
  const payload = readMistakePayload(rawPayload);
  const cardLink = await resolveReadableCardLink(connection, userId, payload);

  const termEn = cardLink.termEn || payload.termEn;
  const meaningVi = cardLink.meaningVi || payload.meaningVi;

  if (!termEn) {
    throw createHttpError(400, "term_en la bat buoc");
  }

  if (!meaningVi) {
    throw createHttpError(400, "meaning_vi la bat buoc");
  }

  const current = await findMistakeByCard(connection, userId, cardLink.cardId);

  if (current) {
    const mistakeCount =
      mode === "sync"
        ? Math.max(Number(current.mistake_count || 0), payload.mistakeCount)
        : Number(current.mistake_count || 0) + payload.mistakeCount;
    const lastWrongAt =
      mode === "sync"
        ? pickLaterDate(current.last_wrong_at, payload.lastWrongAt)
        : payload.lastWrongAt;
    const status = mode === "sync" ? payload.status : "active";
    const lastReviewedAt =
      payload.lastReviewedAt || (status === "reviewed" ? current.last_reviewed_at : null);

    await connection.execute(
      `UPDATE mistake_words
       SET deck_id = ?,
           term_en = ?,
           meaning_vi = ?,
           example_sentence = ?,
           source = ?,
           mistake_count = ?,
           status = ?,
           last_wrong_at = ?,
           last_reviewed_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        cardLink.deckId,
        termEn,
        meaningVi,
        cardLink.exampleSentence,
        payload.source,
        mistakeCount,
        status,
        lastWrongAt,
        lastReviewedAt,
        current.id,
        userId,
      ]
    );

    return findMistakeById(connection, userId, current.id);
  }

  const [result] = await connection.execute(
    `INSERT INTO mistake_words
      (
        user_id,
        card_id,
        deck_id,
        term_en,
        meaning_vi,
        example_sentence,
        source,
        mistake_count,
        status,
        last_wrong_at,
        last_reviewed_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      cardLink.cardId,
      cardLink.deckId,
      termEn,
      meaningVi,
      cardLink.exampleSentence,
      payload.source,
      payload.mistakeCount,
      payload.status,
      payload.lastWrongAt,
      payload.lastReviewedAt,
    ]
  );

  return findMistakeById(connection, userId, result.insertId);
}

async function listMistakes(req, res) {
  const userId = currentUserId(req);
  const conditions = ["mw.user_id = ?"];
  const params = [userId];

  const deckId = parseOptionalPositiveInt(req.query.deckId ?? req.query.deck_id, "deckId");
  if (deckId) {
    conditions.push("mw.deck_id = ?");
    params.push(deckId);
  }

  const status = cleanText(req.query.status);
  if (status) {
    if (!VALID_STATUSES.has(status)) {
      throw createHttpError(400, "status khong hop le");
    }
    conditions.push("mw.status = ?");
    params.push(status);
  }

  const search = cleanText(req.query.search);
  if (search) {
    conditions.push("(mw.term_en LIKE ? OR mw.meaning_vi LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const sort = VALID_SORTS.has(req.query.sort) ? req.query.sort : "last_wrong";
  const orderBy = {
    newest: "mw.created_at DESC, mw.id DESC",
    most_mistakes: "mw.mistake_count DESC, mw.last_wrong_at DESC, mw.id DESC",
    mistake_count: "mw.mistake_count DESC, mw.last_wrong_at DESC, mw.id DESC",
    last_wrong: "mw.last_wrong_at DESC, mw.updated_at DESC, mw.id DESC",
    deck: "d.title ASC, mw.last_wrong_at DESC, mw.id DESC",
    az: "mw.term_en ASC, mw.id ASC",
  }[sort];

  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  const [rows] = await pool.query(
    `SELECT mw.*, d.title AS deck_title
     FROM mistake_words mw
     LEFT JOIN decks d ON d.id = mw.deck_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json(rows.map(normalizeMistake));
}

async function createMistake(req, res) {
  const userId = currentUserId(req);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const mistake = await upsertMistake(connection, userId, req.body);
    await connection.commit();
    res.status(201).json(mistake);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function bulkUpsertMistakes(req, res) {
  const userId = currentUserId(req);
  const items = Array.isArray(req.body.items)
    ? req.body.items
    : Array.isArray(req.body.mistakes)
      ? req.body.mistakes
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
    const mistakes = [];

    for (const item of items) {
      mistakes.push(await upsertMistake(connection, userId, item, { mode: "sync" }));
    }

    await connection.commit();
    res.status(201).json({ synced_count: mistakes.length, mistakes });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateMistake(req, res) {
  const userId = currentUserId(req);
  const mistakeId = parsePositiveInt(req.params.mistakeId, "mistakeId");
  const status = cleanText(req.body.status);

  if (!VALID_STATUSES.has(status)) {
    throw createHttpError(400, "status khong hop le");
  }

  const [result] = await pool.execute(
    `UPDATE mistake_words
     SET status = ?,
         last_reviewed_at = CASE WHEN ? = 'reviewed' THEN CURRENT_TIMESTAMP ELSE last_reviewed_at END
     WHERE id = ? AND user_id = ?`,
    [status, status, mistakeId, userId]
  );

  if (result.affectedRows === 0) {
    throw createHttpError(404, "Khong tim thay tu sai");
  }

  const mistake = await findMistakeById(pool, userId, mistakeId);
  res.json(mistake);
}

async function deleteMistake(req, res) {
  const userId = currentUserId(req);
  const mistakeId = parsePositiveInt(req.params.mistakeId, "mistakeId");

  const [result] = await pool.execute(
    "DELETE FROM mistake_words WHERE id = ? AND user_id = ?",
    [mistakeId, userId]
  );

  if (result.affectedRows === 0) {
    throw createHttpError(404, "Khong tim thay tu sai");
  }

  res.json({ success: true });
}

async function clearMistakes(req, res) {
  const userId = currentUserId(req);
  const conditions = ["user_id = ?"];
  const params = [userId];

  const deckId = parseOptionalPositiveInt(req.query.deckId ?? req.query.deck_id, "deckId");
  if (deckId) {
    conditions.push("deck_id = ?");
    params.push(deckId);
  }

  const status = cleanText(req.query.status);
  if (status) {
    if (!VALID_STATUSES.has(status)) {
      throw createHttpError(400, "status khong hop le");
    }
    conditions.push("status = ?");
    params.push(status);
  }

  const [result] = await pool.execute(
    `DELETE FROM mistake_words WHERE ${conditions.join(" AND ")}`,
    params
  );

  res.json({ success: true, deleted_count: result.affectedRows });
}

module.exports = {
  listMistakes,
  createMistake,
  bulkUpsertMistakes,
  updateMistake,
  deleteMistake,
  clearMistakes,
};
