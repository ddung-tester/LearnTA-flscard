const pool = require("../config/db");
const {
  assertDeckReadable,
  currentUserId,
  findDeckById,
} = require("./deckController");
const { findCardById } = require("./cardController");
const { updateProgressFromAnswer } = require("../utils/cardProgress");
const {
  cleanText,
  createHttpError,
  parseBoolean,
  parsePositiveInt,
} = require("../utils/http");

const VALID_MODES = new Set(["flashcard", "quiz", "written"]);
const VALID_DIRECTIONS = new Set(["en-vi", "vi-en"]);
const VALID_QUESTION_TYPES = new Set(["multiple_choice", "written", "flashcard"]);

function normalizeSession(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    deck_id: row.deck_id,
    mode: row.mode,
    direction: row.direction,
    only_favorite: Boolean(row.only_favorite),
    random_order: Boolean(row.random_order),
    started_at: row.started_at,
    ended_at: row.ended_at,
    total: row.total || 0,
    correct: row.correct || 0,
    review: row.review || 0,
    xp_earned: row.xp_earned || 0,
    max_combo: row.max_combo || 0,
  };
}

function normalizeAnswer(row) {
  if (!row) return null;

  return {
    id: row.id,
    session_id: row.session_id,
    card_id: row.card_id,
    question_text: row.question_text,
    correct_answer: row.correct_answer,
    user_answer: row.user_answer,
    is_correct: Boolean(row.is_correct),
    answered_at: row.answered_at,
  };
}

function normalizeQuizResult(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    deck_id: row.deck_id,
    question_type: row.question_type,
    direction: row.direction,
    correct: row.correct || 0,
    review: row.review || 0,
    total: row.total || 0,
    created_at: row.created_at,
  };
}

function parseMode(value) {
  const mode = cleanText(value);
  if (!VALID_MODES.has(mode)) {
    throw createHttpError(400, "mode khong hop le");
  }
  return mode;
}

function parseDirection(value) {
  const direction = cleanText(value);
  if (!VALID_DIRECTIONS.has(direction)) {
    throw createHttpError(400, "direction khong hop le");
  }
  return direction;
}

function parseQuestionType(value) {
  const questionType = cleanText(value);
  if (!VALID_QUESTION_TYPES.has(questionType)) {
    throw createHttpError(400, "question_type khong hop le");
  }
  return questionType;
}

function parseCount(value, fieldName) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0) {
    throw createHttpError(400, `${fieldName} khong hop le`);
  }
  return number;
}

function assertSessionOwner(session, userId) {
  if (session.user_id === null && userId === null) return;
  if (session.user_id !== null && String(session.user_id) === String(userId)) return;

  throw createHttpError(403, "Khong co quyen cap nhat phien hoc nay");
}

async function findSessionById(sessionId, connection = pool) {
  const [rows] = await connection.query(
    "SELECT * FROM study_sessions WHERE id = ?",
    [sessionId]
  );
  return normalizeSession(rows[0]);
}

