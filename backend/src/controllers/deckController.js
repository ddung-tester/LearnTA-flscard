const pool = require("../config/db");
const {
  cleanNullableText,
  cleanText,
  createHttpError,
  parseBoolean,
  parsePositiveInt,
} = require("../utils/http");

function deckWithStatsSql() {
  return `
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
      AND latest.user_id <=> ?
    ORDER BY latest.created_at DESC, latest.id DESC
    LIMIT 1
  )
`;
}

function normalizeDeck(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id === null ? null : row.user_id,
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

function currentUserId(req) {
  return req.user?.id ?? null;
}

function sameId(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return String(left) === String(right);
}

function canReadDeck(deck, userId) {
  if (deck.user_id === null && userId === null) {
    return true;
  }

  return sameId(deck.user_id, userId);
}

function canWriteDeck(deck, userId) {
  return deck.user_id !== null && sameId(deck.user_id, userId);
}

function assertDeckReadable(deck, userId) {
  if (!canReadDeck(deck, userId)) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }
}

function assertDeckWritable(deck, userId) {
  if (!canWriteDeck(deck, userId)) {
    throw createHttpError(403, "Chi co the sua bo tu cua ban");
  }
}

async function findDeckById(deckId, { quizUserId = null } = {}) {
  const [rows] = await pool.query(`${deckWithStatsSql()} WHERE d.id = ?`, [
    quizUserId,
    deckId,
  ]);

  return normalizeDeck(rows[0]);
}

async function assertUniqueDeckTitle(userId, title, excludeDeckId = null) {
  const params = [userId, title];
  let sql = `
    SELECT id
    FROM decks
    WHERE user_id = ?
      AND LOWER(title) = LOWER(?)
  `;

  if (excludeDeckId !== null) {
    sql += " AND id <> ?";
    params.push(excludeDeckId);
  }

  sql += " LIMIT 1";

  const [rows] = await pool.query(sql, params);

  if (rows.length > 0) {
    throw createHttpError(409, "Ten bo tu da ton tai");
  }
}

async function listDecks(req, res) {
  const userId = currentUserId(req);

  if (userId === null) {
    const [rows] = await pool.query(
      `${deckWithStatsSql()}
       WHERE d.user_id IS NULL
       ORDER BY d.updated_at DESC, d.created_at DESC, d.id DESC`,
      [userId]
    );

    res.json(rows.map(normalizeDeck));
    return;
  }

  const [rows] = await pool.query(
    `${deckWithStatsSql()}
     WHERE d.user_id = ?
     ORDER BY d.updated_at DESC, d.created_at DESC, d.id DESC`,
    [userId, userId]
  );

  res.json(rows.map(normalizeDeck));
}

async function getDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckReadable(deck, userId);
  res.json(deck);
}

async function createDeck(req, res) {
  const title = cleanText(req.body.title ?? req.body.name);
  if (!title) {
    throw createHttpError(400, "title la bat buoc");
  }

  const userId = currentUserId(req);
  const description = cleanText(req.body.description);
  const icon = cleanNullableText(req.body.icon);
  const themeColor = cleanNullableText(req.body.theme_color);
  const isPublic = parseBoolean(req.body.is_public, false);

  await assertUniqueDeckTitle(userId, title);

  const [result] = await pool.execute(
    `INSERT INTO decks
      (user_id, title, description, icon, theme_color, is_public)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, description, icon, themeColor, isPublic]
  );

  const deck = await findDeckById(result.insertId, { quizUserId: userId });
  res.status(201).json(deck);
}

async function updateDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const userId = currentUserId(req);
  const current = await findDeckById(deckId, { quizUserId: userId });

  if (!current) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckWritable(current, userId);

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

  await assertUniqueDeckTitle(userId, title, deckId);

  await pool.execute(
    `UPDATE decks
     SET title = ?, description = ?, icon = ?, theme_color = ?, is_public = ?
     WHERE id = ?`,
    [title, description, icon, themeColor, isPublic, deckId]
  );

  const deck = await findDeckById(deckId, { quizUserId: userId });
  res.json(deck);
}

async function deleteDeck(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const userId = currentUserId(req);
  const current = await findDeckById(deckId, { quizUserId: userId });

  if (!current) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckWritable(current, userId);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `DELETE sa
       FROM study_answers sa
       JOIN cards c ON c.id = sa.card_id
       WHERE c.deck_id = ?`,
      [deckId]
    );

    await connection.execute(
      `DELETE sa
       FROM study_answers sa
       JOIN study_sessions ss ON ss.id = sa.session_id
       WHERE ss.deck_id = ?`,
      [deckId]
    );

    await connection.execute(
      `DELETE cp
       FROM card_progress cp
       JOIN cards c ON c.id = cp.card_id
       WHERE c.deck_id = ?`,
      [deckId]
    );

    await connection.execute("DELETE FROM study_sessions WHERE deck_id = ?", [
      deckId,
    ]);
    await connection.execute("DELETE FROM quiz_results WHERE deck_id = ?", [
      deckId,
    ]);
    await connection.execute("DELETE FROM cards WHERE deck_id = ?", [deckId]);

    const [result] = await connection.execute("DELETE FROM decks WHERE id = ?", [
      deckId,
    ]);

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Khong tim thay bo tu");
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
  currentUserId,
  canReadDeck,
  canWriteDeck,
  assertDeckReadable,
  assertDeckWritable,
};
