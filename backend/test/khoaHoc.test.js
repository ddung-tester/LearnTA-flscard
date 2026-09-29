const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  chuanHoaBaiHoc,
  chuanHoaTraLoi,
  boCauTheoTranh,
  gopBaiLuyenThem,
  kiemTraBaiHoc,
  lichOnCauHoi,
  taoBaiLuyenThem,
  laTraLoiDung,
  napBaiHoc,
} = require("../src/utils/khoaHoc");

// Dữ liệu giả định, cùng dạng với file ChatGPT trích từ PDF (lesson/exercises/answers.json)
function taoBai() {
  return {
    lesson: {
      lesson_number: 3,
      title: "Bài giả định",
      vocabulary: [
        { word: "lamp", part_of_speech: "noun", meaning_vi: "cái đèn", pronunciation: "/læmp/", example: "The lamps were not on." },
        { word: "quiet", part_of_speech: "adjective", meaning_vi: "yên tĩnh" },
      ],
      grammar: [
        {
          id: "g1",
          title: "Mẫu câu",
          pattern: "S + be + adj",
          rules: ["Quy tắc 1", ""],
          examples: [{ en: "The room is quiet.", vi: "Căn phòng yên tĩnh." }, { vi: "thiếu câu" }],
        },
      ],
      learning_notes_vi: ["Ghi nhớ"],
    },
    exercises: {
      lesson_number: 3,
      questions: [
        {
          id: "quiz_1_01",
          source: "lesson",
          section: "quiz_1",
          type: "multiple_choice",
          prompt: "The lamp _____ on.",
          options: [
            { key: "A", text: "is" },
            { key: "B", text: "are" },
          ],
        },
        {
          id: "exam_fill_01",
          source: "exam",
          section: "fill_verbs",
          type: "fill_blank",
          instruction: "Chỉ điền phần còn thiếu.",
          prompt: "Is it a lamp? — Yes, it _____.",
        },
      ],
    },
    answers: {
      lesson_number: 3,
      answers: [
        { question_id: "quiz_1_01", answer: "a", explanation_vi: "Chủ ngữ số ít dùng is.", provenance: "answer_pdf" },
        { question_id: "exam_fill_01", accepted_answers: ["is"], provenance: "answer_pdf" },
      ],
    },
  };
}

test("chuanHoaTraLoi ignores case, extra spaces, final punctuation and curly quotes", () => {
  assert.equal(chuanHoaTraLoi("  Didn’t   PAY. "), "didn't pay");
  assert.equal(chuanHoaTraLoi(null), "");
});

test("laTraLoiDung checks the letter for multiple choice and accepted answers for fill-in", () => {
  const bai = chuanHoaBaiHoc(taoBai());
  const [tracNghiem, dienTu] = bai.questions;

  assert.equal(laTraLoiDung(tracNghiem, "a"), true);
  assert.equal(laTraLoiDung(tracNghiem, "B"), false);
  assert.equal(laTraLoiDung(dienTu, " IS. "), true);
  assert.equal(laTraLoiDung(dienTu, "are"), false);
  assert.equal(laTraLoiDung(dienTu, ""), false);
});

test("chuanHoaBaiHoc merges answers into questions and keeps only usable theory", () => {
  const bai = chuanHoaBaiHoc(taoBai());

  assert.equal(bai.lesson_number, 3);
  assert.deepEqual(bai.content.grammar[0].rules, ["Quy tắc 1"]);
  assert.deepEqual(bai.content.grammar[0].examples, [{ en: "The room is quiet.", vi: "Căn phòng yên tĩnh." }]);
  assert.deepEqual(bai.vocabulary[1], {
    term_en: "quiet",
    meaning_vi: "yên tĩnh",
    pronunciation: null,
    part_of_speech: "adjective",
    example_sentence: null,
  });
  assert.equal(bai.vocabulary[0].example_sentence, "The lamps were not on.");
  assert.deepEqual(bai.questions[0], {
    question_key: "quiz_1_01",
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
    audio_path: null,
    audio_file: null,
    listen_text: null,
    sort_order: 0,
  });
  assert.equal(bai.questions[1].type, "fill_blank");
  assert.deepEqual(bai.questions[1].accepted_answers, ["is"]);
});

