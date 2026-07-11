const pool = require("../config/db");
const {
  assertDeckReadable,
  assertDeckWritable,
  currentUserId,
  findDeckById,
} = require("./deckController");
const {
  cleanNullableText,
  cleanNullableTextWithLimit,
  cleanText,
  cleanTextWithLimit,
  createHttpError,
  parseBoolean,
  parsePositiveInt,
} = require("../utils/http");

function normalizeCard(row) {
  if (!row) return null;

  const isFavorite = Boolean(row.is_favorite);
  const correctCount = Number(row.correct_count || 0);
  const reviewCount = Number(row.review_count || 0);
  const wrongCount = Number(row.wrong_count || 0);
  const masteryLevel = Number(row.mastery_level || 0);

  return {
    id: row.id,
    deck_id: row.deck_id,
    term_en: row.term_en,
    meaning_vi: row.meaning_vi,
    example_sentence: row.example_sentence || "",
    note: row.note || "",
    pronunciation: row.pronunciation,
    part_of_speech: row.part_of_speech,
    is_favorite: isFavorite,
    isFavorite,
    sort_order: Number(row.sort_order || 0),
    progress: {
      id: row.progress_id || null,
      mastery_level: masteryLevel,
      review_count: reviewCount,
      correct_count: correctCount,
      wrong_count: wrongCount,
      last_reviewed_at: row.last_reviewed_at || null,
      next_review_at: row.next_review_at || null,
    },
    mastery_level: masteryLevel,
    review_count: reviewCount,
    correct_count: correctCount,
    wrong_count: wrongCount,
    is_new: correctCount < 5,
    isNew: correctCount < 5,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureDeckExists(deckId) {
  const deck = await findDeckById(deckId);

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  return deck;
}

async function ensureDeckReadable(deckId, req) {
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckReadable(deck, userId);
  return deck;
}

async function ensureDeckWritable(deckId, req) {
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckWritable(deck, userId);
  return deck;
}

async function ensureCardWritable(cardId, req) {
  const card = await findCardById(cardId);

  if (!card) {
    throw createHttpError(404, "Khong tim thay tu vung");
  }

  await ensureDeckWritable(card.deck_id, req);
  return card;
}

async function findCardById(cardId, connection = pool, options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "userId")) {
    if (options.userId === null || options.userId === undefined) {
      const [rows] = await connection.query("SELECT * FROM cards WHERE id = ?", [
        cardId,
      ]);

      return normalizeCard(rows[0]);
    }

    const [rows] = await connection.query(
      `SELECT
         c.*,
         cp.id AS progress_id,
         cp.mastery_level,
         cp.review_count,
         cp.correct_count,
         cp.wrong_count,
         cp.last_reviewed_at,
         cp.next_review_at
       FROM cards c
       LEFT JOIN card_progress cp
         ON cp.card_id = c.id AND cp.user_id = ?
       WHERE c.id = ?
       LIMIT 1`,
      [options.userId, cardId]
    );

    return normalizeCard(rows[0]);
  }

  const [rows] = await connection.query("SELECT * FROM cards WHERE id = ?", [
    cardId,
  ]);

  return normalizeCard(rows[0]);
}

function readCardPayload(body, { requireTerms = true } = {}) {
  const termEn = cleanTextWithLimit(body.term_en ?? body.word, 255, "term_en");
  const meaningVi = cleanTextWithLimit(
    body.meaning_vi ?? body.meaning,
    255,
    "meaning_vi"
  );

  if (requireTerms && !termEn) {
    throw createHttpError(400, "term_en la bat buoc");
  }

  if (requireTerms && !meaningVi) {
    throw createHttpError(400, "meaning_vi la bat buoc");
  }

  return {
    term_en: termEn,
    meaning_vi: meaningVi,
    example_sentence: cleanText(body.example_sentence ?? body.example),
    note: cleanText(body.note),
    pronunciation: cleanNullableTextWithLimit(body.pronunciation, 255, "pronunciation"),
    part_of_speech: cleanNullableTextWithLimit(body.part_of_speech, 50, "part_of_speech"),
    is_favorite: parseBoolean(body.is_favorite ?? body.isFavorite, false),
  };
}

async function listCardsByDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckReadable(deckId, req);
  const userId = currentUserId(req);

  if (userId === null || userId === undefined) {
    const [rows] = await pool.query(
      `SELECT *
       FROM cards
       WHERE deck_id = ?
       ORDER BY sort_order ASC, created_at DESC, id DESC`,
      [deckId]
    );

    res.json(rows.map(normalizeCard));
    return;
  }

  const [rows] = await pool.query(
    `SELECT
       c.*,
       cp.id AS progress_id,
       cp.mastery_level,
       cp.review_count,
       cp.correct_count,
       cp.wrong_count,
       cp.last_reviewed_at,
       cp.next_review_at
     FROM cards c
     LEFT JOIN card_progress cp
       ON cp.card_id = c.id AND cp.user_id = ?
     WHERE c.deck_id = ?
     ORDER BY c.sort_order ASC, c.created_at DESC, c.id DESC`,
    [userId, deckId]
  );

  res.json(rows.map(normalizeCard));
}

