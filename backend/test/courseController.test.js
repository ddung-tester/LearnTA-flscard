const { test } = require("node:test");
const assert = require("node:assert/strict");

// config/db tạo pool khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const aiService = require("../src/services/aiService");
const { explainQuestion, getLesson } = require("../src/controllers/courseController");

function fakePool(ketQuaTheoLan) {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [ketQuaTheoLan[calls.length - 1] ?? []];
  };
  return calls;
}

function fakeRes() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const CAU_TRAC_NGHIEM = {
  id: 5,
  source: "lesson",
  section: "quiz_1",
  type: "multiple_choice",
  instruction: null,
  prompt: "The lamp _____ on.",
  options: [
    { key: "A", text: "is" },
    { key: "B", text: "are" },
  ],
  answer_key: "A",
  accepted_answers: null,
  explanation: "Chủ ngữ số ít dùng is.",
  answer_source: "answer_pdf",
  image_description: null,
  lesson_title: "Bài giả định",
  lesson_content: { grammar: [{ title: "To be", pattern: "S + is" }], notes: [] },
};

test("getLesson only reads the signed-in owner's course and returns neighbours", async () => {
  const calls = fakePool([
    [{ id: 3, lesson_number: 13, title: "Bài 13", deck_id: 40, content: { grammar: [], notes: [] }, course_id: 1, course_title: "Khoá" }],
    [{ ...CAU_TRAC_NGHIEM, options: JSON.stringify(CAU_TRAC_NGHIEM.options) }],
    [{ id: 1, term_en: "lamp", meaning_vi: "cái đèn", pronunciation: null, part_of_speech: "noun" }],
    [{ lesson_number: 12 }, { lesson_number: 13 }],
  ]);
  const res = fakeRes();

  await getLesson({ user: { id: 7 }, params: { courseId: "1", lessonNumber: "13" } }, res);

  assert.deepEqual(calls[0].params, [1, 13, 7]);
  assert.match(calls[0].sql, /c\.user_id = \?/);
  assert.deepEqual(calls[2].params, [40]);
  assert.equal(res.body.lesson.lesson_number, 13);
  assert.deepEqual(res.body.questions[0].options, CAU_TRAC_NGHIEM.options);
  assert.equal(res.body.prev_lesson, 12);
  assert.equal(res.body.next_lesson, null);
});

test("getLesson returns 404 for a lesson the user does not own", async () => {
  fakePool([[]]);
  await assert.rejects(
    getLesson({ user: { id: 7 }, params: { courseId: "1", lessonNumber: "13" } }, fakeRes()),
    { statusCode: 404 }
  );
});

test("explainQuestion reuses a cached explanation without calling AI", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], [{ explanation: "Đã lưu" }]]);
  aiService.explainCourseQuestion = async () => {
    throw new Error("không được gọi AI");
  };
  const res = fakeRes();

  await explainQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "b" } }, res);

  assert.deepEqual(calls[0].params, [5, 7]);
  assert.deepEqual(calls[1].params, [5, "B"]);
  assert.deepEqual(res.body, { explanation: "Đã lưu", cached: true });
});

test("explainQuestion grades from the DB, asks AI once and caches the result", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], [], {}]);
  let input;
  aiService.explainCourseQuestion = async (value) => {
    input = value;
    return "Giải thích mới";
  };
  const res = fakeRes();

  await explainQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" } }, res);

  assert.equal(input.isCorrect, false);
  assert.equal(input.learnerAnswer, "B");
  assert.deepEqual(input.grammar, CAU_TRAC_NGHIEM.lesson_content.grammar);
  assert.match(calls[2].sql, /INSERT IGNORE INTO course_question_explanations/);
  assert.deepEqual(calls[2].params, [5, "B", "Giải thích mới"]);
  assert.deepEqual(res.body, { explanation: "Giải thích mới", cached: false });
});

test("explainQuestion rejects options that do not exist and other users' questions", async () => {
  fakePool([[CAU_TRAC_NGHIEM]]);
  await assert.rejects(
    explainQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "D" } }, fakeRes()),
    { statusCode: 400 }
  );

  fakePool([[]]);
  await assert.rejects(
    explainQuestion({ user: { id: 8 }, params: { questionId: "5" }, body: { answer: "A" } }, fakeRes()),
    { statusCode: 404 }
  );
});

test("buildCourseExplanationPrompt states the right answer and whether the learner was right", () => {
  const prompt = aiService.buildCourseExplanationPrompt({
    lessonTitle: "Bài giả định",
    grammar: CAU_TRAC_NGHIEM.lesson_content.grammar,
    question: CAU_TRAC_NGHIEM,
    learnerAnswer: "B",
    isCorrect: false,
  });

  assert.match(prompt, /Đáp án đúng: A\. is/);
  assert.match(prompt, /Người học trả lời: B\. are → SAI/);
  assert.match(prompt, /- To be: S \+ is/);
});