test("boCauTheoTranh drops picture questions and their answers", () => {
  const files = taoBai();
  files.exercises.questions.push({
    id: "exam_picture_01",
    source: "exam",
    section: "picture_answers",
    type: "image_based_fill_blank",
    prompt: "Was it on? — Yes, it _____.",
    image_description_vi: "Một cái đèn đang bật.",
  });
  files.answers.answers.push({ question_id: "exam_picture_01", accepted_answers: ["was"] });

  const { files: daBo, soCauBo } = boCauTheoTranh(files);

  assert.equal(soCauBo, 1);
  assert.deepEqual(daBo.exercises.questions.map((cau) => cau.id), ["quiz_1_01", "exam_fill_01"]);
  assert.deepEqual(daBo.answers.answers.map((dapAn) => dapAn.question_id), ["quiz_1_01", "exam_fill_01"]);
  assert.deepEqual(kiemTraBaiHoc(daBo, 3), []);
  // Loại câu theo tranh không còn được hỗ trợ nếu lọt qua
  assert.ok(kiemTraBaiHoc(files, 3).some((dong) => dong.includes('"exam_picture_01": type không hỗ trợ')));
});

test("listening questions keep their audio file under the lesson folder and their transcript", () => {
  const files = taoBai();
  Object.assign(files.exercises.questions[0], { audio: "audio/mp31.mp3", listen_text: "The lamp is on." });

  const bai = chuanHoaBaiHoc(files);

  assert.equal(bai.questions[0].audio_path, "bai-03/audio/mp31.mp3");
  assert.equal(bai.questions[0].listen_text, "The lamp is on.");
  assert.deepEqual(kiemTraBaiHoc(files, 3), []);

  files.exercises.questions[0].audio = "../secret.mp3";
  assert.ok(kiemTraBaiHoc(files, 3).some((dong) => dong.includes("audio phải có dạng audio/<tên>.mp3")));
});

test("kiemTraBaiHoc accepts valid content", () => {
  assert.deepEqual(kiemTraBaiHoc(taoBai(), 3), []);
});

test("kiemTraBaiHoc reports broken answers, ids and lesson numbers", () => {
  const files = taoBai();
  files.exercises.lesson_number = 4;
  files.exercises.questions.push({ ...files.exercises.questions[0] });
  files.answers.answers[0].answer = "C";
  files.answers.answers[1].accepted_answers = [];
  files.answers.answers.push({ question_id: "khong_ton_tai", answer: "A" });
  files.lesson.vocabulary.push({ word: "Lamp", meaning_vi: "đèn" });

  const loi = kiemTraBaiHoc(files, 5);

  assert.ok(loi.some((dong) => dong.includes("khác số bài của thư mục (5)")));
  assert.ok(loi.some((dong) => dong.startsWith("exercises.json: lesson_number không khớp")));
  assert.ok(loi.some((dong) => dong.includes('"quiz_1_01": đáp án không nằm trong các lựa chọn')));
  assert.ok(loi.some((dong) => dong.includes('"quiz_1_01": id bị trùng')));
  assert.ok(loi.some((dong) => dong.includes('"exam_fill_01": thiếu đáp án')));
  assert.ok(loi.some((dong) => dong.includes('"khong_ton_tai" không có câu hỏi tương ứng')));
  assert.ok(loi.some((dong) => dong.includes('"Lamp": bị trùng')));
});

