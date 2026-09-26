const pool = require("../config/db");
const aiService = require("../services/aiService");
const { cleanTextWithLimit, createHttpError, parsePositiveInt } = require("../utils/http");
const { chuanHoaTraLoi, laTraLoiDung } = require("../utils/khoaHoc");

// Khoá học riêng (tài liệu cá nhân): chỉ chủ khoá (courses.user_id) đọc được.
// Mọi truy vấn đều lọc theo user trong token; khoá của người khác trả 404 như không tồn tại.

const MAX_ANSWER_LENGTH = 200;

// mysql2 trả cột JSON đã parse; phòng trường hợp driver trả chuỗi
function docJson(value, macDinh) {
  if (value === null || value === undefined) return macDinh;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return macDinh;
  }
}

function normalizeQuestion(row) {
  return {
    id: row.id,
    source: row.source,
    section: row.section,
    type: row.type,
    instruction: row.instruction || null,
    prompt: row.prompt,
    options: docJson(row.options, null),
    answer_key: row.answer_key || null,
    accepted_answers: docJson(row.accepted_answers, null),
    explanation: row.explanation || null,
    answer_source: row.answer_source || null,
    image_description: row.image_description || null,
  };
}

async function listCourses(req, res) {
  const [rows] = await pool.query(
    `SELECT
       c.id AS course_id,
       c.slug,
       c.title AS course_title,
       c.description,
       l.lesson_number,
       l.title AS lesson_title,
       (SELECT COUNT(*) FROM course_questions q WHERE q.lesson_id = l.id) AS question_count,
       (SELECT COUNT(*) FROM cards cd WHERE cd.deck_id = l.deck_id) AS word_count
     FROM courses c
     LEFT JOIN course_lessons l ON l.course_id = c.id
     WHERE c.user_id = ?
     ORDER BY c.id ASC, l.lesson_number ASC`,
    [req.user.id]
  );

  const courses = new Map();
  for (const row of rows) {
    if (!courses.has(row.course_id)) {
      courses.set(row.course_id, {
        id: row.course_id,
        slug: row.slug,
        title: row.course_title,
        description: row.description || "",
        lessons: [],
      });
    }
    if (row.lesson_number !== null) {
      courses.get(row.course_id).lessons.push({
        lesson_number: row.lesson_number,
        title: row.lesson_title,
        question_count: Number(row.question_count || 0),
        word_count: Number(row.word_count || 0),
      });
    }
  }

  res.json([...courses.values()]);
}

async function getLesson(req, res) {
  const courseId = parsePositiveInt(req.params.courseId, "courseId");
  const lessonNumber = parsePositiveInt(req.params.lessonNumber, "lessonNumber");

  const [lessons] = await pool.query(
    `SELECT l.id, l.lesson_number, l.title, l.deck_id, l.content, c.id AS course_id, c.title AS course_title
     FROM course_lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.course_id = ? AND l.lesson_number = ? AND c.user_id = ?
     LIMIT 1`,
    [courseId, lessonNumber, req.user.id]
  );
  const lesson = lessons[0];
  if (!lesson) {
    throw createHttpError(404, "Khong tim thay bai hoc");
  }

  const [[questions], [words], [cacBai]] = await Promise.all([
    pool.query("SELECT * FROM course_questions WHERE lesson_id = ? ORDER BY sort_order ASC, id ASC", [
      lesson.id,
    ]),
    pool.query(
      `SELECT id, term_en, meaning_vi, pronunciation, part_of_speech
       FROM cards
       WHERE deck_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [lesson.deck_id]
    ),
    pool.query("SELECT lesson_number FROM course_lessons WHERE course_id = ? ORDER BY lesson_number ASC", [
      courseId,
    ]),
  ]);

  const soBai = cacBai.map((row) => row.lesson_number);
  const viTri = soBai.indexOf(lesson.lesson_number);

  res.json({
    course: { id: lesson.course_id, title: lesson.course_title },
    lesson: {
      id: lesson.id,
      lesson_number: lesson.lesson_number,
      title: lesson.title,
      deck_id: lesson.deck_id,
      content: docJson(lesson.content, { grammar: [], notes: [] }),
    },
    words,
    questions: questions.map(normalizeQuestion),
    prev_lesson: viTri > 0 ? soBai[viTri - 1] : null,
    next_lesson: viTri >= 0 && viTri < soBai.length - 1 ? soBai[viTri + 1] : null,
  });
}

async function explainQuestion(req, res) {
  const questionId = parsePositiveInt(req.params.questionId, "questionId");
  const answer = cleanTextWithLimit(req.body?.answer, MAX_ANSWER_LENGTH, "answer");
  if (!answer) {
    throw createHttpError(400, "answer la bat buoc");
  }

  // Đề, đáp án và kiến thức của bài đều đọc lại từ DB, không tin nội dung client gửi
  const [rows] = await pool.query(
    `SELECT q.*, l.title AS lesson_title, l.content AS lesson_content
     FROM course_questions q
     JOIN course_lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE q.id = ? AND c.user_id = ?
     LIMIT 1`,
    [questionId, req.user.id]
  );
  const row = rows[0];
  if (!row) {
    throw createHttpError(404, "Khong tim thay cau hoi");
  }

  const question = normalizeQuestion(row);
  const isMultipleChoice = question.type === "multiple_choice";
  const answerNorm = isMultipleChoice ? answer.toUpperCase() : chuanHoaTraLoi(answer);
  if (isMultipleChoice && !(question.options || []).some((option) => option.key === answerNorm)) {
    throw createHttpError(400, "Lua chon khong hop le");
  }
  if (!answerNorm) {
    throw createHttpError(400, "answer la bat buoc");
  }

  const [cached] = await pool.query(
    "SELECT explanation FROM course_question_explanations WHERE question_id = ? AND answer_norm = ? LIMIT 1",
    [questionId, answerNorm]
  );
  if (cached[0]) {
    res.json({ explanation: cached[0].explanation, cached: true });
    return;
  }

  let explanation;
  try {
    explanation = await aiService.explainCourseQuestion({
      lessonTitle: row.lesson_title,
      grammar: docJson(row.lesson_content, {}).grammar || [],
      question,
      learnerAnswer: isMultipleChoice ? answerNorm : answer,
      isCorrect: laTraLoiDung(question, answerNorm),
    });
  } catch (error) {
    console.error("explainCourseQuestion failed:", error.message);
    throw createHttpError(502, "AI chua giai thich duoc, thu lai sau");
  }
  if (!explanation) {
    throw createHttpError(502, "AI chua giai thich duoc, thu lai sau");
  }

  await pool.query(
    "INSERT IGNORE INTO course_question_explanations (question_id, answer_norm, explanation) VALUES (?, ?, ?)",
    [questionId, answerNorm, explanation]
  );
  res.json({ explanation, cached: false });
}

module.exports = {
  listCourses,
  getLesson,
  explainQuestion,
};
