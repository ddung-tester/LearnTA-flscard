const pool = require("../config/db");
const {
  assertDeckReadable,
  currentUserId,
  findDeckById,
} = require("./deckController");
const { findCardById } = require("./cardController");
const { updateProgressFromAnswer } = require("../utils/cardProgress");
const { updateUserStreak, updateDeckStreak } = require("../services/streakService");
const {
  cleanText,
  createHttpError,
  parseBoolean,
  parsePositiveInt,
} = require("../utils/http");

const VALID_MODES = new Set(["flashcard", "quiz", "written", "review"]);
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
    duration_seconds: row.duration_seconds || 0,
    durationSeconds: row.duration_seconds || 0,
    total: row.total || 0,
    total_cards: row.total || 0,
    totalCards: row.total || 0,
    correct: row.correct || 0,
    correct_count: row.correct || 0,
    correctCount: row.correct || 0,
    review: row.review || 0,
    wrong_count: row.review || 0,
    wrongCount: row.review || 0,
    accuracy:
      Number(row.total || 0) > 0
        ? Math.round((Number(row.correct || 0) / Number(row.total || 0)) * 100)
        : 0,
    xp_earned: row.xp_earned || 0,
    xpEarned: row.xp_earned || 0,
    max_combo: row.max_combo || 0,
    segment_size: row.segment_size || 0,
    segment_total: row.segment_total || 0,
    segment_completed: row.segment_completed || 0,
    progress_segments: parseStoredJson(row.progress_segments),
    deck_title: row.deck_title || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
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
    answer_meta: parseStoredJson(row.answer_meta),
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
    progress_segments: parseStoredJson(row.progress_segments),
    created_at: row.created_at,
  };
}

function createUnsavedQuizResult({
  userId,
  deckId,
  questionType,
  direction,
  correct,
  review,
  total,
  progressSegments = null,
}) {
  return {
    id: null,
    user_id: userId,
    deck_id: deckId,
    question_type: questionType,
    direction,
    correct,
    review,
    total,
    progress_segments: progressSegments,
    created_at: null,
    saved: false,
  };
}

