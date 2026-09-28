const { test } = require("node:test");
const assert = require("node:assert/strict");

// config/db tạo pool khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const aiService = require("../src/services/aiService");
const audioStorage = require("../src/services/audioStorage");
const {
  answerQuestion,
  explainQuestion,
  getLesson,
  getQuestionAudio,
  listCourses,
  listDueQuestions,
} = require("../src/controllers/courseController");

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
  lesson_title: "Bài giả định",
  lesson_content: { grammar: [{ title: "To be", pattern: "S + is" }], notes: [] },
};

test("getLesson only reads the signed-in owner's course and returns neighbours", async () => {
  const calls = fakePool([
    [{ id: 3, lesson_number: 13, title: "Bài 13", deck_id: 40, content: { grammar: [], notes: [] }, course_id: 1, course_title: "Khoá" }],
    [
      { ...CAU_TRAC_NGHIEM, options: JSON.stringify(CAU_TRAC_NGHIEM.options), last_correct: 0 },
      { ...CAU_TRAC_NGHIEM, id: 6, last_correct: null },
    ],
    [{ id: 1, term_en: "lamp", meaning_vi: "cái đèn", pronunciation: null, part_of_speech: "noun", mastery_level: 2 }],
    [{ lesson_number: 12 }, { lesson_number: 13 }],
  ]);
  const res = fakeRes();

  await getLesson({ user: { id: 7 }, params: { courseId: "1", lessonNumber: "13" } }, res);

  assert.deepEqual(calls[0].params, [1, 13, 7]);
  assert.match(calls[0].sql, /c\.user_id = \?/);
  // Tiến độ câu hỏi và từ vựng là của chính người đang đăng nhập
  assert.deepEqual(calls[1].params, [7, 3]);
  assert.deepEqual(calls[2].params, [7, 40]);
  assert.equal(res.body.lesson.lesson_number, 13);
  assert.deepEqual(res.body.questions[0].options, CAU_TRAC_NGHIEM.options);
  assert.equal(res.body.questions[0].last_correct, false);
  assert.equal(res.body.questions[1].last_correct, null);
  assert.equal(res.body.words[0].mastery_level, 2);
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

test("listCourses returns lesson progress counts of the course owner as numbers", async () => {
  const calls = fakePool([
    [
      {
        course_id: 1,
        slug: "khoa-hoc-48-ngay",
        course_title: "Khoá 48 ngày",
        description: null,
        lesson_number: 13,
        lesson_title: "Bài 13",
        deck_id: 42,
        question_count: 43,
        word_count: 11,
        learned_count: "5",
        mastered_count: "1",
        answered_count: "20",
        correct_count: "17",
        due_count: "2",
      },
    ],
  ]);
  const res = fakeRes();

  await listCourses({ user: { id: 7 } }, res);

  assert.deepEqual(calls[0].params, [7]);
  assert.match(calls[0].sql, /cp\.user_id = c\.user_id/);
  assert.match(calls[0].sql, /p\.user_id = c\.user_id/);
  // Câu luyện thêm (AI sinh) không tính vào tiến độ buổi
  assert.equal(calls[0].sql.match(/q\.source <> 'extra'/g).length, 3);
  assert.deepEqual(res.body[0].lessons[0], {
    lesson_number: 13,
    title: "Bài 13",
    deck_id: 42,
    question_count: 43,
    word_count: 11,
    learned_count: 5,
    mastered_count: 1,
    answered_count: 20,
    correct_count: 17,
    due_count: 2,
  });
});

test("answerQuestion grades on the server and stores the latest result", async () => {
  // Câu chưa từng làm, trả lời đúng → không vào lịch ôn
  const calls = fakePool([[CAU_TRAC_NGHIEM], [], {}]);
  const res = fakeRes();

  await answerQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "a" } }, res);

  assert.deepEqual(calls[0].params, [5, 7]);
  assert.deepEqual(calls[1].params, [7, 5]);
  assert.match(calls[2].sql, /INSERT INTO course_question_progress[\s\S]*ON DUPLICATE KEY UPDATE[\s\S]*next_review_at = VALUES/);
  assert.deepEqual(calls[2].params, [7, 5, true, 0, null]);
  assert.deepEqual(res.body, { correct: true, mastery_level: 0, next_review_at: null });

  const callsDienTu = fakePool([[{ ...CAU_TRAC_NGHIEM, type: "fill_blank", options: null, answer_key: null, accepted_answers: ["was not", "wasn’t"] }], [], {}]);
  const resDienTu = fakeRes();
  await answerQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "Wasn't." } }, resDienTu);
  assert.equal(callsDienTu[2].params[2], true);

  // Trả lời sai → vào lịch ôn ở Lv0, đến hạn ngay
  const callsSai = fakePool([[CAU_TRAC_NGHIEM], [], {}]);
  const truoc = Date.now();
  await answerQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" } }, fakeRes());
  const [, , sai, level, denHan] = callsSai[2].params;
  assert.deepEqual([sai, level], [false, 0]);
  assert.ok(denHan instanceof Date && denHan.getTime() >= truoc && denHan.getTime() <= Date.now());
});

