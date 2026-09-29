/**
 * aiService.js — Sinh 6 câu mẫu 6 thì dùng Google Gemini API.
 * Trả về mảng 6 phần tử:
 *   [{ tense, formula, sentence, highlight, translation }, ...]
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { chuanHoaTraLoi, laTraLoiDung } = require("../utils/khoaHoc");

const TENSES = [
  { key: "present_simple",     formula: "S + V(s/es)" },
  { key: "present_continuous", formula: "S + am/is/are + V-ing" },
  { key: "past_simple",        formula: "S + V2/V-ed" },
  { key: "past_continuous",    formula: "S + was/were + V-ing" },
  { key: "present_perfect",    formula: "S + have/has + V3" },
  { key: "future_simple",      formula: "S + will + V" },
];

function buildPrompt(termEn, meaningVi, partOfSpeech) {
  const posHint = partOfSpeech ? ` (${partOfSpeech})` : "";
  return `You write example sentences for an English flashcard app. The learner is a Vietnamese beginner (A0-A1 level).

Word: "${termEn}"${posHint}
Vietnamese meaning: "${meaningVi}"

Write exactly 6 sentences — one per tense. Every sentence must follow ALL of these rules:

LEVEL — A0-A1:
- Max 8 words per sentence
- Only the 1000 most common English words (think: Oxford 3000 core, level A1)
- Topics allowed: home, food, clothes, family, school, daily routine, weather, simple feelings, shopping

NATURALNESS — think of a real moment:
- Ask yourself: "When would a real person say this word in daily life?"
- Write THAT sentence. Do not make a generic drill sentence.
BAD  → "She wears a skirt every day."      (generic, forced)
GOOD → "That skirt looks nice on you."     (real, specific, natural)

BAD  → "I buy shoes every month."          (generic)
GOOD → "Those shoes are too small for me." (real moment, clear meaning)

HIGHLIGHT: the exact word form used in the sentence (inflected ok: "goes", "went").
TRANSLATION: natural Vietnamese. No English words. No duplicate words.

Return ONLY a raw JSON array (no markdown, no explanation):
[
  { "tense": "present_simple",     "formula": "S + V(s/es)",           "sentence": "...", "highlight": "...", "translation": "..." },
  { "tense": "present_continuous", "formula": "S + am/is/are + V-ing", "sentence": "...", "highlight": "...", "translation": "..." },
  { "tense": "past_simple",        "formula": "S + V2/V-ed",           "sentence": "...", "highlight": "...", "translation": "..." },
  { "tense": "past_continuous",    "formula": "S + was/were + V-ing",  "sentence": "...", "highlight": "...", "translation": "..." },
  { "tense": "present_perfect",    "formula": "S + have/has + V3",     "sentence": "...", "highlight": "...", "translation": "..." },
  { "tense": "future_simple",      "formula": "S + will + V",          "sentence": "...", "highlight": "...", "translation": "..." }
]`;
}

function parseResponse(text) {
  const clean = text.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Cannot parse AI response as JSON");
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length < 6) {
    throw new Error(`Expected 6 items, got ${parsed?.length}`);
  }

  return TENSES.map((t, i) => {
    const item = parsed.find((x) => x.tense === t.key) || parsed[i] || {};
    return {
      tense: t.key,
      formula: item.formula || t.formula,
      sentence: String(item.sentence || ""),
      highlight: String(item.highlight || ""),
      translation: String(item.translation || ""),
    };
  });
}

/**
 * Sinh 6 câu mẫu theo 6 thì cho một từ.
 * @param {string} termEn         — Từ tiếng Anh
 * @param {string} meaningVi      — Nghĩa tiếng Việt
 * @param {string} [partOfSpeech] — Loại từ (tùy chọn)
 * @returns {Promise<Array>}      — Mảng 6 objects { tense, formula, sentence, highlight, translation }
 */
async function generateTenseExamples(termEn, meaningVi, partOfSpeech = "") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

  const prompt = buildPrompt(termEn, meaningVi, partOfSpeech);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseResponse(text);
}

// ── Tạo từ vựng theo chủ đề / trích từ đoạn văn (giống luyentu) ─────────────────

const VOCAB_FIELD_LIMITS = {
  term_en: 255,
  pronunciation: 255,
  part_of_speech: 50,
  meaning_vi: 255,
  example_sentence: 500,
  note: 500,
};

