/**
 * ganMucLyThuyet — gắn câu bài tập của buổi với mục lý thuyết (course_questions.grammar_id), chạy nền
 * khi người học mở buổi. Buổi chỉ có 1 mục: gắn thẳng, không gọi AI. Nhiều mục: AI gắn một lần rồi lưu.
 * Cột grammar_id chưa có (chưa chạy SQL trên Supabase) thì bỏ qua, buổi học vẫn chạy như cũ.
 */
const pool = require("../config/db");
const aiService = require("./aiService");

const dangGan = new Set();
// Gắn lỗi (AI quá tải...) thì chờ một lúc mới thử lại cho buổi đó
const thuLaiSau = new Map();
const CHO_THU_LAI_MS = 10 * 60 * 1000;
const SO_CAU_MOI_LUOT = 25;

function cauCanGan(questions) {
  return questions.filter((cau) => cau.source !== "extra" && !cau.grammar_id);
}

async function ghi(theoId) {
  for (const [id, ma] of theoId) {
    await pool.query("UPDATE course_questions SET grammar_id = ? WHERE id = ? AND grammar_id IS NULL", [ma, id]);
  }
}

async function gan(lesson, grammar, questions) {
  const chua = cauCanGan(questions);
  if (grammar.length === 1) {
    await ghi(new Map(chua.map((cau) => [cau.id, String(grammar[0].id)])));
    return;
  }
  for (let i = 0; i < chua.length; i += SO_CAU_MOI_LUOT) {
    const nhom = chua.slice(i, i + SO_CAU_MOI_LUOT);
    const ketQua = await aiService.mapQuestionsToGrammar({
      lessonTitle: lesson.title,
      grammar: grammar.map((muc) => ({ id: String(muc.id), title: muc.title, pattern: muc.pattern })),
      questions: nhom.map((cau) => ({
        id: cau.id,
        prompt: cau.prompt,
        options: Array.isArray(cau.options) ? cau.options : [],
        answer: cau.answer_key || (Array.isArray(cau.accepted_answers) ? cau.accepted_answers[0] : null),
      })),
    });
    await ghi(ketQua);
  }
}

/** Không chờ kết quả: lần mở buổi sau đã có liên kết. questions là dòng DB (có cột grammar_id nếu đã chạy SQL). */
function ganNenNeuCan(lesson, grammar, questions, now = Date.now()) {
  if (!questions.length || !("grammar_id" in questions[0])) return false;
  const cacMuc = (grammar || []).filter((muc) => muc && muc.id);
  if (cacMuc.length === 0 || cauCanGan(questions).length === 0) return false;
  if (dangGan.has(lesson.id) || (thuLaiSau.get(lesson.id) || 0) > now) return false;
  dangGan.add(lesson.id);
  gan(lesson, cacMuc, questions)
    .catch((error) => {
      thuLaiSau.set(lesson.id, Date.now() + CHO_THU_LAI_MS);
      console.warn(`[gan-muc-ly-thuyet] buoi ${lesson.id}: ${error.message}`);
    })
    .finally(() => dangGan.delete(lesson.id));
  return true;
}

module.exports = { ganNenNeuCan, cauCanGan };
