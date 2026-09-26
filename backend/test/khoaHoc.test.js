const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  chuanHoaBaiHoc,
  chuanHoaTraLoi,
  kiemTraBaiHoc,
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
        { word: "lamp", part_of_speech: "noun", meaning_vi: "cái đèn", pronunciation: "/læmp/" },
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
          id: "exam_picture_01",
          source: "exam",
          section: "picture_answers",
          type: "image_based_fill_blank",
          instruction: "Chỉ điền phần còn thiếu.",
          prompt: "Is it a lamp? — Yes, it _____.",
          image_description_vi: "Một cái đèn bàn.",
        },
      ],
    },
    answers: {
      lesson_number: 3,
      answers: [
        { question_id: "quiz_1_01", answer: "a", explanation_vi: "Chủ ngữ số ít dùng is.", provenance: "answer_pdf" },
        { question_id: "exam_picture_01", accepted_answers: ["is"], provenance: "answer_pdf" },
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
  });
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
    image_description: null,
    sort_order: 0,
  });
  assert.equal(bai.questions[1].type, "fill_blank");
  assert.deepEqual(bai.questions[1].accepted_answers, ["is"]);
  assert.equal(bai.questions[1].image_description, "Một cái đèn bàn.");
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
  assert.ok(loi.some((dong) => dong.includes('"exam_picture_01": thiếu đáp án')));
  assert.ok(loi.some((dong) => dong.includes('"khong_ton_tai" không có câu hỏi tương ứng')));
  assert.ok(loi.some((dong) => dong.includes('"Lamp": bị trùng')));
});

function taoDbGia() {
  const db = { courses: [], course_lessons: [], decks: [], cards: [], course_questions: [] };
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
      if (sql.startsWith("DELETE e FROM course_question_explanations")) return [{}];
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
        const [meaning_vi, , , , deck_id, term_en] = params;
        db.cards.push({ id: id(), deck_id, term_en, meaning_vi });
        return [{}];
      }
      if (sql.startsWith("UPDATE cards")) {
        db.cards.find((row) => row.id === params[4]).meaning_vi = params[0];
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
        const [lesson_id, question_key, , , , , prompt] = params;
        const hienCo = db.course_questions.find(
          (row) => row.lesson_id === lesson_id && row.question_key === question_key
        );
        if (hienCo) hienCo.prompt = prompt;
        else db.course_questions.push({ id: id(), lesson_id, question_key, prompt });
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
});