function buildVocabularyPrompt({ topic, passage, count }) {
  const task = passage
    ? `Passage:
"""
${passage}
"""
Pick up to ${count} important English words or short phrases from this passage that a learner should study.
Use the meaning each word has IN THIS PASSAGE.`
    : `Topic: "${topic}"
Choose the ${count} most useful English words or short phrases for this topic, from common to less common.`;

  return `You create vocabulary for an English flashcard app. The learner speaks Vietnamese.

${task}

For each item return an object with exactly these keys:
- "term_en": the word or phrase in its base form (lowercase unless it is a proper noun)
- "pronunciation": IPA between slashes, e.g. "/ˈæp.əl/"
- "part_of_speech": one of noun, verb, adjective, adverb, phrase, preposition, conjunction, pronoun
- "meaning_vi": a short, natural Vietnamese meaning with full diacritics (max 60 characters)
- "example_sentence": one natural English sentence (max 15 words) that contains term_en or an inflected form of it
- "note": optional short Vietnamese note (synonym, antonym or usage); use "" if none

Do not repeat a word. Return ONLY a raw JSON array (no markdown, no explanation).`;
}

function parseVocabularyResponse(text, count) {
  const clean = String(text || "").replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Cannot parse AI response as JSON");
    parsed = JSON.parse(match[0]);
  }

  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.words) ? parsed.words : [];
  const seen = new Set();
  const words = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const word = {};
    for (const [field, limit] of Object.entries(VOCAB_FIELD_LIMITS)) {
      word[field] = String(item[field] ?? "").trim().slice(0, limit);
    }

    const key = word.term_en.toLowerCase();
    if (!word.term_en || !word.meaning_vi || seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= count) break;
  }

  return words;
}

/**
 * Tạo danh sách từ vựng theo chủ đề hoặc trích từ một đoạn văn.
 * @param {{ topic?: string, passage?: string, count: number }} options
 * @returns {Promise<Array<{ term_en, pronunciation, part_of_speech, meaning_vi, example_sentence, note }>>}
 */
async function generateVocabulary({ topic = "", passage = "", count }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

  const result = await model.generateContent(buildVocabularyPrompt({ topic, passage, count }));
  return parseVocabularyResponse(result.response.text(), count);
}

// ── Giải thích câu bài tập của khoá học riêng ───────────────────────────────────

function textOfOption(question, key) {
  return (question.options || []).find((option) => option.key === key)?.text || "";
}

/**
 * @param {{ lessonTitle: string, grammar: Array<{ title, pattern }>, question: object,
 *           learnerAnswer: string, isCorrect: boolean }} input — câu hỏi đọc từ DB
 */
function buildCourseExplanationPrompt({ lessonTitle, grammar, question, learnerAnswer, isCorrect }) {
  const isMultipleChoice = question.type === "multiple_choice";
  const focus = grammar
    .map((item) => `- ${item.title}${item.pattern ? `: ${item.pattern}` : ""}`)
    .join("\n");
  const options = isMultipleChoice
    ? question.options.map((option) => `${option.key}. ${option.text}`).join("\n")
    : "(Câu điền từ, người học tự gõ đáp án)";
  const correct = isMultipleChoice
    ? `${question.answer_key}. ${textOfOption(question, question.answer_key)}`
    : question.accepted_answers.join(" / ");
  const answer = isMultipleChoice
    ? `${learnerAnswer}. ${textOfOption(question, learnerAnswer)}`
    : `"${learnerAnswer}"`;

  return `Bạn là giáo viên tiếng Anh tận tâm cho người Việt mất gốc (trình độ A1–B1). Hãy giải thích một câu bài tập người học vừa làm.

Bài học: ${lessonTitle}
Kiến thức trọng tâm của bài:
${focus || "- (không có)"}

Câu hỏi:${question.instruction ? ` (${question.instruction})` : ""}
${question.prompt}
${question.listen_text ? `Lời thoại người học được nghe: ${question.listen_text}\n` : ""}Các lựa chọn:
${options}

Đáp án đúng: ${correct}
Người học trả lời: ${answer} → ${isCorrect ? "ĐÚNG" : "SAI"}
${question.explanation ? `Gợi ý có sẵn: ${question.explanation}\n` : ""}
Trả lời bằng tiếng Việt, thật ngắn (tối đa 60 từ), dễ hiểu với người mất gốc, viết ĐÚNG ${isCorrect ? "2" : "3"} dòng theo mẫu:
${isCorrect ? MAU_GIAI_THICH_DUNG : MAU_GIAI_THICH_SAI}
Được **in đậm** từ khoá; không dùng định dạng markdown khác, không lời chào, không chép lại đề bài.`;
}