async function createStudySession(req, res) {
  const deckId = parsePositiveInt(req.body.deck_id, "deck_id");
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckReadable(deck, userId);

  const mode = parseMode(req.body.mode);
  const direction = parseDirection(req.body.direction);
  const onlyFavorite = parseBoolean(req.body.only_favorite, false);
  const randomOrder = parseBoolean(req.body.random_order, false);
  const total = parseCount(req.body.total, "total");

  const [result] = await pool.execute(
    `INSERT INTO study_sessions
      (user_id, deck_id, mode, direction, only_favorite, random_order, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, deckId, mode, direction, onlyFavorite, randomOrder, total]
  );

  const session = await findSessionById(result.insertId);
  res.status(201).json(session);
}

async function finishStudySession(req, res) {
  const sessionId = parsePositiveInt(req.params.sessionId, "sessionId");
  const current = await findSessionById(sessionId);

  if (!current) {
    throw createHttpError(404, "Khong tim thay phien hoc");
  }

  assertSessionOwner(current, currentUserId(req));

  const correct = parseCount(req.body.correct, "correct");
  const review = parseCount(req.body.review, "review");
  const total = parseCount(req.body.total, "total");
  const xpEarned = parseCount(req.body.xp_earned, "xp_earned");
  const maxCombo = parseCount(req.body.max_combo, "max_combo");

  await pool.execute(
    `UPDATE study_sessions
     SET ended_at = CURRENT_TIMESTAMP,
         correct = ?,
         review = ?,
         total = ?,
         xp_earned = ?,
         max_combo = ?
     WHERE id = ?`,
    [correct, review, total, xpEarned, maxCombo, sessionId]
  );

  const session = await findSessionById(sessionId);
  res.json(session);
}

async function addStudyAnswers(req, res) {
  const sessionId = parsePositiveInt(req.params.sessionId, "sessionId");
  const inputAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];

  if (inputAnswers.length === 0) {
    throw createHttpError(400, "answers la bat buoc");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const session = await findSessionById(sessionId, connection);
    if (!session) {
      throw createHttpError(404, "Khong tim thay phien hoc");
    }

    assertSessionOwner(session, currentUserId(req));

    const insertedIds = [];

    for (const answer of inputAnswers) {
      const cardId = parsePositiveInt(answer.card_id, "card_id");
      const card = await findCardById(cardId, connection);
      if (!card) {
        throw createHttpError(404, "Khong tim thay tu vung");
      }

      if (String(card.deck_id) !== String(session.deck_id)) {
        throw createHttpError(400, "card_id khong thuoc phien hoc");
      }

      const questionText = cleanText(answer.question_text);
      const correctAnswer = cleanText(answer.correct_answer);
      const userAnswer = cleanText(answer.user_answer);
      const isCorrect = parseBoolean(answer.is_correct, false);

      const [result] = await connection.execute(
        `INSERT INTO study_answers
          (session_id, card_id, question_text, correct_answer, user_answer, is_correct)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, cardId, questionText, correctAnswer, userAnswer, isCorrect]
      );

      insertedIds.push(result.insertId);
      await updateProgressFromAnswer(connection, {
        userId: session.user_id,
        cardId,
        isCorrect,
      });
    }

    const [rows] = await connection.query(
      `SELECT *
       FROM study_answers
       WHERE id IN (?)
       ORDER BY id ASC`,
      [insertedIds]
    );

    await connection.commit();

    res.status(201).json({
      inserted_count: rows.length,
      answers: rows.map(normalizeAnswer),
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createQuizResult(req, res) {
  const deckId = parsePositiveInt(req.body.deck_id, "deck_id");
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckReadable(deck, userId);

  const questionType = parseQuestionType(req.body.question_type);
  const direction = parseDirection(req.body.direction);
  const correct = parseCount(req.body.correct, "correct");
  const review = parseCount(req.body.review, "review");
  const total = parseCount(req.body.total, "total");

  const [result] = await pool.execute(
    `INSERT INTO quiz_results
      (user_id, deck_id, question_type, direction, correct, review, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, deckId, questionType, direction, correct, review, total]
  );

  const [rows] = await pool.query("SELECT * FROM quiz_results WHERE id = ?", [
    result.insertId,
  ]);

  res.status(201).json(normalizeQuizResult(rows[0]));
}

async function getLatestQuizResult(req, res) {
  const deckId = parsePositiveInt(req.params.deckId, "deckId");
  const userId = currentUserId(req);
  const deck = await findDeckById(deckId, { quizUserId: userId });

  if (!deck) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }

  assertDeckReadable(deck, userId);

  const [rows] = await pool.query(
    `SELECT *
     FROM quiz_results
     WHERE deck_id = ? AND user_id <=> ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [deckId, userId]
  );

  res.json(normalizeQuizResult(rows[0]));
}

module.exports = {
  createStudySession,
  finishStudySession,
  addStudyAnswers,
  createQuizResult,
  getLatestQuizResult,
};