function parseStoredJson(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseMode(value) {
  const mode = cleanText(value);
  if (!VALID_MODES.has(mode)) {
    throw createHttpError(400, "mode khong hop le");
  }
  return mode;
}

function parseDirection(value, fallback = "en-vi") {
  const direction = cleanText(value || fallback);
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

function parseOptionalDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} khong hop le`);
  }
  return date;
}

function parseOptionalJsonPayload(value, fieldName) {
  if (value === null || value === undefined) return null;

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw createHttpError(400, `${fieldName} khong hop le`);
    }
  }

  if (typeof parsed !== "object") {
    throw createHttpError(400, `${fieldName} khong hop le`);
  }

  return JSON.stringify(parsed);
}

function assertSessionOwner(session, userId) {
  if (session.user_id === null && userId === null) return;
  if (session.user_id !== null && String(session.user_id) === String(userId)) return;

  throw createHttpError(403, "Khong co quyen cap nhat phien hoc nay");
}

async function findSessionById(sessionId, connection = pool, { lock = false } = {}) {
  const [rows] = await connection.query(
    `SELECT ss.*, d.title AS deck_title
     FROM study_sessions ss
     LEFT JOIN decks d ON d.id = ss.deck_id
     WHERE ss.id = ?${lock ? " FOR UPDATE" : ""}`,
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
  const total = parseCount(req.body.total ?? req.body.total_cards, "total");
  const correct = parseCount(req.body.correct ?? req.body.correct_count, "correct");
  const review = parseCount(req.body.review ?? req.body.wrong_count, "review");
  const xpEarned = correct * (mode === "review" ? 5 : 10);
  const maxCombo = parseCount(req.body.max_combo ?? req.body.maxCombo, "max_combo");
  const durationSeconds = parseCount(
    req.body.duration_seconds ?? req.body.durationSeconds,
    "duration_seconds"
  );
  const startedAt = parseOptionalDate(req.body.started_at ?? req.body.startedAt, "started_at");
  const endedAt = parseOptionalDate(req.body.ended_at ?? req.body.endedAt, "ended_at");
  const segmentSize = parseCount(req.body.segment_size, "segment_size");
  const segmentTotal = parseCount(req.body.segment_total, "segment_total");
  const segmentCompleted = parseCount(req.body.segment_completed, "segment_completed");
  const progressSegments = parseOptionalJsonPayload(
    req.body.progress_segments,
    "progress_segments"
  );

  if (endedAt && correct + review !== total) {
    throw createHttpError(400, "correct + review phai bang total");
  }

  const connection = await pool.getConnection();
  let session;

  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO study_sessions
        (
          user_id,
          deck_id,
          mode,
          direction,
          only_favorite,
          random_order,
          started_at,
          ended_at,
          duration_seconds,
          total,
          correct,
          review,
          xp_earned,
          max_combo,
          segment_size,
          segment_total,
          segment_completed,
          progress_segments
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        deckId,
        mode,
        direction,
        onlyFavorite,
        randomOrder,
        startedAt || new Date(),
        endedAt,
        durationSeconds,
        total,
        correct,
        review,
        xpEarned,
        maxCombo,
        segmentSize,
        segmentTotal,
        segmentCompleted,
        progressSegments,
      ]
    );

    session = await findSessionById(result.insertId, connection);

    if (endedAt && userId && correct > 0) {
      await updateUserStreak(connection, userId, {
        xpEarned,
        cardsReviewed: total,
      });
      await updateDeckStreak(connection, deckId, userId);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.status(201).json(session);
}

async function finishStudySession(req, res) {
  const sessionId = parsePositiveInt(req.params.sessionId, "sessionId");
  const correct = parseCount(req.body.correct, "correct");
  const review = parseCount(req.body.review, "review");
  const total = parseCount(req.body.total, "total");
  const maxCombo = parseCount(req.body.max_combo, "max_combo");
  const durationSeconds = parseCount(
    req.body.duration_seconds ?? req.body.durationSeconds,
    "duration_seconds"
  );
  const segmentSize = parseCount(req.body.segment_size, "segment_size");
  const segmentTotal = parseCount(req.body.segment_total, "segment_total");
  const segmentCompleted = parseCount(req.body.segment_completed, "segment_completed");
  const progressSegments = parseOptionalJsonPayload(
    req.body.progress_segments,
    "progress_segments"
  );

  if (correct + review !== total) {
    throw createHttpError(400, "correct + review phai bang total");
  }

  const userId = currentUserId(req);
  const connection = await pool.getConnection();
  let session;

  try {
    await connection.beginTransaction();
    const current = await findSessionById(sessionId, connection, { lock: true });

    if (!current) {
      throw createHttpError(404, "Khong tim thay phien hoc");
    }

    assertSessionOwner(current, userId);

    // A retry after a lost response must not add XP/streak a second time.
    if (current.ended_at) {
      await connection.commit();
      res.json(current);
      return;
    }

    const xpEarned = correct * (current.mode === "review" ? 5 : 10);

    await connection.execute(
      `UPDATE study_sessions
       SET ended_at = CURRENT_TIMESTAMP,
           correct = ?,
           review = ?,
           total = ?,
           duration_seconds = CASE
             WHEN ? > 0 THEN ?
             ELSE GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP))
           END,
           xp_earned = ?,
           max_combo = ?,
           segment_size = ?,
           segment_total = ?,
           segment_completed = ?,
           progress_segments = ?
       WHERE id = ?`,
      [
        correct,
        review,
        total,
        durationSeconds,
        durationSeconds,
        xpEarned,
        maxCombo,
        segmentSize,
        segmentTotal,
        segmentCompleted,
        progressSegments,
        sessionId,
      ]
    );

    session = await findSessionById(sessionId, connection);

    if (userId && correct > 0) {
      await updateUserStreak(connection, userId, {
        xpEarned,
        cardsReviewed: total,
      });
      await updateDeckStreak(connection, session.deck_id, userId);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.json(session);
}

async function listStudySessions(req, res) {
  const userId = currentUserId(req);
  if (!userId) {
    throw createHttpError(401, "Can dang nhap");
  }

  const conditions = ["ss.user_id = ?"];
  const params = [userId];
  const mode = cleanText(req.query.mode);

  if (mode) {
    if (!VALID_MODES.has(mode)) {
      throw createHttpError(400, "mode khong hop le");
    }
    conditions.push("ss.mode = ?");
    params.push(mode);
  }

  if (req.query.deckId || req.query.deck_id) {
    conditions.push("ss.deck_id = ?");
    params.push(parsePositiveInt(req.query.deckId ?? req.query.deck_id, "deckId"));
  }

  if (req.query.from) {
    conditions.push(
      "DATE(CONVERT_TZ(COALESCE(ss.ended_at, ss.started_at), '+00:00', '+07:00')) >= ?"
    );
    params.push(cleanText(req.query.from));
  }

  if (req.query.to) {
    conditions.push(
      "DATE(CONVERT_TZ(COALESCE(ss.ended_at, ss.started_at), '+00:00', '+07:00')) <= ?"
    );
    params.push(cleanText(req.query.to));
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ss.*, d.title AS deck_title
     FROM study_sessions ss
     LEFT JOIN decks d ON d.id = ss.deck_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY COALESCE(ss.ended_at, ss.started_at) DESC, ss.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json(rows.map(normalizeSession));
}

async function getStudySessionsSummary(req, res) {
  const userId = currentUserId(req);
  if (!userId) {
    throw createHttpError(401, "Can dang nhap");
  }

  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(*) AS total_sessions,
       COALESCE(SUM(total), 0) AS total_cards_studied,
       COALESCE(SUM(correct), 0) AS total_correct,
       COALESCE(SUM(review), 0) AS total_wrong,
       COALESCE(SUM(
         CASE
           WHEN duration_seconds > 0 THEN duration_seconds
           WHEN ended_at IS NOT NULL THEN GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at))
           ELSE 0
         END
       ), 0) AS total_duration_seconds,
       COALESCE(SUM(xp_earned), 0) AS total_xp_earned
     FROM study_sessions
     WHERE user_id = ?`,
    [userId]
  );

  const summary = summaryRows[0] || {};
  const totalCards = Number(summary.total_cards_studied || 0);
  const totalCorrect = Number(summary.total_correct || 0);

  const [activityRows] = await pool.query(
    `SELECT
       DATE(CONVERT_TZ(COALESCE(ended_at, started_at), '+00:00', '+07:00')) AS study_date,
       COUNT(*) AS session_count,
       COALESCE(SUM(total), 0) AS cards_studied,
       COALESCE(SUM(correct), 0) AS correct_count,
       COALESCE(SUM(review), 0) AS wrong_count,
       COALESCE(SUM(
         CASE
           WHEN duration_seconds > 0 THEN duration_seconds
           WHEN ended_at IS NOT NULL THEN GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at))
           ELSE 0
         END
       ), 0) AS duration_seconds
     FROM study_sessions
     WHERE user_id = ?
       AND DATE(CONVERT_TZ(COALESCE(ended_at, started_at), '+00:00', '+07:00')) >=
           DATE_SUB(DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')), INTERVAL 6 DAY)
     GROUP BY DATE(CONVERT_TZ(COALESCE(ended_at, started_at), '+00:00', '+07:00'))
     ORDER BY study_date ASC`,
    [userId]
  );

  const [modeRows] = await pool.query(
    `SELECT
       mode,
       COUNT(*) AS session_count,
       COALESCE(SUM(total), 0) AS cards_studied,
       COALESCE(SUM(correct), 0) AS correct_count,
       COALESCE(SUM(review), 0) AS wrong_count
     FROM study_sessions
     WHERE user_id = ?
     GROUP BY mode
     ORDER BY mode ASC`,
    [userId]
  );

  const [recentRows] = await pool.query(
    `SELECT ss.*, d.title AS deck_title
     FROM study_sessions ss
     LEFT JOIN decks d ON d.id = ss.deck_id
     WHERE ss.user_id = ?
     ORDER BY COALESCE(ss.ended_at, ss.started_at) DESC, ss.id DESC
     LIMIT 8`,
    [userId]
  );

  res.json({
    total_sessions: Number(summary.total_sessions || 0),
    total_cards_studied: totalCards,
    average_accuracy:
      totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
    total_duration_seconds: Number(summary.total_duration_seconds || 0),
    total_xp_earned: Number(summary.total_xp_earned || 0),
    last_7_days_activity: activityRows.map((row) => ({
      date: row.study_date,
      session_count: Number(row.session_count || 0),
      cards_studied: Number(row.cards_studied || 0),
      correct_count: Number(row.correct_count || 0),
      wrong_count: Number(row.wrong_count || 0),
      duration_seconds: Number(row.duration_seconds || 0),
    })),
    mode_breakdown: modeRows.map((row) => ({
      mode: row.mode,
      session_count: Number(row.session_count || 0),
      cards_studied: Number(row.cards_studied || 0),
      correct_count: Number(row.correct_count || 0),
      wrong_count: Number(row.wrong_count || 0),
      accuracy:
        Number(row.cards_studied || 0) > 0
          ? Math.round((Number(row.correct_count || 0) / Number(row.cards_studied || 0)) * 100)
          : 0,
    })),
    recent_sessions: recentRows.map(normalizeSession),
  });
}