function taoDbGia() {
  const db = { courses: [], course_lessons: [], decks: [], cards: [], course_questions: [], giaiThichBiXoa: [] };
  let nextId = 1;
  const id = () => nextId++;

  return {
    db,
    async query(sql, params) {
      if (sql.startsWith("SELECT id FROM courses")) {
        return [db.courses.filter((row) => row.user_id === params[0] && row.slug === params[1])];
      }
      if (sql.includes("FROM course_lessons")) {
        return [db.course_lessons.filter((row) => row.course_id === params[0] && row.lesson_number === params[1])];
      }
      if (sql.includes("FROM decks")) {
        return [db.decks.filter((row) => row.id === params[0] && row.user_id === params[1])];
      }
      if (sql.includes("FROM cards")) return [db.cards.filter((row) => row.deck_id === params[0])];
      if (sql.startsWith("SELECT") && sql.includes("FROM course_questions")) {
        return [db.course_questions.filter((row) => row.lesson_id === params[0])];
      }
      if (sql.startsWith("DELETE FROM course_question_explanations")) {
        db.giaiThichBiXoa.push(...params[0]);
        return [{}];
      }
      if (sql.startsWith("DELETE FROM course_questions")) {
        const truoc = db.course_questions.length;
        db.course_questions = db.course_questions.filter(
          (row) => row.lesson_id !== params[0] || params[1].includes(row.question_key)
        );
        return [{ affectedRows: truoc - db.course_questions.length }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, params) {
      if (sql.startsWith("INSERT INTO courses")) {
        const [user_id, slug, title] = params;
        const hienCo = db.courses.find((row) => row.user_id === user_id && row.slug === slug);
        if (hienCo) hienCo.title = title;
        else db.courses.push({ id: id(), user_id, slug, title });
        return [{}];
      }
      if (sql.startsWith("INSERT INTO decks")) {
        const row = { id: id(), user_id: params[0], title: params[1] };
        db.decks.push(row);
        return [{ insertId: row.id }];
      }
      if (sql.startsWith("UPDATE decks")) return [{}];
      if (sql.startsWith("INSERT INTO cards")) {
        const [meaning_vi, , , , example_sentence, deck_id, term_en] = params;
        db.cards.push({ id: id(), deck_id, term_en, meaning_vi, example_sentence });
        return [{}];
      }
      if (sql.startsWith("UPDATE cards")) {
        const the = db.cards.find((row) => row.id === params[5]);
        the.meaning_vi = params[0];
        // COALESCE(?, example_sentence): file không có câu ví dụ thì giữ câu cũ
        if (params[4] !== null) the.example_sentence = params[4];
        return [{}];
      }
      if (sql.startsWith("INSERT INTO course_lessons")) {
        const [course_id, lesson_number, title, deck_id] = params;
        const hienCo = db.course_lessons.find(
          (row) => row.course_id === course_id && row.lesson_number === lesson_number
        );
        if (hienCo) Object.assign(hienCo, { title, deck_id });
        else db.course_lessons.push({ id: id(), course_id, lesson_number, title, deck_id });
        return [{}];
      }
      if (sql.startsWith("INSERT INTO course_questions")) {
        const [lesson_id, question_key, , , type, instruction, prompt, options, answer_key, accepted_answers, explanation] =
          params;
        const noiDung = { type, instruction, prompt, options, answer_key, accepted_answers, explanation };
        const hienCo = db.course_questions.find(
          (row) => row.lesson_id === lesson_id && row.question_key === question_key
        );
        if (hienCo) Object.assign(hienCo, noiDung);
        else db.course_questions.push({ id: id(), lesson_id, question_key, ...noiDung });
        return [{}];
      }
      throw new Error(`Unexpected execute: ${sql}`);
    },
  };
}

function thongKeMoi() {
  return { baiHoc: 0, boMoi: 0, tuMoi: 0, tuCapNhat: 0, cauHoi: 0, cauXoa: 0 };
}

test("napBaiHoc gives the owner a private deck and is idempotent", async () => {
  const conn = taoDbGia();
  const khoaHoc = { slug: "khoa-thu", title: "Khoá thử", description: "" };

  const lan1 = thongKeMoi();
  await napBaiHoc(conn, { userId: 9, khoaHoc, bai: chuanHoaBaiHoc(taoBai()) }, lan1);
  assert.deepEqual(lan1, { baiHoc: 1, boMoi: 1, tuMoi: 2, tuCapNhat: 0, cauHoi: 2, cauXoa: 0 });
  assert.deepEqual(
    conn.db.decks.map(({ user_id, title }) => ({ user_id, title })),
    [{ user_id: 9, title: "Bài 3 · Bài giả định" }]
  );

  // Lần 2: bớt một câu, sửa nghĩa một từ → cập nhật, không tạo bộ từ / câu trùng
  const files = taoBai();
  files.exercises.questions.pop();
  files.answers.answers.pop();
  files.lesson.vocabulary[0].meaning_vi = "đèn";
  delete files.lesson.vocabulary[0].example;
  files.lesson.vocabulary[1].example = "It was quiet last night.";
  const lan2 = thongKeMoi();
  await napBaiHoc(conn, { userId: 9, khoaHoc, bai: chuanHoaBaiHoc(files) }, lan2);

  assert.deepEqual(lan2, { baiHoc: 1, boMoi: 0, tuMoi: 0, tuCapNhat: 2, cauHoi: 1, cauXoa: 1 });
  assert.equal(conn.db.decks.length, 1);
  assert.equal(conn.db.course_lessons.length, 1);
  assert.deepEqual(
    conn.db.course_questions.map((row) => row.question_key),
    ["quiz_1_01"]
  );
  assert.equal(conn.db.cards.find((row) => row.term_en === "lamp").meaning_vi, "đèn");
  assert.equal(conn.db.cards.find((row) => row.term_en === "lamp").example_sentence, "The lamps were not on.");
  // Câu còn lại không đổi nội dung → giữ lời giải thích AI đã lưu
  assert.deepEqual(conn.db.giaiThichBiXoa, []);

  // Lần 3: sửa đề một câu → chỉ bỏ lời giải thích của câu đó
  files.exercises.questions[0].prompt = "The lamp _____ off.";
  await napBaiHoc(conn, { userId: 9, khoaHoc, bai: chuanHoaBaiHoc(files) }, thongKeMoi());
  assert.deepEqual(conn.db.giaiThichBiXoa, [conn.db.course_questions[0].id]);
  assert.equal(conn.db.cards.find((row) => row.term_en === "quiet").example_sentence, "It was quiet last night.");
});

test("kiemTraBaiHoc requires an example sentence to contain the word itself", () => {
  const files = taoBai();
  files.lesson.vocabulary[1].example = "The room was silent.";
  assert.deepEqual(kiemTraBaiHoc(files, 3), ['Từ #2 "quiet": câu ví dụ không chứa chính từ này']);
});

test("taoBaiLuyenThem keeps valid AI questions and drops broken or duplicate ones", () => {
  const tot = { nhom: "ngu_phap", de_bai: "They _____ at home.", lua_chon: ["was", "were", "is", "be"], dap_an: "b", giai_thich: "They dùng were." };
  const { extra, soCauBo } = taoBaiLuyenThem(
    [
      tot,
      { ...tot, de_bai: " they  _____ AT home. " }, // trùng đề
      { ...tot, de_bai: "The lamp _____ on." }, // trùng câu có sẵn trong bài
      { ...tot, de_bai: "Câu 3 lựa chọn", lua_chon: ["a", "b", "c"] },
      { ...tot, de_bai: "Lựa chọn trùng", lua_chon: ["a", "A", "b", "c"] },
      { ...tot, de_bai: "Đáp án lạ", dap_an: "E" },
      { nhom: "tu_vung", de_bai: "\"quiet\" nghĩa là gì?", lua_chon: ["yên tĩnh", "ồn ào", "vui", "buồn"], dap_an: "A" },
    ],
    { lessonNumber: 3, deBaiDaCo: ["The lamp _____ on."] }
  );

  assert.equal(soCauBo, 5);
  assert.deepEqual(extra.questions.map((cau) => [cau.id, cau.source, cau.section]), [
    ["extra_001", "extra", "ngu_phap"],
    ["extra_002", "extra", "tu_vung"],
  ]);
  assert.deepEqual(extra.questions[0].options[1], { key: "B", text: "were" });
  assert.deepEqual(extra.answers[0], {
    question_id: "extra_001",
    answer: "B",
    explanation_vi: "They dùng were.",
    provenance: "ai_generated",
  });
});

test("gopBaiLuyenThem appends extra questions so they pass the same checks and import", () => {
  const files = taoBai();
  const { extra } = taoBaiLuyenThem(
    [{ nhom: "ngu_phap", de_bai: "We _____ quiet.", lua_chon: ["was", "were", "is", "be"], dap_an: "B" }],
    { lessonNumber: 3 }
  );

  assert.equal(gopBaiLuyenThem(files, null), files);
  const gop = gopBaiLuyenThem(files, extra);
  assert.deepEqual(kiemTraBaiHoc(gop, 3), []);
  const bai = chuanHoaBaiHoc(gop);
  assert.equal(bai.questions.length, 3);
  assert.deepEqual(bai.questions[2], {
    question_key: "extra_001",
    source: "extra",
    section: "ngu_phap",
    type: "multiple_choice",
    instruction: null,
    prompt: "We _____ quiet.",
    options: [
      { key: "A", text: "was" },
      { key: "B", text: "were" },
      { key: "C", text: "is" },
      { key: "D", text: "be" },
    ],
    answer_key: "B",
    accepted_answers: null,
    explanation: null,
    answer_source: "ai_generated",
    audio_path: null,
    audio_file: null,
    listen_text: null,
    sort_order: 2,
  });
  // Không sửa file gốc
  assert.equal(files.exercises.questions.length, 2);
});

test("lichOnCauHoi only schedules questions that were answered wrong, with the word SRS rule", () => {
  const now = new Date("2026-09-27T03:00:00Z"); // 10:00 giờ VN
  const ngayMai = new Date("2026-09-27T17:00:00Z"); // 00:00 giờ VN ngày 28

  // Chưa từng sai, trả lời đúng: không vào lịch ôn
  assert.deepEqual(lichOnCauHoi(undefined, true, now), { level: 0, nextReviewAt: null });
  assert.deepEqual(lichOnCauHoi({ mastery_level: 0, next_review_at: null }, true, now), { level: 0, nextReviewAt: null });
  // Sai: vào lịch ở Lv0, ôn lại ngay
  assert.deepEqual(lichOnCauHoi(undefined, false, now), { level: 0, nextReviewAt: now });
  // Đang trong lịch: đúng lên 1 cấp (Lv1 → đến hạn 00:00 ngày mai), sai xuống 1 cấp
  assert.deepEqual(lichOnCauHoi({ mastery_level: 0, next_review_at: now }, true, now), { level: 1, nextReviewAt: ngayMai });
  assert.deepEqual(lichOnCauHoi({ mastery_level: 3, next_review_at: now }, false, now), { level: 2, nextReviewAt: now });
});

test("cacTraLoiCanGiaiThich lists every choice of a multiple-choice question", () => {
  const { cacTraLoiCanGiaiThich } = require("../src/utils/khoaHoc");
  const cau = {
    type: "multiple_choice",
    options: [{ key: "A", text: "go" }, { key: "B", text: "went" }, { key: "C", text: "gone" }],
    answer_key: "B",
  };
  assert.deepEqual(cacTraLoiCanGiaiThich(cau), [
    { answerNorm: "A", learnerAnswer: "A", isCorrect: false },
    { answerNorm: "B", learnerAnswer: "B", isCorrect: true },
    { answerNorm: "C", learnerAnswer: "C", isCorrect: false },
  ]);
});

test("cacTraLoiCanGiaiThich lists accepted answers of a fill-blank question once per normalized form", () => {
  const { cacTraLoiCanGiaiThich } = require("../src/utils/khoaHoc");
  const cau = { type: "fill_blank", accepted_answers: ["Went.", "went", "has gone"] };
  assert.deepEqual(cacTraLoiCanGiaiThich(cau), [
    { answerNorm: "went", learnerAnswer: "Went.", isCorrect: true },
    { answerNorm: "has gone", learnerAnswer: "has gone", isCorrect: true },
  ]);
});

test("parseLoiThuongGap reads fenced JSON, drops correct/duplicate/empty guesses", () => {
  const aiService = require("../src/services/aiService");
  const cau = { type: "fill_blank", accepted_answers: ["went"] };
  const text = '```json\n["goed", "Went", "go", "goed.", "", "gone", "goes", "going"]\n```';
  assert.deepEqual(aiService.parseLoiThuongGap(text, cau), ["goed", "go", "gone", "goes"]);
  assert.deepEqual(aiService.parseLoiThuongGap("không phải JSON", cau), []);
});

test("kiemTraFileGiaiThich keeps valid items and rejects wrong ids, options and mis-graded answers", () => {
  const { kiemTraFileGiaiThich } = require("../src/utils/khoaHoc");
  const cauTheoKey = new Map([
    ["q_mc", { id: 11, type: "multiple_choice", options: [{ key: "A" }, { key: "B" }], answer_key: "B" }],
    ["q_fill", { id: 12, type: "fill_blank", accepted_answers: ["went"] }],
  ]);
  const { hopLe, loi } = kiemTraFileGiaiThich(
    [
      { question_id: "q_mc", tra_loi: "a", dung: false, giai_thich: "Sai vì: ..." },
      { question_id: "q_mc", tra_loi: "B", dung: true, giai_thich: "Đúng rồi: ..." },
      { question_id: "q_mc", tra_loi: "C", dung: false, giai_thich: "x" }, // không có lựa chọn C
      { question_id: "q_fill", tra_loi: "Went.", dung: true, giai_thich: "Đúng rồi: ..." },
      { question_id: "q_fill", tra_loi: "goed", dung: false, giai_thich: "Sai vì: ..." },
      { question_id: "q_fill", tra_loi: "gone", dung: true, giai_thich: "x" }, // ChatGPT chấm nhầm
      { question_id: "khong_co", tra_loi: "A", dung: false, giai_thich: "x" },
      { question_id: "q_mc", tra_loi: "A", dung: false, giai_thich: "" }, // trống
    ],
    cauTheoKey
  );
  assert.deepEqual(hopLe, [
    { questionId: 11, answerNorm: "A", explanation: "Sai vì: ..." },
    { questionId: 11, answerNorm: "B", explanation: "Đúng rồi: ..." },
    { questionId: 12, answerNorm: "went", explanation: "Đúng rồi: ..." },
    { questionId: 12, answerNorm: "goed", explanation: "Sai vì: ..." },
  ]);
  assert.equal(loi.length, 4);
});