const MAU_NHO = "Nhớ: <quy tắc hoặc công thức ngắn> — ví dụ: <1 câu tiếng Anh ngắn> (<nghĩa>)";
const MAU_GIAI_THICH_DUNG = `Đúng rồi: <1 câu vì sao đáp án này đúng>
${MAU_NHO}`;
const MAU_GIAI_THICH_SAI = `Sai vì: <1 câu vì sao câu trả lời của người học sai>
Đúng vì: <1 câu vì sao đáp án đúng là đúng>
${MAU_NHO}`;

// Model chính giống chatbot LearnBot (chất lượng hơn); quá tải (503) hoặc hết lượt thì dùng bản lite
const COURSE_EXPLANATION_MODELS = ["gemini-3.6-flash", "gemini-flash-lite-latest"];

// Giải thích lúc đang học cần nhanh (đo 2026-09-29): flash-lite ~1.3s và không "suy nghĩ";
// 3.6-flash mặc định có lúc quá tải 40s+, nên chỉ làm dự phòng với thinking "minimal" (~2s)
const MODEL_GIAI_THICH_NHANH = [
  { model: "gemini-flash-lite-latest" },
  { model: "gemini-3.6-flash", generationConfig: { thinkingConfig: { thinkingLevel: "minimal" } } },
];
// Tạo sẵn hàng loạt (scripts/sinh-giai-thich.js): cùng thứ tự với khi học — flash-lite chất lượng đủ tốt,
// nhanh hơn ~5 lần, và 3.6-flash có hạn mức theo ngày thấp (hết 429 sau ~80 lượt ngày 2026-09-29)
const MODEL_GIAI_THICH_SINH_SAN = MODEL_GIAI_THICH_NHANH;
const THOI_HAN_GIAI_THICH_MS = 8000;
const TOKEN_GIAI_THICH_TOI_DA = 260;

/**
 * Giải thích một câu bài tập. onChunk (tuỳ chọn): nhận từng đoạn chữ ngay khi AI viết ra.
 * Mỗi model chờ tối đa THOI_HAN_GIAI_THICH_MS; chỉ chuyển model khi chưa gửi chữ nào đi.
 */
