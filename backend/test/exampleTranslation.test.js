const { test } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const { updateCard, normalizeCard } = require("../src/controllers/cardController");
test("editing English invalidates its translation; unrelated edits preserve it", async () => {
  const card = { id: 1, deck_id: 10, term_en: "sister", meaning_vi: "chị gái", example_sentence: "My little sister loves drawing.", example_translation: "Em gái tôi thích vẽ." };
  pool.query = async sql => [[sql.includes("FROM decks d") ? { id: 10, user_id: 7 } : card]];
  const writes = [];
  pool.execute = async (_sql, values) => { writes.push(values); return [{ affectedRows: 1 }]; };
  const req = { params: { cardId: "1" }, user: { id: 7 }, body: { term_en: "sister", meaning_vi: "chị gái" } };
  for (const changes of [{ note: "new note" }, { example_sentence: "Another sentence." }, { example_sentence: "New.", example_translation: "Mới." }, { example_sentence: "", example_translation: "Stale" }]) {
    await updateCard({ ...req, body: { ...req.body, ...changes } }, { json() {} });
  }
  assert.equal(writes[0][2], card.example_sentence);
  assert.equal(writes[0][7], card.example_translation);
  assert.equal(writes[1][7], null);
  assert.equal(writes[2][7], "Mới.");
  assert.equal(writes[3][7], null);
  assert.equal(normalizeCard(card).example_translation, card.example_translation);
  assert.equal(normalizeCard({ ...card, example_translation: null }).example_translation, "");
});

test("translateExample returns a saved translation, or asks AI once and saves it for readable decks only", async () => {
  const { translateExample } = require("../src/controllers/cardController");
  const aiService = require("../src/services/aiService");
  const card = { id: 1, deck_id: 10, term_en: "sister", meaning_vi: "chị gái", example_sentence: "My sister sings.", example_translation: null };
  const writes = [];
  let deck = { id: 10, user_id: 7 };
  pool.query = async (sql, params) => {
    if (sql.startsWith("UPDATE")) { writes.push({ sql, params }); return [{ affectedRows: 1 }]; }
    return [[sql.includes("FROM decks d") ? deck : card]];
  };
  let soLanGoiAI = 0;
  aiService.translateExampleSentence = async (input) => { soLanGoiAI += 1; assert.equal(input.sentence, "My sister sings."); return "Chị tôi hát."; };
  const res = { json(body) { this.body = body; } };

  await translateExample({ params: { cardId: "1" }, user: { id: 7 } }, res);
  assert.deepEqual(res.body, { example_translation: "Chị tôi hát.", cached: false });
  assert.deepEqual(writes[0].params, ["Chị tôi hát.", 1, "My sister sings."]);
  assert.match(writes[0].sql, /example_translation IS NULL AND example_sentence = \?/);

  card.example_translation = "Đã có.";
  await translateExample({ params: { cardId: "1" }, user: { id: 7 } }, res);
  assert.deepEqual(res.body, { example_translation: "Đã có.", cached: true });
  assert.equal(soLanGoiAI, 1);

  // Bộ của người khác: không đọc, không gọi AI
  deck = { id: 10, user_id: 8 };
  card.example_translation = null;
  await assert.rejects(translateExample({ params: { cardId: "1" }, user: { id: 7 } }, res), (e) => e.statusCode >= 400);
  assert.equal(soLanGoiAI, 1);
});
