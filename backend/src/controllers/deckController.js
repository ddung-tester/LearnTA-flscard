const pool = require("../config/db");
const {
  cleanNullableText,
  cleanText,
  createHttpError,
  parseBoolean,
  parseOptionalUserId,
  parsePositiveInt,
} = require("../utils/http");

const DECK_WITH_STATS_SQL = `
  SELECT
    d.*,
    COALESCE(card_counts.card_count, 0) AS card_count,
    qr.id AS latest_quiz_id,
    qr.question_type AS latest_quiz_question_type,
    qr.direction AS latest_quiz_direction,
    qr.correct AS latest_quiz_correct,
    qr.review AS latest_quiz_review,
    qr.total AS latest_quiz_total,
    qr.created_at AS latest_quiz_created_at
  FROM decks d
  LEFT JOIN (
    SELECT deck_id, COUNT(*) AS card_count
    FROM cards
    GROUP BY deck_id
  ) card_counts ON card_counts.deck_id = d.id
  LEFT JOIN quiz_results qr ON qr.id = (
    SELECT latest.id
    FROM quiz_results latest
    WHERE latest.deck_id = d.id
    ORDER BY latest.created_at DESC, latest.id DESC
    LIMIT 1
  )
`;

function normalizeDeck(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || "",
    icon: row.icon,
    theme_color: row.theme_color,
    is_public: Boolean(row.is_public),
    streak: row.streak || 0,
    mastered_count: row.mastered_count || 0,
    masteredCount: row.mastered_count || 0,
    card_count: Number(row.card_count || 0),
    latest_quiz: row.latest_quiz_id
      ? {
          correct: row.latest_quiz_correct,
          review: row.latest_quiz_review,
          total: row.latest_quiz_total,
          direction: row.latest_quiz_direction,
          question_type: row.latest_quiz_question_type,
          created_at: row.latest_quiz_created_at,
        }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findDeckById(deckId) {
  const [rows] = await pool.query(`${DECK_WITH_STATS_SQL} WHERE d.id = ?`, [
    deckId,
  ]);

  return normalizeDeck(rows[0]);
}

async function listDecks(req, res) {
  const [rows] = await pool.query(
    `${DECK_WITH_STATS_SQL}
     ORDER BY d.updated_at DESC, d.created_at DESC, d.id DESC`
  );

  res.json(rows.map(normalizeDeck));
}

async function getDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const deck = await findDeckById(deckId);

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  res.json(deck);
}

async function createDeck(req, res) {
  const title = cleanText(req.body.title ?? req.body.name);
  if (!title) {
    throw createHttpError(400, "title la bat buoc");
  }

  const userId = parseOptionalUserId(req.body.user_id);
  const description = cleanText(req.body.description);
  const icon = cleanNullableText(req.body.icon);
  const themeColor = cleanNullableText(req.body.theme_color);
  const isPublic = parseBoolean(req.body.is_public, false);

  const [result] = await pool.execute(
    `INSERT INTO decks
      (user_id, title, description, icon, theme_color, is_public)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, description, icon, themeColor, isPublic]
  );

  const deck = await findDeckById(result.insertId);
  res.status(201).json(deck);
}

async function updateDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const current = await findDeckById(deckId);

  if (!current) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  const title = cleanText(req.body.title ?? req.body.name);
  if (!title) {
    throw createHttpError(400, "title la bat buoc");
  }

  const description = cleanText(req.body.description);
  const icon =
    req.body.icon === undefined ? current.icon : cleanNullableText(req.body.icon);
  const themeColor =
    req.body.theme_color === undefined
      ? current.theme_color
      : cleanNullableText(req.body.theme_color);
  const isPublic =
    req.body.is_public === undefined
      ? current.is_public
      : parseBoolean(req.body.is_public, false);

  await pool.execute(
    `UPDATE decks
     SET title = ?, description = ?, icon = ?, theme_color = ?, is_public = ?
     WHERE id = ?`,
    [title, description, icon, themeColor, isPublic, deckId]
  );

  const deck = await findDeckById(deckId);
  res.json(deck);
}

async function deleteDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const [result] = await pool.execute("DELETE FROM decks WHERE id = ?", [deckId]);

  if (result.affectedRows === 0) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  res.json({ success: true });
}

module.exports = {
  listDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  findDeckById,
};