async function explainCourseQuestion(input, { onChunk, models = MODEL_GIAI_THICH_NHANH } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildCourseExplanationPrompt(input);
  let lastError;

  for (const { model: modelName, generationConfig = {} } of models) {
    let daGui = false;
    try {
      const model = genAI.getGenerativeModel(
        { model: modelName, generationConfig: { maxOutputTokens: TOKEN_GIAI_THICH_TOI_DA, ...generationConfig } },
        { timeout: THOI_HAN_GIAI_THICH_MS }
      );
      if (!onChunk) {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      }
      const { stream } = await model.generateContentStream(prompt);
      let text = "";
      for await (const chunk of stream) {
        const doan = chunk.text();
        if (!doan) continue;
        text += doan;
        daGui = true;
        onChunk(doan);
      }
      return text.trim();
    } catch (error) {
      // Đã gửi một phần chữ cho người học thì không đổi model giữa chừng
      if (daGui) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

// ---- Đoán trước đáp án sai hay gặp của câu điền từ (scripts/sinh-giai-thich.js --loi-thuong-gap) ----
const SO_LOI_THUONG_GAP = 4;

function buildLoiThuongGapPrompt({ lessonTitle, grammar, question }) {
  const focus = grammar.map((item) => `- ${item.title}${item.pattern ? `: ${item.pattern}` : ""}`).join("\n");
  return `Người Việt mất gốc (A1–B1) làm câu điền từ tiếng Anh sau. Đoán ${SO_LOI_THUONG_GAP} câu trả lời SAI mà họ hay gõ nhất
(ví dụ: chia sai thì, thiếu/thừa đuôi -s/-ed/-ing, sai trợ động từ, sai chính tả phổ biến, dịch từng chữ).

Bài học: ${lessonTitle}
Kiến thức trọng tâm:
${focus || "- (không có)"}
Câu hỏi:${question.instruction ? ` (${question.instruction})` : ""}
${question.prompt}
Đáp án đúng: ${(question.accepted_answers || []).join(" / ")}

Chỉ trả về một mảng JSON các chuỗi, đúng dạng người học sẽ gõ, không giải thích. Ví dụ: ["goed", "go"]`;
}

/** Lấy các đáp án sai từ câu trả lời của AI: bỏ đáp án đúng, trùng (sau chuẩn hoá) và rỗng. */
function parseLoiThuongGap(text, question) {
  const clean = String(text || "").replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
  const daCo = new Set();
  const ketQua = [];
  for (const item of Array.isArray(parsed) ? parsed : []) {
    const traLoi = String(item ?? "").trim().slice(0, 120);
    const khoa = chuanHoaTraLoi(traLoi);
    if (!khoa || daCo.has(khoa) || laTraLoiDung(question, traLoi)) continue;
    daCo.add(khoa);
    ketQua.push(traLoi);
    if (ketQua.length >= SO_LOI_THUONG_GAP) break;
  }
  return ketQua;
}

async function doanLoiThuongGap(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError;
  for (const { model: modelName, generationConfig = {} } of MODEL_GIAI_THICH_SINH_SAN) {
    try {
      const model = genAI.getGenerativeModel(
        { model: modelName, generationConfig: { maxOutputTokens: 120, ...generationConfig } },
        { timeout: THOI_HAN_GIAI_THICH_MS }
      );
      const result = await model.generateContent(buildLoiThuongGapPrompt(input));
      return parseLoiThuongGap(result.response.text(), input.question);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Prompt sinh bài luyện thêm cho một buổi của khoá học riêng (scripts/sinh-bai-luyen-them.js).
 * Chỉ dùng ngữ pháp + từ vựng của buổi; không lặp câu đã có trong bài.
 */
function buildExtraPracticePrompt({ lessonNumber, lessonTitle, grammar, vocabulary, existingPrompts, count }) {
  const nguPhap = grammar
    .map((muc) => {
      const dong = [`- ${muc.title}${muc.pattern ? `: ${muc.pattern}` : ""}`];
      for (const quyTac of muc.rules || []) dong.push(`  • ${quyTac}`);
      for (const viDu of muc.examples || []) dong.push(`  Ví dụ: ${viDu.en}`);
      return dong.join("\n");
    })
    .join("\n");
  const tuVung = vocabulary
    .map((tu) => `- ${tu.term_en}${tu.part_of_speech ? ` (${tu.part_of_speech})` : ""}: ${tu.meaning_vi}`)
    .join("\n");

  return `Bạn là giáo viên tiếng Anh cho người Việt mất gốc (A1–A2). Soạn ${count} câu trắc nghiệm MỚI để luyện buổi ${lessonNumber}: "${lessonTitle}".

NGỮ PHÁP CỦA BUỔI
${nguPhap || "(không có)"}

TỪ VỰNG CỦA BUỔI
${tuVung || "(không có)"}

CÂU ĐÃ CÓ TRONG BÀI — không lặp lại, không chỉ đổi một chữ:
${existingPrompts.map((deBai) => `- ${deBai}`).join("\n") || "(không có)"}

YÊU CẦU
- Khoảng 70% câu luyện ngữ pháp của buổi (nhom = "ngu_phap"), 30% luyện từ vựng của buổi (nhom = "tu_vung").
- Chỉ dùng ngữ pháp của buổi này và kiến thức cơ bản hơn; không dùng thì hay cấu trúc nâng cao hơn.
- Mỗi câu đúng 4 lựa chọn khác nhau và đúng MỘT đáp án, không mơ hồ. Lựa chọn nhiễu dựa trên lỗi người Việt hay mắc; không dùng "tất cả đều đúng/sai".
- Chỗ trống viết đúng 5 dấu gạch dưới: _____
- Đáp án đúng rải đều A/B/C/D.
- giai_thich: 1–2 câu tiếng Việt dễ hiểu, vì sao đáp án đúng.
- Tiếng Anh tự nhiên, đúng ngữ pháp; tiếng Việt có dấu.

TRẢ VỀ JSON THUẦN (không markdown), đúng dạng:
{"cau_hoi":[{"nhom":"ngu_phap","de_bai":"She _____ at home yesterday.","lua_chon":["was","were","is","be"],"dap_an":"A","giai_thich":"..."}]}`;
}

/** @returns {object[]} các câu thô Gemini trả về (chưa kiểm tra) */
function parseExtraPracticeResponse(text) {
  const json = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const data = JSON.parse(json);
  // Model lite đôi khi trả thẳng mảng câu thay vì { cau_hoi: [...] }
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.cau_hoi) ? data.cau_hoi : [];
}

async function generateExtraPractice(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildExtraPracticePrompt(input);
  let lastError;

  for (const modelName of COURSE_EXPLANATION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      return parseExtraPracticeResponse(result.response.text());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = {
  generateTenseExamples,
  generateVocabulary,
  parseVocabularyResponse,
  buildCourseExplanationPrompt,
  explainCourseQuestion,
  MODEL_GIAI_THICH_SINH_SAN,
  parseLoiThuongGap,
  doanLoiThuongGap,
  buildExtraPracticePrompt,
  parseExtraPracticeResponse,
  generateExtraPractice,
};
