const { test } = require("node:test");
const assert = require("node:assert/strict");

// cardController nạp config DB khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const aiService = require("../src/services/aiService");
const { checkSentence } = require("../src/controllers/cardController");

function fakeRes() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("parseSentenceCheck reads fenced JSON and only keeps known fields", () => {
  const text = '```json\n{"dung_tu":true,"dung_ngu_phap":"yes","nhan_xet":" Tốt. ","cau_sua":"She is resilient.","thua":1}\n```';
  assert.deepEqual(aiService.parseSentenceCheck(text), {
    dung_tu: true,
    dung_ngu_phap: false,
    nhan_xet: "Tốt.",
    cau_sua: "She is resilient.",
  });
});

test("parseSentenceCheck rejects output without a comment or not an object", () => {
  assert.equal(aiService.parseSentenceCheck('{"dung_tu":true}'), null);
  assert.equal(aiService.parseSentenceCheck("[1,2]"), null);
  assert.equal(aiService.parseSentenceCheck("không phải JSON"), null);
});

test("buildSentenceCheckPrompt includes the word, meaning and learner sentence", () => {
  const prompt = aiService.buildSentenceCheckPrompt({
    termEn: "resilient",
    meaningVi: "kiên cường",
    sentence: "She are resilient.",
  });
  assert.match(prompt, /resilient/);
  assert.match(prompt, /kiên cường/);
  assert.match(prompt, /She are resilient\./);
});

test("checkSentence needs a word and a sentence", async () => {
  await assert.rejects(checkSentence({ body: { term_en: "run" } }, fakeRes()), { statusCode: 400 });
  await assert.rejects(
    checkSentence({ body: { term_en: "run", cau: "x".repeat(301) } }, fakeRes()),
    { statusCode: 400 }
  );
});

test("checkSentence returns the AI verdict, or 502 when the AI fails", async (t) => {
  const verdict = { dung_tu: true, dung_ngu_phap: true, nhan_xet: "Đúng.", cau_sua: "I run." };
  const mock = t.mock.method(aiService, "checkLearnerSentence", async () => verdict);

  const res = fakeRes();
  await checkSentence({ body: { term_en: "run", meaning_vi: "chạy", cau: " I run. " } }, res);
  assert.deepEqual(res.body, verdict);
  assert.deepEqual(mock.mock.calls[0].arguments[0], { termEn: "run", meaningVi: "chạy", sentence: "I run." });

  mock.mock.mockImplementation(async () => {
    throw new Error("503");
  });
  await assert.rejects(
    checkSentence({ body: { term_en: "run", cau: "I run." } }, fakeRes()),
    { statusCode: 502 }
  );
});