test("listDueQuestions returns the owner's due questions with their lesson", async () => {
  const calls = fakePool([[{ ...CAU_TRAC_NGHIEM, last_correct: 0, lesson_number: 13, course_id: 1 }]]);
  const res = fakeRes();

  await listDueQuestions({ user: { id: 7 } }, res);

  assert.deepEqual(calls[0].params, [7, 7]);
  assert.match(calls[0].sql, /p\.next_review_at <= CURRENT_TIMESTAMP/);
  assert.match(calls[0].sql, /c\.user_id = \?/);
  assert.equal(res.body[0].id, 5);
  assert.equal(res.body[0].lesson_number, 13);
  assert.equal(res.body[0].course_id, 1);
  assert.equal(res.body[0].last_correct, false);
  assert.equal(res.body[0].lesson_content, undefined);
});

test("answerQuestion does not store anything for another user's question", async () => {
  const calls = fakePool([[]]);
  await assert.rejects(
    answerQuestion({ user: { id: 8 }, params: { questionId: "5" }, body: { answer: "A" } }, fakeRes()),
    { statusCode: 404 }
  );
  assert.equal(calls.length, 1);
});

test("buildExtraPracticePrompt lists the lesson content, existing prompts and the JSON shape", () => {
  const prompt = aiService.buildExtraPracticePrompt({
    lessonNumber: 13,
    lessonTitle: "Quá khứ đơn",
    grammar: [{ title: "Phủ định", pattern: "S + didn't + V", rules: ["Sau didn't dùng V nguyên mẫu"], examples: [{ en: "I didn't go." }] }],
    vocabulary: [{ term_en: "bill", part_of_speech: "noun", meaning_vi: "hóa đơn" }],
    existingPrompts: ["He _____ at home."],
    count: 40,
  });

  assert.match(prompt, /Soạn 40 câu trắc nghiệm MỚI để luyện buổi 13: "Quá khứ đơn"/);
  assert.ok(prompt.includes("- Phủ định: S + didn't + V\n  • Sau didn't dùng V nguyên mẫu\n  Ví dụ: I didn't go."));
  assert.match(prompt, /- bill \(noun\): hóa đơn/);
  assert.match(prompt, /- He _____ at home\./);
  assert.match(prompt, /"cau_hoi":\[/);
});

test("parseExtraPracticeResponse reads plain or fenced JSON", () => {
  const cau = { nhom: "ngu_phap", de_bai: "x", lua_chon: ["a", "b", "c", "d"], dap_an: "A" };
  assert.deepEqual(aiService.parseExtraPracticeResponse(JSON.stringify({ cau_hoi: [cau] })), [cau]);
  assert.deepEqual(aiService.parseExtraPracticeResponse('```json\n{"cau_hoi":[]}\n```'), []);
  assert.deepEqual(aiService.parseExtraPracticeResponse(JSON.stringify([cau])), [cau]);
  assert.throws(() => aiService.parseExtraPracticeResponse("không phải JSON"));
});

test("getQuestionAudio streams the owner's private audio and hides it from everyone else", async () => {
  const { Readable, Writable } = require("node:stream");
  const moAudioGoc = audioStorage.moAudio;
  const daMo = [];
  audioStorage.moAudio = async (ten) => {
    daMo.push(ten);
    return { stream: Readable.from([Buffer.from("mp3")]), contentType: "audio/mpeg", size: 3 };
  };

  try {
    const calls = fakePool([[{ audio_path: "bai-29/audio/mp31.mp3", slug: "khoa-hoc-48-ngay" }]]);
    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    res.set = (headers) => {
      res.headers = headers;
    };
    await getQuestionAudio({ user: { id: 7 }, params: { questionId: "9" } }, res);
    await new Promise((resolve) => res.on("finish", resolve));

    assert.deepEqual(calls[0].params, [9, 7]);
    assert.match(calls[0].sql, /c.user_id = ?/);
    assert.deepEqual(daMo, ["khoa-hoc-48-ngay/bai-29/audio/mp31.mp3"]);
    assert.equal(res.headers["Content-Type"], "audio/mpeg");
    assert.match(res.headers["Cache-Control"], /^private/);
    assert.equal(Buffer.concat(chunks).toString(), "mp3");

    // Câu của người khác (hoặc câu không có audio): 404, không chạm tới Cloud Storage
    fakePool([[]]);
    await assert.rejects(
      getQuestionAudio({ user: { id: 8 }, params: { questionId: "9" } }, fakeRes()),
      (error) => error.statusCode === 404
    );
    assert.equal(daMo.length, 1);
  } finally {
    audioStorage.moAudio = moAudioGoc;
  }
});