async function createCard(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckWritable(deckId, req);

  const payload = readCardPayload(req.body);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Serialize inserts for the same deck so two requests cannot both claim
    // sort_order 0.
    await connection.query("SELECT id FROM decks WHERE id = ? FOR UPDATE", [deckId]);

    await connection.execute(
      "UPDATE cards SET sort_order = sort_order + 1 WHERE deck_id = ?",
      [deckId]
    );

    const [result] = await connection.execute(
      `INSERT INTO cards
        (deck_id, term_en, meaning_vi, example_sentence, note, pronunciation, part_of_speech, is_favorite, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deckId,
        payload.term_en,
        payload.meaning_vi,
        payload.example_sentence,
        payload.note,
        payload.pronunciation,
        payload.part_of_speech,
        payload.is_favorite,
        0,
      ]
    );

    await connection.commit();

    const card = await findCardById(result.insertId);
    res.status(201).json(card);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function importCards(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckWritable(deckId, req);

  const inputCards = Array.isArray(req.body.cards) ? req.body.cards : [];
  if (inputCards.length > 500) {
    throw createHttpError(400, "cards khong duoc vuot qua 500 phan tu");
  }
  const validCards = inputCards
    .map((card) => readCardPayload(card, { requireTerms: false }))
    .filter((card) => card.term_en && card.meaning_vi);

  if (validCards.length === 0) {
    throw createHttpError(400, "Khong co card hop le de import");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query("SELECT id FROM decks WHERE id = ? FOR UPDATE", [deckId]);

    // Find current max sort_order to append new cards below existing ones
    const [[maxRow]] = await connection.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM cards WHERE deck_id = ?",
      [deckId]
    );
    const baseOrder = Number(maxRow.max_order) + 1;

    const insertedIds = [];
    for (let index = 0; index < validCards.length; index += 1) {
      const card = validCards[index];
      const [result] = await connection.execute(
        `INSERT INTO cards
          (deck_id, term_en, meaning_vi, example_sentence, note, pronunciation, part_of_speech, is_favorite, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deckId,
          card.term_en,
          card.meaning_vi,
          card.example_sentence,
          card.note,
          card.pronunciation,
          card.part_of_speech,
          card.is_favorite,
          baseOrder + index,
        ]
      );

      insertedIds.push(result.insertId);
    }

    const [rows] = await connection.query(
      `SELECT *
       FROM cards
       WHERE id IN (?)
       ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [insertedIds]
    );

    await connection.commit();

    res.status(201).json({
      inserted_count: rows.length,
      cards: rows.map(normalizeCard),
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reorderCards(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckWritable(deckId, req);

  const cardIds = Array.isArray(req.body.card_ids)
    ? req.body.card_ids.map((id) => parsePositiveInt(id, "card_id"))
    : [];

  if (cardIds.length === 0) {
    throw createHttpError(400, "card_ids la bat buoc");
  }

  const uniqueCardIds = [...new Set(cardIds)];
  if (uniqueCardIds.length !== cardIds.length) {
    throw createHttpError(400, "card_ids khong duoc trung lap");
  }

  const [existingRows] = await pool.query(
    "SELECT id FROM cards WHERE deck_id = ?",
    [deckId]
  );
  const existingIds = existingRows.map((row) => Number(row.id));
  const existingIdSet = new Set(existingIds);

  if (
    cardIds.length !== existingIds.length ||
    cardIds.some((cardId) => !existingIdSet.has(Number(cardId)))
  ) {
    throw createHttpError(400, "Thu tu tu vung khong hop le");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let index = 0; index < cardIds.length; index += 1) {
      await connection.execute(
        "UPDATE cards SET sort_order = ? WHERE deck_id = ? AND id = ?",
        [index, deckId, cardIds[index]]
      );
    }

    const [rows] = await connection.query(
      `SELECT *
       FROM cards
       WHERE deck_id = ?
       ORDER BY sort_order ASC, created_at DESC, id DESC`,
      [deckId]
    );

    await connection.commit();
    res.json(rows.map(normalizeCard));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCard(req, res) {
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  await ensureCardWritable(cardId, req);

  const payload = readCardPayload(req.body);

  await pool.execute(
    `UPDATE cards
     SET term_en = ?, meaning_vi = ?, example_sentence = ?, note = ?,
         pronunciation = ?, part_of_speech = ?
     WHERE id = ?`,
    [
      payload.term_en,
      payload.meaning_vi,
      payload.example_sentence,
      payload.note,
      payload.pronunciation,
      payload.part_of_speech,
      cardId,
    ]
  );

  const card = await findCardById(cardId, pool, { userId: currentUserId(req) });
  res.json(card);
}

async function toggleFavorite(req, res) {
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  await ensureCardWritable(cardId, req);

  const isFavorite = parseBoolean(req.body.is_favorite ?? req.body.isFavorite);

  await pool.execute("UPDATE cards SET is_favorite = ? WHERE id = ?", [
    isFavorite,
    cardId,
  ]);

  const card = await findCardById(cardId, pool, { userId: currentUserId(req) });
  res.json(card);
}

async function deleteCard(req, res) {
  const cardId = parsePositiveInt(req.params.cardId, "cardId");
  await ensureCardWritable(cardId, req);

  const [result] = await pool.execute("DELETE FROM cards WHERE id = ?", [
    cardId,
  ]);

  if (result.affectedRows === 0) {
    throw createHttpError(404, "Khong tim thay tu vung");
  }

  res.json({ success: true });
}

module.exports = {
  listCardsByDeck,
  createCard,
  importCards,
  reorderCards,
  updateCard,
  toggleFavorite,
  deleteCard,
  findCardById,
  normalizeCard,
  ensureDeckExists,
};