async function addStudyAnswers(req, res) {
  const sessionId = parsePositiveInt(req.params.sessionId, "sessionId");
  const inputAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];

  if (inputAnswers.length === 0) {
    throw createHttpError(400, "answers la bat buoc");
  }

  if (inputAnswers.length > 500) {
    throw createHttpError(400, "answers khong duoc vuot qua 500 phan tu");
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
      const answerMeta = parseOptionalJsonPayload(answer.answer_meta, "answer_meta");

      const [existingAnswers] = await connection.query(
        `SELECT id
         FROM study_answers
         WHERE session_id = ? AND card_id = ?
         LIMIT 1`,
        [sessionId, cardId]
      );

      if (existingAnswers[0]) {
        insertedIds.push(existingAnswers[0].id);
        continue;
      }

      try {
        const [result] = await connection.execute(
          `INSERT INTO study_answers
            (
              session_id,
              card_id,
              question_text,
              correct_answer,
              user_answer,
              is_correct,
              answer_meta
            )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            cardId,
            questionText,
            correctAnswer,
            userAnswer,
            isCorrect,
            answerMeta,
          ]
        );

        insertedIds.push(result.insertId);
        await updateProgressFromAnswer(connection, {
          userId: session.user_id,
          cardId,
          isCorrect,
        });
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;

        const [duplicateRows] = await connection.query(
          `SELECT id
           FROM study_answers
           WHERE session_id = ? AND card_id = ?
           LIMIT 1`,
          [sessionId, cardId]
        );
        if (duplicateRows[0]) insertedIds.push(duplicateRows[0].id);
      }
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
  const progressSegments = parseOptionalJsonPayload(
    req.body.progress_segments,
    "progress_segments"
  );

  if (correct + review !== total) {
    throw createHttpError(400, "correct + review phai bang total");
  }

  if (userId === null) {
    res.json(
      createUnsavedQuizResult({
        userId,
        deckId,
        questionType,
        direction,
        correct,
        review,
        total,
        progressSegments: progressSegments ? JSON.parse(progressSegments) : null,
      })
    );
    return;
  }

  const [result] = await pool.execute(
    `INSERT INTO quiz_results
      (
        user_id,
        deck_id,
        question_type,
        direction,
        correct,
        review,
        total,
        progress_segments
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      deckId,
      questionType,
      direction,
      correct,
      review,
      total,
      progressSegments,
    ]
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

  if (userId === null) {
    res.json(null);
    return;
  }

  const [rows] = await pool.query(
    `SELECT *
     FROM quiz_results
     WHERE deck_id = ? AND user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [deckId, userId]
  );

  res.json(normalizeQuizResult(rows[0]));
}

module.exports = {
  listStudySessions,
  getStudySessionsSummary,
  createStudySession,
  finishStudySession,
  addStudyAnswers,
  createQuizResult,
  getLatestQuizResult,
};
