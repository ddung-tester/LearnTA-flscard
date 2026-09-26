/**
 * aiService.js — Sinh 6 câu mẫu 6 thì dùng Google Gemini API.
 * Trả về mảng 6 phần tử:
 *   [{ tense, formula, sentence, highlight, translation }, ...]
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

module.exports = {
  generateTenseExamples,
  generateVocabulary,
  parseVocabularyResponse,
};
