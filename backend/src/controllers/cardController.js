const pool = require("../config/db");
const {
  assertDeckReadable,
  assertDeckWritable,
  currentUserId,
  findDeckById,
} = require("./deckController");
const {
  cleanNullableText,
  cleanText,
  createHttpError,
  parseBoolean,
  parsePositiveInt,
} = require("../utils/http");

function normalizeCard(row) {
  if (!row) return null;

  const isFavorite = Boolean(row.is_favorite);

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

async function findCardById(cardId, connection = pool) {
  const [rows] = await connection.query("SELECT * FROM cards WHERE id = ?", [
    cardId,
  ]);

  return normalizeCard(rows[0]);
}

function readCardPayload(body, { requireTerms = true } = {}) {
  const termEn = cleanText(body.term_en ?? body.word);
  const meaningVi = cleanText(body.meaning_vi ?? body.meaning);

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
    pronunciation: cleanNullableText(body.pronunciation),
    part_of_speech: cleanNullableText(body.part_of_speech),
    is_favorite: parseBoolean(body.is_favorite ?? body.isFavorite, false),
  };
}

async function listCardsByDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckReadable(deckId, req);

  const [rows] = await pool.query(
    `SELECT *
     FROM cards
     WHERE deck_id = ?
     ORDER BY created_at DESC, id DESC`,
    [deckId]
  );

  res.json(rows.map(normalizeCard));
}

async function createCard(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckWritable(deckId, req);

  const payload = readCardPayload(req.body);

  const [result] = await pool.execute(
    `INSERT INTO cards
      (deck_id, term_en, meaning_vi, example_sentence, note, pronunciation, part_of_speech, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      deckId,
      payload.term_en,
      payload.meaning_vi,
      payload.example_sentence,
      payload.note,
      payload.pronunciation,
      payload.part_of_speech,
      payload.is_favorite,
    ]
  );

  const card = await findCardById(result.insertId);
  res.status(201).json(card);
}

async function importCards(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  await ensureDeckWritable(deckId, req);

  const inputCards = Array.isArray(req.body.cards) ? req.body.cards : [];
  const validCards = inputCards
    .map((card) => readCardPayload(card, { requireTerms: false }))
    .filter((card) => card.term_en && card.meaning_vi);

  if (validCards.length === 0) {
    throw createHttpError(400, "Khong co card hop le de import");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const insertedIds = [];
    for (const card of validCards) {
      const [result] = await connection.execute(
        `INSERT INTO cards
          (deck_id, term_en, meaning_vi, example_sentence, note, pronunciation, part_of_speech, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deckId,
          card.term_en,
          card.meaning_vi,
          card.example_sentence,
          card.note,
          card.pronunciation,
          card.part_of_speech,
          card.is_favorite,
        ]
      );

      insertedIds.push(result.insertId);
    }

    const [rows] = await connection.query(
      `SELECT *
       FROM cards
       WHERE id IN (?)
       ORDER BY created_at DESC, id DESC`,
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

  const card = await findCardById(cardId);
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

  const card = await findCardById(cardId);
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
  updateCard,
  toggleFavorite,
  deleteCard,
  findCardById,
  normalizeCard,
  ensureDeckExists,
};
