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
  prepareQuestion,
  rateExplanation,
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
  assert.deepEqual(calls[1].params.slice(0, 2), [5, "B"]);
  // Bản soạn bằng prompt cũ không dùng nữa
  assert.ok(calls[1].params[2] instanceof Date);
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
  assert.match(calls[2].sql, /INSERT INTO course_question_explanations[\s\S]*ON DUPLICATE KEY UPDATE/);
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

function fakeStreamRes() {
  return {
    headers: undefined,
    chunks: [],
    ended: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    write(chunk) {
      this.chunks.push(chunk);
    },
    end(chunk) {
      if (chunk) this.chunks.push(chunk);
      this.ended = true;
    },
  };
}

test("explainQuestion streams AI text chunk by chunk when stream=1 and caches the whole text", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], [], {}]);
  aiService.explainCourseQuestion = async (_value, { onChunk }) => {
    onChunk("Sai vì ");
    onChunk("chủ ngữ số ít.");
    return "Sai vì chủ ngữ số ít.";
  };
  const res = fakeStreamRes();

  await explainQuestion(
    { user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" }, query: { stream: "1" } },
    res
  );

  assert.match(res.headers["Content-Type"], /text\/plain/);
  assert.deepEqual(res.chunks, ["Sai vì ", "chủ ngữ số ít."]);
  assert.equal(res.ended, true);
  assert.deepEqual(calls[2].params, [5, "B", "Sai vì chủ ngữ số ít."]);
});

test("explainQuestion falls back to the question's own hint when AI fails", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], []]);
  aiService.explainCourseQuestion = async () => {
    throw new Error("503 quá tải");
  };
  const res = fakeRes();

  await explainQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" } }, res);

  assert.deepEqual(res.body, { explanation: "Chủ ngữ số ít dùng is.", cached: false, fallback: true });
  // Gợi ý dự phòng không được lưu vào cache (lần sau vẫn thử AI)
  assert.equal(calls.length, 2);
});

test("prepareQuestion asks AI once for every answer and caches only valid ones", async () => {
  const calls = fakePool([
    [CAU_TRAC_NGHIEM],
    [],
    {},
    {},
    [
      { question_id: 5, answer_norm: "A", explanation: "Đúng rồi: số ít dùng is." },
      { question_id: 5, answer_norm: "B", explanation: "Sai vì: are cho số nhiều." },
    ],
  ]);
  let soLanGoi = 0;
  aiService.explainAllAnswers = async (input) => {
    soLanGoi += 1;
    assert.equal(input.question.id, 5);
    return [
      { tra_loi: "A", dung: true, giai_thich: "Đúng rồi: số ít dùng is." },
      { tra_loi: "B", dung: false, giai_thich: "Sai vì: are cho số nhiều." },
      { tra_loi: "B", dung: true, giai_thich: "AI chấm nhầm" },
    ];
  };
  const res = fakeRes();

  await prepareQuestion({ user: { id: 7 }, params: { questionId: "5" } }, res);

  assert.equal(soLanGoi, 1);
  assert.equal(calls[1].params[0], 5);
  assert.match(calls[2].sql, /INSERT INTO course_question_explanations[\s\S]*ON DUPLICATE KEY UPDATE/);
  assert.deepEqual(calls[2].params, [5, "A", "Đúng rồi: số ít dùng is."]);
  assert.deepEqual(calls[3].params, [5, "B", "Sai vì: are cho số nhiều."]);
  // Trả luôn lời giải thích để client giữ sẵn, trả lời xong hiện ngay
  assert.deepEqual(res.body, {
    ready: true,
    generated: 2,
    explanations: { A: "Đúng rồi: số ít dùng is.", B: "Sai vì: are cho số nhiều." },
  });
});

