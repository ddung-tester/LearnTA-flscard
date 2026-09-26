// Kiểm tra, chuẩn hoá và nạp nội dung khoá học riêng vào DB.
// Mỗi bài là 3 file do ChatGPT trích từ PDF: lesson.json, exercises.json, answers.json.
// Chạy lại nhiều lần an toàn: khớp khoá theo (user_id, slug), bài theo số bài, từ theo term_en,
// câu hỏi theo question_key. Câu hỏi không còn trong file bị xoá; từ vựng thì không xoá
// (người học có thể đã có tiến độ SRS trên các từ đó).

const MA_CAU_HOP_LE = /^[a-z0-9_-]{1,80}$/i;
// image_based_fill_blank: vẫn là điền từ, ảnh gốc chỉ còn mô tả
const LOAI_CAU = {
  multiple_choice: "multiple_choice",
  fill_blank: "fill_blank",
  image_based_fill_blank: "fill_blank",
};
const GIOI_HAN_TU = { term_en: 255, meaning_vi: 255, pronunciation: 255, part_of_speech: 50 };

function chuoi(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mangChuoi(value) {
  return Array.isArray(value) ? value.map(chuoi).filter(Boolean) : [];
}

/**
 * Chuẩn hoá câu trả lời gõ tay: không phân biệt hoa thường, bỏ khoảng trắng thừa
 * và dấu câu cuối câu, nháy cong (’) coi như nháy thẳng (').
 */
function chuanHoaTraLoi(text) {
  return String(text ?? "")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
}

function laTraLoiDung(cauHoi, traLoi) {
  if (cauHoi.type === "multiple_choice") {
    return chuoi(traLoi).toUpperCase() === cauHoi.answer_key;
  }
  const daChuanHoa = chuanHoaTraLoi(traLoi);
  return (
    Boolean(daChuanHoa) &&
    (cauHoi.accepted_answers || []).some((dapAn) => chuanHoaTraLoi(dapAn) === daChuanHoa)
  );
}

function chuanHoaNguPhap(muc) {
  return {
    id: chuoi(muc?.id),
    title: chuoi(muc?.title),
    pattern: chuoi(muc?.pattern),
    rules: mangChuoi(muc?.rules),
    examples: (Array.isArray(muc?.examples) ? muc.examples : [])
      .map((vd) => ({ en: chuoi(vd?.en), vi: chuoi(vd?.vi) }))
      .filter((vd) => vd.en),
  };
}

function chuanHoaCauHoi(cau, dapAn, index) {
  const type = LOAI_CAU[cau?.type] || null;
  const options = (Array.isArray(cau?.options) ? cau.options : []).map((luaChon) => ({
    key: chuoi(luaChon?.key).toUpperCase(),
    text: chuoi(luaChon?.text),
  }));
  const accepted = mangChuoi(dapAn?.accepted_answers);

  return {
    question_key: chuoi(cau?.id),
    source: chuoi(cau?.source) || "lesson",
    section: chuoi(cau?.section) || "khac",
    type,
    instruction: chuoi(cau?.instruction) || null,
    prompt: chuoi(cau?.prompt),
    options: type === "multiple_choice" ? options : null,
    answer_key: type === "multiple_choice" ? chuoi(dapAn?.answer).toUpperCase() || null : null,
    accepted_answers:
      type === "fill_blank" ? (accepted.length ? accepted : mangChuoi([dapAn?.answer])) : null,
    explanation: chuoi(dapAn?.explanation_vi) || null,
    answer_source: chuoi(dapAn?.provenance) || null,
    image_description: chuoi(cau?.image_description_vi) || null,
    sort_order: index,
  };
}

/**
 * Gộp 3 file của một bài thành dữ liệu sẵn sàng nạp vào DB.
 */
function chuanHoaBaiHoc({ lesson, exercises, answers }) {
  const dapAnTheoCau = new Map(
    (Array.isArray(answers?.answers) ? answers.answers : []).map((dapAn) => [
      chuoi(dapAn?.question_id),
      dapAn,
    ])
  );

  return {
    lesson_number: Number(lesson?.lesson_number),
    title: chuoi(lesson?.title),
    content: {
      grammar: (Array.isArray(lesson?.grammar) ? lesson.grammar : []).map(chuanHoaNguPhap),
      notes: mangChuoi(lesson?.learning_notes_vi),
    },
    vocabulary: (Array.isArray(lesson?.vocabulary) ? lesson.vocabulary : []).map((tu) => ({
      term_en: chuoi(tu?.word),
      meaning_vi: chuoi(tu?.meaning_vi),
      pronunciation: chuoi(tu?.pronunciation) || null,
      part_of_speech: chuoi(tu?.part_of_speech) || null,
    })),
    questions: (Array.isArray(exercises?.questions) ? exercises.questions : []).map((cau, index) =>
      chuanHoaCauHoi(cau, dapAnTheoCau.get(chuoi(cau?.id)), index)
    ),
  };
}

/**
 * @param soBai số bài lấy từ tên thư mục (bai-13) để đối chiếu với nội dung file
 * @returns {string[]} danh sách lỗi (rỗng nếu hợp lệ)
 */
function kiemTraBaiHoc(files, soBai) {
  const loi = [];
  const bai = chuanHoaBaiHoc(files);

  if (!Number.isInteger(bai.lesson_number) || bai.lesson_number <= 0) {
    loi.push("lesson.json: lesson_number không hợp lệ");
  } else if (soBai && bai.lesson_number !== soBai) {
    loi.push(`lesson.json: lesson_number ${bai.lesson_number} khác số bài của thư mục (${soBai})`);
  }
  for (const [ten, file] of [["exercises.json", files.exercises], ["answers.json", files.answers]]) {
    if (Number(file?.lesson_number) !== bai.lesson_number) {
      loi.push(`${ten}: lesson_number không khớp lesson.json`);
    }
  }
  if (!bai.title) loi.push("lesson.json: thiếu title");

  const tuDaCo = new Set();
  bai.vocabulary.forEach((tu, index) => {
    const noi = `Từ #${index + 1} "${tu.term_en}"`;
    if (!tu.term_en || !tu.meaning_vi) loi.push(`${noi}: thiếu từ hoặc nghĩa`);
    for (const [truong, toiDa] of Object.entries(GIOI_HAN_TU)) {
      if ((tu[truong] || "").length > toiDa) loi.push(`${noi}: ${truong} quá ${toiDa} ký tự`);
    }
    const khoa = tu.term_en.toLowerCase();
    if (tuDaCo.has(khoa)) loi.push(`${noi}: bị trùng`);
    tuDaCo.add(khoa);
  });

  bai.content.grammar.forEach((muc, index) => {
    if (!muc.title) loi.push(`Ngữ pháp #${index + 1}: thiếu title`);
  });

  if (bai.questions.length === 0) loi.push("exercises.json: chưa có câu hỏi nào");
  const maDaCo = new Set();
  bai.questions.forEach((cau, index) => {
    const noi = `Câu #${index + 1} "${cau.question_key}"`;
    if (!MA_CAU_HOP_LE.test(cau.question_key)) loi.push(`${noi}: id không hợp lệ`);
    if (maDaCo.has(cau.question_key)) loi.push(`${noi}: id bị trùng`);
    maDaCo.add(cau.question_key);
    if (!cau.type) loi.push(`${noi}: type không hỗ trợ`);
    if (!cau.prompt) loi.push(`${noi}: thiếu prompt`);

    if (cau.type === "multiple_choice") {
      const cacKey = cau.options.map((luaChon) => luaChon.key);
      if (cau.options.length < 2) loi.push(`${noi}: cần ít nhất 2 lựa chọn`);
      if (cau.options.some((luaChon) => !luaChon.key || !luaChon.text)) {
        loi.push(`${noi}: có lựa chọn thiếu key hoặc text`);
      }
      if (new Set(cacKey).size !== cacKey.length) loi.push(`${noi}: key lựa chọn bị trùng`);
      if (!cacKey.includes(cau.answer_key)) loi.push(`${noi}: đáp án không nằm trong các lựa chọn`);
    }
    if (cau.type === "fill_blank" && cau.accepted_answers.length === 0) {
      loi.push(`${noi}: thiếu đáp án (accepted_answers)`);
    }
  });

  const cacCauHoi = new Set(bai.questions.map((cau) => cau.question_key));
  for (const dapAn of Array.isArray(files.answers?.answers) ? files.answers.answers : []) {
    if (!cacCauHoi.has(chuoi(dapAn?.question_id))) {
      loi.push(`answers.json: đáp án "${chuoi(dapAn?.question_id)}" không có câu hỏi tương ứng`);
    }
  }

  return loi;
}

async function napBoTuCuaBai(connection, { userId, bai, deckIdCu, tieuDeKhoa }, thongKe) {
  const tieuDe = `Bài ${bai.lesson_number} · ${bai.title}`.slice(0, 255);
  let deckId = null;

  if (deckIdCu) {
    // Chỉ dùng lại bộ từ nếu vẫn thuộc chủ khoá (phòng bộ từ đã bị xoá hoặc đổi chủ)
    const [dong] = await connection.query("SELECT id FROM decks WHERE id = ? AND user_id = ? LIMIT 1", [
      deckIdCu,
      userId,
    ]);
    deckId = dong[0]?.id ?? null;
  }

  if (deckId) {
    await connection.execute("UPDATE decks SET title = ?, description = ? WHERE id = ?", [
      tieuDe,
      tieuDeKhoa,
      deckId,
    ]);
  } else {
    // Bộ từ riêng của chủ khoá: người khác không đọc được (deckController.canReadDeck)
    const [ketQua] = await connection.execute(
      "INSERT INTO decks (user_id, title, description) VALUES (?, ?, ?)",
      [userId, tieuDe, tieuDeKhoa]
    );
    deckId = ketQua.insertId;
    thongKe.boMoi += 1;
  }

  const [theCu] = await connection.query("SELECT id, term_en FROM cards WHERE deck_id = ?", [deckId]);
  const theoTu = new Map(theCu.map((the) => [the.term_en.trim().toLowerCase(), the.id]));

  for (const [index, tu] of bai.vocabulary.entries()) {
    const cardId = theoTu.get(tu.term_en.toLowerCase());
    const noiDung = [tu.meaning_vi, tu.pronunciation, tu.part_of_speech, index];

    if (cardId) {
      await connection.execute(
        "UPDATE cards SET meaning_vi = ?, pronunciation = ?, part_of_speech = ?, sort_order = ? WHERE id = ?",
        [...noiDung, cardId]
      );
      thongKe.tuCapNhat += 1;
    } else {
      await connection.execute(
        `INSERT INTO cards (meaning_vi, pronunciation, part_of_speech, sort_order, deck_id, term_en)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [...noiDung, deckId, tu.term_en]
      );
      thongKe.tuMoi += 1;
    }
  }

  return deckId;
}

async function napCauHoi(connection, lessonId, questions, thongKe) {
  // Nội dung câu có thể đã đổi: bỏ lời giải thích AI cũ của bài này
  await connection.query(
    `DELETE e FROM course_question_explanations e
     JOIN course_questions q ON q.id = e.question_id
     WHERE q.lesson_id = ?`,
    [lessonId]
  );

  for (const cau of questions) {
    await connection.execute(
      `INSERT INTO course_questions
         (lesson_id, question_key, source, section, type, instruction, prompt, options, answer_key,
          accepted_answers, explanation, answer_source, image_description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         source = VALUES(source), section = VALUES(section), type = VALUES(type),
         instruction = VALUES(instruction), prompt = VALUES(prompt), options = VALUES(options),
         answer_key = VALUES(answer_key), accepted_answers = VALUES(accepted_answers),
         explanation = VALUES(explanation), answer_source = VALUES(answer_source),
         image_description = VALUES(image_description), sort_order = VALUES(sort_order)`,
      [
        lessonId,
        cau.question_key,
        cau.source,
        cau.section,
        cau.type,
        cau.instruction,
        cau.prompt,
        cau.options ? JSON.stringify(cau.options) : null,
        cau.answer_key,
        cau.accepted_answers ? JSON.stringify(cau.accepted_answers) : null,
        cau.explanation,
        cau.answer_source,
        cau.image_description,
        cau.sort_order,
      ]
    );
  }
  thongKe.cauHoi += questions.length;

  const [xoa] = await connection.query(
    "DELETE FROM course_questions WHERE lesson_id = ? AND question_key NOT IN (?)",
    [lessonId, questions.map((cau) => cau.question_key)]
  );
  thongKe.cauXoa += xoa.affectedRows || 0;
}

/**
 * Nạp một bài đã chuẩn hoá cho chủ khoá. Gọi trong một transaction.
 * @param khoaHoc { slug, title, description }
 */
async function napBaiHoc(connection, { userId, khoaHoc, bai }, thongKe) {
  await connection.execute(
    `INSERT INTO courses (user_id, slug, title, description) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
    [userId, khoaHoc.slug, khoaHoc.title, khoaHoc.description]
  );
  const [khoa] = await connection.query(
    "SELECT id FROM courses WHERE user_id = ? AND slug = ? LIMIT 1",
    [userId, khoaHoc.slug]
  );
  const courseId = khoa[0].id;

  const [baiCu] = await connection.query(
    "SELECT id, deck_id FROM course_lessons WHERE course_id = ? AND lesson_number = ? LIMIT 1",
    [courseId, bai.lesson_number]
  );
  const deckId = await napBoTuCuaBai(
    connection,
    { userId, bai, deckIdCu: baiCu[0]?.deck_id, tieuDeKhoa: khoaHoc.title },
    thongKe
  );

  await connection.execute(
    `INSERT INTO course_lessons (course_id, lesson_number, title, deck_id, content)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), deck_id = VALUES(deck_id), content = VALUES(content)`,
    [courseId, bai.lesson_number, bai.title, deckId, JSON.stringify(bai.content)]
  );
  const [baiMoi] = await connection.query(
    "SELECT id FROM course_lessons WHERE course_id = ? AND lesson_number = ? LIMIT 1",
    [courseId, bai.lesson_number]
  );

  await napCauHoi(connection, baiMoi[0].id, bai.questions, thongKe);
  thongKe.baiHoc += 1;
}

module.exports = {
  chuanHoaTraLoi,
  laTraLoiDung,
  chuanHoaBaiHoc,
  kiemTraBaiHoc,
  napBaiHoc,
};
