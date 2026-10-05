const { test } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const { updateCard } = require("../src/controllers/cardController");

test("UI edit keeps omitted note, pronunciation and part of speech; explicit clearing works", async () => {
  const card = { id: 1, deck_id: 10, term_en: "apple", meaning_vi: "táo", note: "keep me", pronunciation: "/apple/", part_of_speech: "noun" };
  const writes = [];
  pool.query = async (sql) => [[sql.includes("FROM decks d") ? { id: 10, user_id: 7 } : card]];
  pool.execute = async (_sql, values) => { writes.push(values); return [{ affectedRows: 1 }]; };
  const req = { params: { cardId: "1" }, user: { id: 7 }, body: { term_en: "apple", meaning_vi: "quả táo", example_sentence: "An apple." } };
  const res = { json() {} };
  await updateCard(req, res);
  assert.deepEqual(writes[0].slice(3, 6), ["keep me", "/apple/", "noun"]);
  await updateCard({ ...req, body: { ...req.body, note: "", pronunciation: null, part_of_speech: null } }, res);
  assert.deepEqual(writes[1].slice(3, 6), ["", null, null]);
});


test("dependent examples are cleared after term, meaning or POS changes, but unrelated edits preserve them", async () => {
  const examples = Array.from({ length: 6 }, (_, i) => ({ tense: i, en: "Apple example" }));
  const card = { id: 1, deck_id: 10, term_en: "apple", meaning_vi: "fruit", part_of_speech: "noun", tense_examples: JSON.stringify(examples) };
  pool.query = async sql => [[sql.includes("FROM decks d") ? { id: 10, user_id: 7 } : card]];
  const writes = [];
  pool.execute = async (sql, values) => { writes.push({ sql, values }); return [{ affectedRows: 1 }]; };
  const req = { params: { cardId: "1" }, user: { id: 7 }, body: { term_en: "apple", meaning_vi: "fruit" } };
  for (const changes of [{ note: "note" }, { term_en: "pear" }, { meaning_vi: "new meaning" }, { part_of_speech: "verb" }]) {
    await updateCard({ ...req, body: { ...req.body, ...changes } }, { json() {} });
  }
  assert.deepEqual(JSON.parse(writes[0].values[6]), examples);
  for (const write of writes.slice(1)) {
    assert.equal(write.values[6], null);
    assert.doesNotMatch(write.sql, /COALESCE/);
  }
  await updateCard({ ...req, body: { ...req.body, term_en: "pear", tense_examples: examples } }, { json() {} });
  assert.deepEqual(JSON.parse(writes[4].values[6]), examples);
});
