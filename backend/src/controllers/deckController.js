const pool = require("../config/db");
const {
  cleanNullableText,
  cleanNullableTextWithLimit,
  cleanText,
  cleanTextWithLimit,
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
    qr.created_at AS latest_quiz_created_at,
    rd.id AS roadmap_deck_id,
    r.slug AS roadmap_slug,
    r.title AS roadmap_title,
    cl.id AS course_lesson_id,
    cl.course_id AS course_id,
    cl.lesson_number AS course_lesson_number,
    cl.title AS course_lesson_title,
    co.title AS course_title
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
  LEFT JOIN roadmap_decks rd ON rd.deck_id = d.id
  LEFT JOIN roadmaps r ON r.id = rd.roadmap_id
  LEFT JOIN course_lessons cl ON cl.id = (
    SELECT MIN(lesson.id) FROM course_lessons lesson WHERE lesson.deck_id = d.id
  )
  LEFT JOIN courses co ON co.id = cl.course_id
`;
}

// Mỗi bộ từ thuộc đúng một nguồn, suy ra từ bảng nối (không lưu thêm cột):
// "course" = từ vựng một buổi của khoá học riêng, "roadmap" = chặng của lộ trình,
// "user" = bộ người dùng tự tạo, "sample" = bộ mẫu cũ (user_id NULL, ngoài lộ trình).
function nguonCuaBo(row) {
  if (row.course_lesson_id) return "course";
  if (row.roadmap_deck_id) return "roadmap";
  return row.user_id === null ? "sample" : "user";
}

function boChaCuaBo(row) {
  if (row.course_lesson_id) {
    return {
      course_id: row.course_id,
      course_title: row.course_title,
      lesson_number: row.course_lesson_number,
      lesson_title: row.course_lesson_title,
    };
  }
  if (row.roadmap_deck_id) {
    return { slug: row.roadmap_slug, title: row.roadmap_title };
  }
  return null;
}

function normalizeDeck(row) {
  if (!row) return null;

  const cardCount = Number(row.card_count || 0);

  return {
    id: row.id,
    user_id: row.user_id === null ? null : row.user_id,
    source: nguonCuaBo(row),
    parent: boChaCuaBo(row),
    title: row.title,
    description: row.description || "",
    icon: row.icon,
    theme_color: row.theme_color,
    is_public: Boolean(row.is_public),
    streak: row.streak || 0,
    mastered_count: row.mastered_count || 0,
    masteredCount: row.mastered_count || 0,
    card_count: cardCount,
    total_words: cardCount,
    totalWords: cardCount,
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
  return deck.user_id === null || deck.is_public || sameId(deck.user_id, userId);
}

function isDeckOwner(deck, userId) {
  return deck.user_id !== null && sameId(deck.user_id, userId);
}

// Bộ từ của khoá học do script nhập quản lý: sửa/xoá tay sẽ bị lần nhập sau ghi đè,
// xoá bộ còn mất luôn tiến độ SRS → chỉ đọc, kể cả với chủ khoá
function canWriteDeck(deck, userId) {
  return deck.source !== "course" && isDeckOwner(deck, userId);
}

function assertDeckReadable(deck, userId) {
  if (!canReadDeck(deck, userId)) {
    throw createHttpError(404, "Khong tim thay bo tu");
  }
}

function assertDeckWritable(deck, userId) {
  if (!isDeckOwner(deck, userId)) {
    throw createHttpError(403, "Chi co the sua bo tu cua ban");
  }
  if (!canWriteDeck(deck, userId)) {
    throw createHttpError(403, "Bo tu cua khoa hoc chi doc, khong sua duoc");
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

// Bộ từ thuộc lộ trình / khoá học chỉ hiện ở trang Khoá học, không lẫn vào "Bộ từ"
const KHONG_THUOC_LO_TRINH_HAY_KHOA_HOC = "rd.id IS NULL AND cl.id IS NULL";

// scope=learnable (trang Luyện tập): mọi bộ học được — nội dung chung (user_id NULL) và bộ của mình,
// xếp theo nhóm nguồn: bộ tự tạo, bộ mẫu, khoá học (theo buổi), lộ trình (theo chặng)
async function listLearnableDecks(req, res) {
  const userId = currentUserId(req);
  const [rows] = await pool.query(
    `${deckWithStatsSql()}
     WHERE d.user_id IS NULL OR d.user_id = ?
     ORDER BY
       CASE WHEN cl.id IS NOT NULL THEN 2 WHEN rd.id IS NOT NULL THEN 3 WHEN d.user_id IS NULL THEN 1 ELSE 0 END,
       cl.course_id, cl.lesson_number, r.sort_order, r.id, rd.sort_order,
       d.updated_at DESC, d.id DESC`,
    [userId, userId]
  );

  res.json(rows.map(normalizeDeck));
}

async function listDecks(req, res) {
  if (req.query?.scope === "learnable") {
    await listLearnableDecks(req, res);
    return;
  }

  const userId = currentUserId(req);

  if (userId === null) {
    const [rows] = await pool.query(
      `${deckWithStatsSql()}
       WHERE (d.user_id IS NULL OR d.is_public = TRUE) AND ${KHONG_THUOC_LO_TRINH_HAY_KHOA_HOC}
       ORDER BY d.updated_at DESC, d.created_at DESC, d.id DESC`,
      [userId]
    );

    res.json(rows.map(normalizeDeck));
    return;
  }

  // Đã đăng nhập: "Bộ từ" chỉ gồm bộ tự tạo của chính mình
  const [rows] = await pool.query(
    `${deckWithStatsSql()}
     WHERE d.user_id = ? AND ${KHONG_THUOC_LO_TRINH_HAY_KHOA_HOC}
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
  const title = cleanTextWithLimit(req.body.title ?? req.body.name, 255, "title");
  if (!title) {
    throw createHttpError(400, "title la bat buoc");
  }

  const userId = currentUserId(req);
  const description = cleanText(req.body.description);
  const icon = cleanNullableTextWithLimit(req.body.icon, 80, "icon");
  const themeColor = cleanNullableTextWithLimit(req.body.theme_color, 50, "theme_color");
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

  const title = cleanTextWithLimit(req.body.title ?? req.body.name, 255, "title");
  if (!title) {
    throw createHttpError(400, "title la bat buoc");
  }

  const description = cleanText(req.body.description);
  const icon =
    req.body.icon === undefined
      ? current.icon
      : cleanNullableTextWithLimit(req.body.icon, 80, "icon");
  const themeColor =
    req.body.theme_color === undefined
      ? current.theme_color
      : cleanNullableTextWithLimit(req.body.theme_color, 50, "theme_color");
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
  isDeckOwner,
  assertDeckReadable,
  assertDeckWritable,
};
