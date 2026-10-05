const pool = require("../config/db");
const aiService = require("../services/aiService");
const audioStorage = require("../services/audioStorage");
const { pipeline } = require("node:stream/promises");
const { cleanTextWithLimit, createHttpError, parsePositiveInt } = require("../utils/http");
const {
  cacTraLoiCanGiaiThich,
  chuanHoaTraLoi,
  laTraLoiDung,
  lichOnCauHoi,
  locGiaiThichHopLe,
} = require("../utils/khoaHoc");

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
    // Bài nghe: file audio private (phát qua GET /course-questions/:id/audio) hoặc lời thoại để trình duyệt đọc
    // audio_key: nhiều câu dùng chung một file; client dùng để khỏi tải lại
    audio_key: row.audio_path || null,
    listen_text: row.listen_text || null,
    // Kết quả lần trả lời gần nhất của người học: null = chưa làm
    last_correct:
      row.last_correct === null || row.last_correct === undefined ? null : Boolean(row.last_correct),
  };
}

function soNguyen(value) {
  return Number(value || 0);
}

// Tiến độ mỗi buổi của chủ khoá: từ "đã học" = có card_progress, "đã thuộc" = Lv5 (giống lộ trình);
// câu "đúng" = lần trả lời gần nhất đúng. Câu luyện thêm (source = 'extra', AI sinh) là tuỳ chọn,
// không tính vào tiến độ buổi.
async function listCourses(req, res) {
  const [rows] = await pool.query(
    `SELECT
       c.id AS course_id,
       c.slug,
       c.title AS course_title,
       c.description,
       l.lesson_number,
       l.title AS lesson_title,
       l.deck_id,
       (SELECT COUNT(*) FROM course_questions q WHERE q.lesson_id = l.id AND q.source <> 'extra') AS question_count,
       (SELECT COUNT(*) FROM cards cd WHERE cd.deck_id = l.deck_id) AS word_count,
       (SELECT COUNT(*)
        FROM cards cd
        JOIN card_progress cp ON cp.card_id = cd.id AND cp.user_id = c.user_id
        WHERE cd.deck_id = l.deck_id) AS learned_count,
       (SELECT COUNT(*)
        FROM cards cd
        JOIN card_progress cp ON cp.card_id = cd.id AND cp.user_id = c.user_id
        WHERE cd.deck_id = l.deck_id AND cp.mastery_level >= 5) AS mastered_count,
       (SELECT COUNT(*)
        FROM course_questions q
        JOIN course_question_progress p ON p.question_id = q.id AND p.user_id = c.user_id
        WHERE q.lesson_id = l.id AND q.source <> 'extra') AS answered_count,
       (SELECT COUNT(*)
        FROM course_questions q
        JOIN course_question_progress p ON p.question_id = q.id AND p.user_id = c.user_id
        WHERE q.lesson_id = l.id AND q.source <> 'extra' AND p.is_correct = TRUE) AS correct_count,
       -- Câu đến hạn ôn (kể cả câu luyện thêm): từng làm sai, tới lịch ôn lại
       (SELECT COUNT(*)
        FROM course_questions q
        JOIN course_question_progress p ON p.question_id = q.id AND p.user_id = c.user_id
        WHERE q.lesson_id = l.id AND p.next_review_at <= CURRENT_TIMESTAMP) AS due_count
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
        // Bộ từ vựng riêng của buổi (trang Từ vựng → tab Theo buổi mở thẳng bộ này)
        deck_id: row.deck_id ?? null,
        question_count: soNguyen(row.question_count),
        word_count: soNguyen(row.word_count),
        learned_count: soNguyen(row.learned_count),
        mastered_count: soNguyen(row.mastered_count),
        answered_count: soNguyen(row.answered_count),
        correct_count: soNguyen(row.correct_count),
        due_count: soNguyen(row.due_count),
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
    pool.query(
      `SELECT q.*, p.is_correct AS last_correct
       FROM course_questions q
       LEFT JOIN course_question_progress p ON p.question_id = q.id AND p.user_id = ?
       WHERE q.lesson_id = ?
       ORDER BY q.sort_order ASC, q.id ASC`,
      [req.user.id, lesson.id]
    ),
    pool.query(
      `SELECT c.id, c.term_en, c.meaning_vi, c.pronunciation, c.part_of_speech, cp.mastery_level
       FROM cards c
       LEFT JOIN card_progress cp ON cp.card_id = c.id AND cp.user_id = ?
       WHERE c.deck_id = ?
       ORDER BY c.sort_order ASC, c.id ASC`,
      [req.user.id, lesson.deck_id]
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

/**
 * Đọc câu hỏi (của khoá thuộc người dùng) và câu trả lời người học gửi lên, đã chuẩn hoá.
 * Đề, đáp án và kiến thức của bài đều đọc lại từ DB, không tin nội dung client gửi.
 */
async function docCauTraLoi(req) {
  const questionId = parsePositiveInt(req.params.questionId, "questionId");
  const answer = cleanTextWithLimit(req.body?.answer, MAX_ANSWER_LENGTH, "answer");
  if (!answer) {
    throw createHttpError(400, "answer la bat buoc");
  }

  const { row, question } = await docCauCuaChuKhoa(questionId, req.user.id);
  const isMultipleChoice = question.type === "multiple_choice";
  const answerNorm = isMultipleChoice ? answer.toUpperCase() : chuanHoaTraLoi(answer);
  if (isMultipleChoice && !(question.options || []).some((option) => option.key === answerNorm)) {
    throw createHttpError(400, "Lua chon khong hop le");
  }
  if (!answerNorm) {
    throw createHttpError(400, "answer la bat buoc");
  }

  return { questionId, answer, row, question, isMultipleChoice, answerNorm };
}

// Câu bài tập (kèm bài học) nếu thuộc khoá của userId, không thì 404
async function docCauCuaChuKhoa(questionId, userId) {
  const [rows] = await pool.query(
    `SELECT q.*, l.title AS lesson_title, l.content AS lesson_content
     FROM course_questions q
     JOIN course_lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE q.id = ? AND c.user_id = ?
     LIMIT 1`,
    [questionId, userId]
  );
  const row = rows[0];
  if (!row) {
    throw createHttpError(404, "Khong tim thay cau hoi");
  }
  return { row, question: normalizeQuestion(row) };
}

// Ghi kết quả lần trả lời gần nhất (server tự chấm) + lịch ôn SRS nếu câu từng làm sai
async function answerQuestion(req, res) {
  const { questionId, question, answerNorm } = await docCauTraLoi(req);
  const correct = laTraLoiDung(question, answerNorm);

  const [hienTai] = await pool.query(
    `SELECT mastery_level, next_review_at
     FROM course_question_progress
     WHERE user_id = ? AND question_id = ?
     LIMIT 1`,
    [req.user.id, questionId]
  );
  const lich = lichOnCauHoi(hienTai[0], correct);

  await pool.query(
    `INSERT INTO course_question_progress (user_id, question_id, is_correct, mastery_level, next_review_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       is_correct = VALUES(is_correct),
       mastery_level = VALUES(mastery_level),
       next_review_at = VALUES(next_review_at)`,
    [req.user.id, questionId, correct, lich.level, lich.nextReviewAt]
  );
  res.json({ correct, mastery_level: lich.level, next_review_at: lich.nextReviewAt });
}

const SO_CAU_ON_TOI_DA = 100;

// Câu bài tập đến hạn ôn của mọi khoá thuộc người dùng, câu đến hạn sớm nhất trước
async function listDueQuestions(req, res) {
  const [rows] = await pool.query(
    `SELECT q.*, p.is_correct AS last_correct, l.lesson_number, c.id AS course_id
     FROM course_question_progress p
     JOIN course_questions q ON q.id = p.question_id
     JOIN course_lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE p.user_id = ? AND c.user_id = ? AND p.next_review_at <= CURRENT_TIMESTAMP
     ORDER BY p.next_review_at ASC, l.lesson_number ASC, q.sort_order ASC
     LIMIT ${SO_CAU_ON_TOI_DA}`,
    [req.user.id, req.user.id]
  );

  res.json(
    rows.map((row) => ({
      ...normalizeQuestion(row),
      lesson_number: row.lesson_number,
      course_id: row.course_id,
    }))
  );
}

// Phát file audio của câu bài nghe; chỉ chủ khoá, object Cloud Storage không bao giờ public
async function getQuestionAudio(req, res) {
  const questionId = parsePositiveInt(req.params.questionId, "questionId");
  const [rows] = await pool.query(
    `SELECT q.audio_path, c.slug
     FROM course_questions q
     JOIN course_lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE q.id = ? AND c.user_id = ?
     LIMIT 1`,
    [questionId, req.user.id]
  );
  const row = rows[0];
  if (!row || !row.audio_path) {
    throw createHttpError(404, "Khong tim thay audio");
  }

  const audio = await audioStorage.moAudio(audioStorage.tenObjectAudio(row.slug, row.audio_path));
  if (!audio) {
    throw createHttpError(404, "Khong tim thay audio");
  }
  res.set({
    "Content-Type": audio.contentType,
    // File không đổi theo thời gian; private để proxy/CDN không lưu nội dung riêng tư
    "Cache-Control": "private, max-age=86400",
    ...(audio.size ? { "Content-Length": String(audio.size) } : {}),
  });
  await pipeline(audio.stream, res);
}

// ---- Soạn trước lời giải thích (câu hỏi vừa hiện, người học còn đang đọc đề) ----
// questionId → Promise đang soạn; câu trả lời đến giữa lúc soạn thì chờ promise này, không gọi AI lần hai.
// Chỉ trong một instance (Cloud Run nhiều instance thì có thể trùng, chấp nhận được).
const dangSoanTruoc = new Map();

function nguCanhAI(row, question) {
  return {
    lessonTitle: row.lesson_title,
    grammar: docJson(row.lesson_content, {}).grammar || [],
    question,
  };
}

/** Soạn và lưu lời giải thích cho mọi câu trả lời còn thiếu của câu hỏi; trả về số lời mới. */
function soanTruocGiaiThich(questionId, row, question) {
  if (dangSoanTruoc.has(questionId)) return dangSoanTruoc.get(questionId);

  const viec = (async () => {
    const [daCo] = await pool.query(
      "SELECT answer_norm FROM course_question_explanations WHERE question_id = ?",
      [questionId]
    );
    const coRoi = new Set(daCo.map((dong) => dong.answer_norm));
    if (cacTraLoiCanGiaiThich(question).every((traLoi) => coRoi.has(traLoi.answerNorm))) return 0;

    const items = await aiService.explainAllAnswers(nguCanhAI(row, question));
    const { hopLe } = locGiaiThichHopLe(
      items.map((item) => ({ ...item, question_id: String(questionId) })),
      new Map([[String(questionId), question]])
    );
    let soMoi = 0;
    for (const muc of hopLe) {
      if (coRoi.has(muc.answerNorm)) continue;
      coRoi.add(muc.answerNorm);
      await pool.query(
        "INSERT IGNORE INTO course_question_explanations (question_id, answer_norm, explanation) VALUES (?, ?, ?)",
        [questionId, muc.answerNorm, muc.explanation]
      );
      soMoi += 1;
    }
    return soMoi;
  })().finally(() => dangSoanTruoc.delete(questionId));

  dangSoanTruoc.set(questionId, viec);
  return viec;
}

// POST /course-questions/:id/prepare — gọi khi câu hỏi hiện ra; lỗi AI không làm hỏng việc học
async function prepareQuestion(req, res) {
  const questionId = parsePositiveInt(req.params.questionId, "questionId");
  const { row, question } = await docCauCuaChuKhoa(questionId, req.user.id);
  try {
    const generated = await soanTruocGiaiThich(questionId, row, question);
    res.json({ ready: true, generated });
  } catch (error) {
    console.error("prepareQuestion failed:", error.message);
    res.json({ ready: false, generated: 0 });
  }
}

async function docGiaiThichDaLuu(questionId, answerNorm) {
  const [cached] = await pool.query(
    "SELECT explanation FROM course_question_explanations WHERE question_id = ? AND answer_norm = ? LIMIT 1",
    [questionId, answerNorm]
  );
  return cached[0]?.explanation || null;
}

async function explainQuestion(req, res) {
  const { questionId, answer, row, question, isMultipleChoice, answerNorm } = await docCauTraLoi(req);

  let daLuu = await docGiaiThichDaLuu(questionId, answerNorm);
  // Đang soạn trước cho câu này (người học trả lời nhanh hơn AI): chờ nó xong rồi đọc lại cache
  if (!daLuu && dangSoanTruoc.has(questionId)) {
    await dangSoanTruoc.get(questionId).catch(() => {});
    daLuu = await docGiaiThichDaLuu(questionId, answerNorm);
  }
  // ?stream=1: trả chữ thuần, gửi dần từng đoạn ngay khi AI viết ra (người học thấy chữ sau ~1s).
  // Header chỉ gửi khi đã có chữ đầu tiên, để lỗi trước đó vẫn trả được mã lỗi đúng.
  const guiDan = req.query?.stream === "1";
  let daMoLuong = false;
  function moLuong() {
    if (daMoLuong) return;
    daMoLuong = true;
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    });
  }
  function traVe(explanation, extra) {
    if (!guiDan) {
      res.json({ explanation, ...extra });
      return;
    }
    moLuong();
    res.end(explanation);
  }

  if (daLuu) {
    traVe(daLuu, { cached: true });
    return;
  }

  let explanation;
  try {
    explanation = await aiService.explainCourseQuestion(
      {
        ...nguCanhAI(row, question),
        learnerAnswer: isMultipleChoice ? answerNorm : answer,
        isCorrect: laTraLoiDung(question, answerNorm),
      },
      guiDan
        ? {
            onChunk: (doan) => {
              moLuong();
              res.write(doan);
            },
          }
        : {}
    );
  } catch (error) {
    console.error("explainCourseQuestion failed:", error.message);
    if (daMoLuong) {
      // Đã gửi một phần chữ: kết thúc luồng, không lưu cache bản dở
      res.end();
      return;
    }
    // AI lỗi/quá hạn: dùng gợi ý có sẵn của câu hỏi (không lưu cache để lần sau vẫn thử AI)
    if (question.explanation) {
      traVe(question.explanation, { cached: false, fallback: true });
      return;
    }
    throw createHttpError(502, "AI chua giai thich duoc, thu lai sau");
  }
  if (!explanation) {
    if (daMoLuong) {
      res.end();
      return;
    }
    throw createHttpError(502, "AI chua giai thich duoc, thu lai sau");
  }

  await pool.query(
    "INSERT IGNORE INTO course_question_explanations (question_id, answer_norm, explanation) VALUES (?, ?, ?)",
    [questionId, answerNorm, explanation]
  );
  if (guiDan) {
    res.end();
    return;
  }
  res.json({ explanation, cached: false });
}

module.exports = {
  listCourses,
  getLesson,
  answerQuestion,
  listDueQuestions,
  getQuestionAudio,
  explainQuestion,
  prepareQuestion,
};
