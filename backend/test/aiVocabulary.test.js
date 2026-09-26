const { test } = require("node:test");
const assert = require("node:assert/strict");

// cardController nạp config DB khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const aiService = require("../src/services/aiService");
const { generateVocabularyCards } = require("../src/controllers/cardController");

const APPLE = {
  term_en: "apple",
  pronunciation: "/ˈæp.əl/",
  part_of_speech: "noun",
  meaning_vi: "quả táo",
  example_sentence: "I eat an apple.",
  note: "",
};

test("parseVocabularyResponse reads fenced JSON and a { words } wrapper", () => {
  const fenced = "```json\n" + JSON.stringify([APPLE]) + "\n```";
  assert.deepEqual(aiService.parseVocabularyResponse(fenced, 10), [APPLE]);
  assert.deepEqual(aiService.parseVocabularyResponse(JSON.stringify({ words: [APPLE] }), 10), [APPLE]);
});

test("parseVocabularyResponse drops invalid and duplicate items and caps the count", () => {
  const items = [
    APPLE,
    { ...APPLE, term_en: "Apple" },
    { term_en: "pear" },
    "not an object",
    { term_en: "book", meaning_vi: "quyển sách", part_of_speech: "x".repeat(80) },
    { term_en: "cat", meaning_vi: "con mèo" },
  ];

  const words = aiService.parseVocabularyResponse(`Here: ${JSON.stringify(items)}`, 2);

  assert.deepEqual(words.map((w) => w.term_en), ["apple", "book"]);
  assert.equal(words[1].part_of_speech.length, 50);
  assert.equal(words[1].note, "");
});

function fakeRes() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("generateVocabularyCards needs a topic or a passage", async () => {
  await assert.rejects(generateVocabularyCards({ body: {} }, fakeRes()), { statusCode: 400 });
  await assert.rejects(
    generateVocabularyCards({ body: { chu_de: "x".repeat(201) } }, fakeRes()),
    { statusCode: 400 }
  );
});

test("generateVocabularyCards clamps the count and returns the words", async (t) => {
  const calls = [];
  t.mock.method(aiService, "generateVocabulary", async (options) => {
    calls.push(options);
    return [APPLE];
  });

  const res = fakeRes();
  await generateVocabularyCards({ body: { chu_de: "fruit", so_luong: 99 } }, res);
  await generateVocabularyCards({ body: { doan_van: "I like apples.", so_luong: "abc" } }, fakeRes());

  assert.deepEqual(res.body, { words: [APPLE] });
  assert.deepEqual(calls[0], { topic: "fruit", passage: "", count: 30 });
  assert.deepEqual(calls[1], { topic: "", passage: "I like apples.", count: 15 });
});

test("generateVocabularyCards reports 502 when the AI returns nothing usable", async (t) => {
  t.mock.method(aiService, "generateVocabulary", async () => []);
  await assert.rejects(
    generateVocabularyCards({ body: { chu_de: "fruit" } }, fakeRes()),
    { statusCode: 502 }
  );
});