test("prepareQuestion skips AI when every answer is already cached", async () => {
  fakePool([
    [CAU_TRAC_NGHIEM],
    [{ answer_norm: "A" }, { answer_norm: "B" }],
    [
      { question_id: 5, answer_norm: "A", explanation: "x" },
      { question_id: 5, answer_norm: "B", explanation: "y" },
    ],
  ]);
  aiService.explainAllAnswers = async () => {
    throw new Error("không được gọi AI");
  };
  const res = fakeRes();

  await prepareQuestion({ user: { id: 7 }, params: { questionId: "5" } }, res);

  assert.deepEqual(res.body, { ready: true, generated: 0, explanations: { A: "x", B: "y" } });
});

test("explainQuestion waits for an in-flight prepare instead of calling AI again", async () => {
  let xongSoan;
  const soanXong = new Promise((resolve) => {
    xongSoan = resolve;
  });
  // Trả lời theo nội dung câu lệnh (thứ tự giữa prepare và explain đan xen)
  let lanDocCache = 0;
  pool.query = async (sql) => {
    if (/FROM course_questions q/.test(sql)) return [[CAU_TRAC_NGHIEM]];
    if (/SELECT answer_norm FROM/.test(sql)) return [[]];
    if (/INSERT INTO/.test(sql)) return [{}];
    if (/question_id IN/.test(sql)) return [[{ question_id: 5, answer_norm: "B", explanation: "Soạn sẵn" }]];
    lanDocCache += 1;
    return [lanDocCache === 1 ? [] : [{ explanation: "Soạn sẵn" }]];
  };
  aiService.explainAllAnswers = async () => {
    await soanXong;
    return [
      { tra_loi: "A", dung: true, giai_thich: "Đúng" },
      { tra_loi: "B", dung: false, giai_thich: "Soạn sẵn" },
    ];
  };
  aiService.explainCourseQuestion = async () => {
    throw new Error("không được gọi AI lần hai");
  };

  const dangSoan = prepareQuestion({ user: { id: 7 }, params: { questionId: "5" } }, fakeRes());
  await new Promise((resolve) => setImmediate(resolve));
  const res = fakeRes();
  const dangGiaiThich = explainQuestion({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" } }, res);
  xongSoan();
  await Promise.all([dangSoan, dangGiaiThich]);

  assert.deepEqual(res.body, { explanation: "Soạn sẵn", cached: true });
});

test("buildCourseExplanationPrompt asks for a short fixed format", () => {
  const sai = aiService.buildCourseExplanationPrompt({
    lessonTitle: "Bài giả định",
    grammar: [],
    question: CAU_TRAC_NGHIEM,
    learnerAnswer: "B",
    isCorrect: false,
  });
  assert.match(sai, /Sai vì:/);
  assert.match(sai, /Đúng vì:/);
  assert.match(sai, /Nhớ:/);

  const dung = aiService.buildCourseExplanationPrompt({
    lessonTitle: "Bài giả định",
    grammar: [],
    question: CAU_TRAC_NGHIEM,
    learnerAnswer: "A",
    isCorrect: true,
  });
  assert.match(dung, /Đúng rồi:/);
  assert.doesNotMatch(dung, /Sai vì:/);
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

test("getQuestionAudio handles source errors and client disconnects without unhandled stream errors", async () => {
  const { Readable, Writable } = require("node:stream");
  const original = audioStorage.moAudio;
  try {
    for (const disconnect of [false, true]) {
      fakePool([[{ audio_path: "audio.mp3", slug: "test" }]]);
      const source = new Readable({ read() {
        if (disconnect) this.push(Buffer.from("mp3"));
        else this.destroy(new Error("upstream failed"));
      } });
      const res = new Writable({ write(_chunk, _encoding, done) {
        this.destroy();
        done();
      } });
      res.set = () => {};
      audioStorage.moAudio = async () => ({ stream: source, contentType: "audio/mpeg" });
      await assert.rejects(getQuestionAudio({ user: { id: 7 }, params: { questionId: "9" } }, res));
      assert.equal(source.destroyed, true);
      assert.equal(res.destroyed, true);
    }
  } finally {
    audioStorage.moAudio = original;
  }
});


const CAU_DIEN_TU = {
  ...CAU_TRAC_NGHIEM,
  id: 9,
  type: "fill_blank",
  options: null,
  answer_key: null,
  accepted_answers: ["was"],
  explanation: null,
};
const GIAI_THICH_DAP_AN_DUNG = "Đúng rồi: **was** đi với chủ ngữ số ít.\nNhớ: I/he/she + **was** — ví dụ: She was tired (Cô ấy mệt)";

function fakeLuongRes() {
  return {
    chunks: [],
    status: null,
    writeHead(status) {
      this.status = status;
    },
    write(text) {
      this.chunks.push(text);
    },
    end(text) {
      if (text) this.chunks.push(text);
      this.ended = true;
    },
  };
}

test("getLesson sends saved explanations with each question and whether every answer is covered", async () => {
  const calls = fakePool([
    [{ id: 3, lesson_number: 13, title: "Bài 13", deck_id: 40, content: { grammar: [], notes: [] }, course_id: 1, course_title: "Khoá" }],
    [CAU_TRAC_NGHIEM, { ...CAU_TRAC_NGHIEM, id: 6 }],
    [],
    [{ lesson_number: 13 }],
    [
      { question_id: 5, answer_norm: "A", explanation: "a" },
      { question_id: 5, answer_norm: "B", explanation: "b" },
      { question_id: 6, answer_norm: "A", explanation: "a6" },
    ],
  ]);
  const res = fakeRes();
  await getLesson({ user: { id: 7 }, params: { courseId: "1", lessonNumber: "13" } }, res);

  assert.deepEqual(calls[4].params[0], [5, 6]);
  assert.ok(calls[4].params[1] instanceof Date);
  assert.deepEqual(res.body.questions[0].explanations, { A: "a", B: "b" });
  assert.equal(res.body.questions[0].explanations_ready, true);
  assert.equal(res.body.questions[1].explanations_ready, false);
});

test("a fill-in answer typed wrong in a new way only asks AI for the 'Sai vì' line and reuses the right-answer part", async () => {
  const calls = fakePool([
    [CAU_DIEN_TU],
    [],
    [{ question_id: 9, answer_norm: "was", explanation: GIAI_THICH_DAP_AN_DUNG }],
    {},
  ]);
  let input;
  aiService.explainCourseQuestion = async (value, { onChunk } = {}) => {
    input = value;
    onChunk?.("Sai vì: **were** dùng cho số nhiều.");
    return "Sai vì: **were** dùng cho số nhiều.";
  };
  const res = fakeLuongRes();
  await explainQuestion(
    { user: { id: 7 }, params: { questionId: "9" }, body: { answer: "were" }, query: { stream: "1", chiDongSai: "1" } },
    res
  );

  const phanDung = "Đúng vì: **was** đi với chủ ngữ số ít.\nNhớ: I/he/she + **was** — ví dụ: She was tired (Cô ấy mệt)";
  assert.equal(input.phanDung, phanDung);
  // Luồng chỉ gồm dòng "Sai vì" (client đã hiện sẵn phần còn lại); cache lưu bản đầy đủ
  assert.equal(res.chunks.join(""), "Sai vì: **were** dùng cho số nhiều.");
  assert.deepEqual(calls[3].params, [9, "were", `Sai vì: **were** dùng cho số nhiều.\n${phanDung}`]);

  // Client không xin chế độ này: gửi nốt phần còn lại
  fakePool([[CAU_DIEN_TU], [], [{ question_id: 9, answer_norm: "was", explanation: GIAI_THICH_DAP_AN_DUNG }], {}]);
  const resDu = fakeLuongRes();
  await explainQuestion(
    { user: { id: 7 }, params: { questionId: "9" }, body: { answer: "were" }, query: { stream: "1" } },
    resDu
  );
  assert.equal(resDu.chunks.join(""), `Sai vì: **were** dùng cho số nhiều.\n${phanDung}`);
});

test("explanation prompts stick to what this question tests instead of re-teaching the lesson", () => {
  const prompt = aiService.buildCourseExplanationPrompt({
    lessonTitle: "Bài giả định",
    grammar: [{ title: "To be", pattern: "S + is" }],
    question: { ...CAU_TRAC_NGHIEM, section: "tu_vung" },
    learnerAnswer: "B",
    isCorrect: false,
  });
  assert.match(prompt, /chỉ để tham khảo/);
  assert.match(prompt, /KHÔNG nhắc lại lý thuyết chung của bài/);
  assert.match(prompt, /Câu này thuộc phần: từ vựng/);
  assert.doesNotMatch(prompt, /Kiến thức trọng tâm/);

  const dongSai = aiService.buildWrongLinePrompt({
    lessonTitle: "Bài giả định",
    grammar: [],
    question: CAU_DIEN_TU,
    learnerAnswer: "were",
    phanDung: "Đúng vì: x\nNhớ: y",
  });
  assert.match(dongSai, /Viết ĐÚNG 1 dòng/);
  assert.match(dongSai, /Đúng vì: x/);
});

test("rateExplanation: a thumbs-up only logs, without calling AI", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], [{ explanation: "Bản cũ" }]]);
  aiService.explainCourseQuestion = async () => {
    throw new Error("không được gọi AI");
  };
  let status;
  const res = { status(code) { status = code; return this; }, end() {} };

  await rateExplanation({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B", tot: true } }, res);

  assert.equal(status, 204);
  assert.equal(calls.length, 2);
});

test("rateExplanation: a thumbs-down rewrites with the old text in the prompt and overwrites the cache", async () => {
  const calls = fakePool([[CAU_TRAC_NGHIEM], [{ explanation: "Bản cũ" }], {}]);
  let input;
  let models;
  aiService.explainCourseQuestion = async (value, opts) => {
    input = value;
    models = opts.models;
    return "Bản mới";
  };
  const res = fakeRes();

  await rateExplanation({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "b", tot: false } }, res);

  assert.equal(input.banCu, "Bản cũ");
  assert.equal(input.learnerAnswer, "B");
  assert.equal(models, aiService.MODEL_VIET_LAI);
  assert.deepEqual(calls[2].params, [5, "B", "Bản mới"]);
  assert.deepEqual(res.body, { explanation: "Bản mới" });

  // AI lỗi: báo 502, không ghi đè bản cũ
  const callsLoi = fakePool([[CAU_TRAC_NGHIEM], [{ explanation: "Bản cũ" }]]);
  aiService.explainCourseQuestion = async () => {
    throw new Error("quota");
  };
  await assert.rejects(
    rateExplanation({ user: { id: 7 }, params: { questionId: "5" }, body: { answer: "B" } }, fakeRes()),
    (error) => error.statusCode === 502
  );
  assert.equal(callsLoi.length, 2);
});

test("the rewrite prompt shows the rejected explanation and asks for a different one", () => {
  const prompt = aiService.buildCourseExplanationPrompt({
    lessonTitle: "Bài giả định",
    grammar: [],
    question: CAU_TRAC_NGHIEM,
    learnerAnswer: "B",
    isCorrect: false,
    banCu: "Bản cũ lan man",
  });
  assert.match(prompt, /CHƯA ỔN[\s\S]*Bản cũ lan man[\s\S]*Hãy viết lại/);
  assert.doesNotMatch(
    aiService.buildCourseExplanationPrompt({ lessonTitle: "x", grammar: [], question: CAU_TRAC_NGHIEM, learnerAnswer: "A", isCorrect: true }),
    /CHƯA ỔN/
  );
});
