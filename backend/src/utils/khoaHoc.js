// Kiểm tra, chuẩn hoá và nạp nội dung khoá học riêng vào DB.
// Mỗi bài là 3 file do ChatGPT trích từ PDF: lesson.json, exercises.json, answers.json.
// Chạy lại nhiều lần an toàn: khớp khoá theo (user_id, slug), bài theo số bài, từ theo term_en,
// câu hỏi theo question_key. Câu hỏi không còn trong file bị xoá; từ vựng thì không xoá
// (người học có thể đã có tiến độ SRS trên các từ đó).

const { cauChuaTu } = require("./noiDungLoTrinh");
const { scheduleAnswer } = require("./srs");

const MA_CAU_HOP_LE = /^[a-z0-9_-]{1,80}$/i;
// File nghe nằm trong thư mục audio/ của bài (tải lên bucket Cloud Storage riêng tư, xem docs/khoa-hoc-48-ngay.md)
const FILE_AUDIO_HOP_LE = /^audio\/[a-z0-9_.-]+\.mp3$/i;
const DO_DAI_LOI_THOAI_TOI_DA = 2000;
const LOAI_CAU = {
  multiple_choice: "multiple_choice",
  fill_blank: "fill_blank",
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

/**
 * Lịch ôn của một câu bài tập sau khi trả lời, cùng luật SRS với từ vựng (utils/srs.js).
 * Chỉ câu từng làm SAI mới vào lịch ôn: làm đúng ngay thì không bị hỏi lại.
 * @param hienTai dòng course_question_progress hiện có ({ mastery_level, next_review_at }) hoặc undefined
 * @returns {{ level: number, nextReviewAt: Date | null }} nextReviewAt null = không nằm trong lịch ôn
 */
function lichOnCauHoi(hienTai, dung, now = new Date()) {
  const dangOn = Boolean(hienTai?.next_review_at);
  if (dung && !dangOn) return { level: hienTai?.mastery_level || 0, nextReviewAt: null };
  return scheduleAnswer(dangOn ? hienTai.mastery_level : 0, dung, now);
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

/**
 * Các câu trả lời của một câu bài tập cần có lời giải thích tạo sẵn (scripts/sinh-giai-thich.js):
 * trắc nghiệm = mọi lựa chọn (đúng lẫn sai); điền từ = mọi đáp án được chấp nhận.
 * answerNorm khớp đúng khoá cache mà server dùng khi người học trả lời (explainQuestion).
 */
function cacTraLoiCanGiaiThich(cauHoi) {
  if (cauHoi.type === "multiple_choice") {
    return (cauHoi.options || []).map(({ key }) => ({
      answerNorm: key.toUpperCase(),
      learnerAnswer: key,
      isCorrect: key.toUpperCase() === cauHoi.answer_key,
    }));
  }
  const daCo = new Set();
  const ketQua = [];
  for (const dapAn of cauHoi.accepted_answers || []) {
    const answerNorm = chuanHoaTraLoi(dapAn);
    if (!answerNorm || daCo.has(answerNorm)) continue;
    daCo.add(answerNorm);
    ketQua.push({ answerNorm, learnerAnswer: dapAn, isCorrect: true });
  }
  return ketQua;
}

const DO_DAI_GIAI_THICH_TOI_DA = 1200;

/**
 * Kiểm tra file giai-thich*.json do ChatGPT soạn (docs/khoa-hoc-48-ngay.md) trước khi nạp vào cache.
 * cauTheoKey: Map question_key → câu hỏi trong DB ({ id, type, options, answer_key, accepted_answers }).
 * Chấm lại bằng luật của server: dòng ghi "dung" sai sự thật, sai id, sai lựa chọn hay trống đều bị bỏ.
 */
function kiemTraFileGiaiThich(items, cauTheoKey) {
  const hopLe = [];
  const loi = [];
  (Array.isArray(items) ? items : []).forEach((item, viTri) => {
    const nhan = `dòng ${viTri + 1} (${item?.question_id ?? "?"} / ${item?.tra_loi ?? "?"})`;
    const cau = cauTheoKey.get(chuoi(item?.question_id));
    const traLoi = chuoi(item?.tra_loi);
    const explanation = chuoi(item?.giai_thich).slice(0, DO_DAI_GIAI_THICH_TOI_DA);
    if (!cau) return loi.push(`${nhan}: không có câu này trong buổi`);
    if (!traLoi || !explanation) return loi.push(`${nhan}: thiếu câu trả lời hoặc lời giải thích`);

    const laTracNghiem = cau.type === "multiple_choice";
    const answerNorm = laTracNghiem ? traLoi.toUpperCase() : chuanHoaTraLoi(traLoi);
    if (laTracNghiem && !(cau.options || []).some((option) => option.key === answerNorm)) {
      return loi.push(`${nhan}: không có lựa chọn ${answerNorm}`);
    }
    if (Boolean(item.dung) !== laTraLoiDung(cau, traLoi)) {
      return loi.push(`${nhan}: ghi "dung": ${Boolean(item.dung)} nhưng chấm thật là ${!item.dung}`);
    }
    hopLe.push({ questionId: cau.id, answerNorm, explanation });
  });
  return { hopLe, loi };
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

function chuanHoaCauHoi(cau, dapAn, index, lessonNumber) {
  const audio = chuoi(cau?.audio);
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
    // Đường dẫn trong thư mục khoá: bai-29/audio/mp31.mp3 (object: <slug khoá>/<audio_path>)
    audio_path: audio ? `bai-${String(lessonNumber).padStart(2, "0")}/${audio}` : null,
    audio_file: audio || null,
    listen_text: chuoi(cau?.listen_text) || null,
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
      // Câu ví dụ (không bắt buộc): có thì từ vựng dùng được chế độ Ngữ cảnh
      example_sentence: chuoi(tu?.example) || null,
    })),
    questions: (Array.isArray(exercises?.questions) ? exercises.questions : []).map((cau, index) =>
      chuanHoaCauHoi(cau, dapAnTheoCau.get(chuoi(cau?.id)), index, Number(lesson?.lesson_number))
    ),
  };
}

const CHU_LUA_CHON = ["A", "B", "C", "D"];

function chuanHoaDeBai(text) {
  return chuoi(text).toLowerCase().replace(/\s+/g, " ");
}

/**
 * Đổi các câu Gemini sinh (scripts/sinh-bai-luyen-them.js) thành extra.json, cùng dạng exercises + answers.
 * Bỏ từng câu hỏng (không đủ 4 lựa chọn khác nhau, đáp án không phải A–D, trùng đề) thay vì bỏ cả bài.
 * @returns {{ extra: { lesson_number, questions, answers }, soCauBo: number }}
 */
function taoBaiLuyenThem(cauTho, { lessonNumber, deBaiDaCo = [] }) {
  const daCo = new Set(deBaiDaCo.map(chuanHoaDeBai));
  const questions = [];
  const answers = [];
  let soCauBo = 0;

  for (const cau of Array.isArray(cauTho) ? cauTho : []) {
    const deBai = chuoi(cau?.de_bai);
    const luaChon = mangChuoi(cau?.lua_chon);
    const dapAn = chuoi(cau?.dap_an).toUpperCase();
    const hopLe =
      deBai &&
      luaChon.length === 4 &&
      new Set(luaChon.map((text) => text.toLowerCase())).size === 4 &&
      CHU_LUA_CHON.includes(dapAn) &&
      !daCo.has(chuanHoaDeBai(deBai));
    if (!hopLe) {
      soCauBo += 1;
      continue;
    }

    daCo.add(chuanHoaDeBai(deBai));
    const id = `extra_${String(questions.length + 1).padStart(3, "0")}`;
    questions.push({
      id,
      source: "extra",
      section: cau?.nhom === "tu_vung" ? "tu_vung" : "ngu_phap",
      type: "multiple_choice",
      prompt: deBai,
      options: luaChon.map((text, index) => ({ key: CHU_LUA_CHON[index], text })),
    });
    answers.push({
      question_id: id,
      answer: dapAn,
      explanation_vi: chuoi(cau?.giai_thich),
      provenance: "ai_generated",
    });
  }

  return { extra: { lesson_number: lessonNumber, questions, answers }, soCauBo };
}

// App không hiện được tranh của tài liệu nên bỏ hẳn câu hỏi theo tranh
function laCauTheoTranh(cau) {
  return (
    cau?.type === "image_based_fill_blank" ||
    cau?.section === "picture_answers" ||
    Boolean(chuoi(cau?.image_description_vi))
  );
}

/**
 * Bỏ câu hỏi theo tranh (và đáp án của chúng) khỏi 3 file của bài trước khi kiểm tra / nạp.
 * @returns {{ files, soCauBo: number }}
 */
function boCauTheoTranh(files) {
  const cauHoi = Array.isArray(files.exercises?.questions) ? files.exercises.questions : [];
  const maBo = new Set(cauHoi.filter(laCauTheoTranh).map((cau) => chuoi(cau?.id)));
  if (maBo.size === 0) return { files, soCauBo: 0 };
  return {
    files: {
      ...files,
      exercises: { ...files.exercises, questions: cauHoi.filter((cau) => !laCauTheoTranh(cau)) },
      answers: {
        ...files.answers,
        answers: (files.answers?.answers || []).filter((dapAn) => !maBo.has(chuoi(dapAn?.question_id))),
      },
    },
    soCauBo: maBo.size,
  };
}

/** Gộp bài luyện thêm (extra.json, nếu có) vào 3 file của bài trước khi kiểm tra / nạp */
function gopBaiLuyenThem(files, extra) {
  if (!extra) return files;
  return {
    ...files,
    exercises: {
      ...files.exercises,
      questions: [...(files.exercises?.questions || []), ...(extra.questions || [])],
    },
    answers: {
      ...files.answers,
      answers: [...(files.answers?.answers || []), ...(extra.answers || [])],
    },
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
    // Chế độ Ngữ cảnh che chính từ trong câu ví dụ → câu phải chứa từ
    if (tu.example_sentence && tu.term_en && !cauChuaTu(tu.example_sentence, tu.term_en)) {
      loi.push(`${noi}: câu ví dụ không chứa chính từ này`);
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
    if (cau.audio_file && !FILE_AUDIO_HOP_LE.test(cau.audio_file)) {
      loi.push(`${noi}: audio phải có dạng audio/<tên>.mp3`);
    }
    if ((cau.listen_text || "").length > DO_DAI_LOI_THOAI_TOI_DA) {
      loi.push(`${noi}: listen_text quá ${DO_DAI_LOI_THOAI_TOI_DA} ký tự`);
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
    const noiDung = [tu.meaning_vi, tu.pronunciation, tu.part_of_speech, index, tu.example_sentence];

    if (cardId) {
      // File không có câu ví dụ thì giữ câu đang có (vd. đã sinh bằng AI)
      await connection.execute(
        `UPDATE cards
         SET meaning_vi = ?, pronunciation = ?, part_of_speech = ?, sort_order = ?,
             example_sentence = COALESCE(?, example_sentence)
         WHERE id = ?`,
        [...noiDung, cardId]
      );
      thongKe.tuCapNhat += 1;
    } else {
      await connection.execute(
        `INSERT INTO cards (meaning_vi, pronunciation, part_of_speech, sort_order, example_sentence, deck_id, term_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [...noiDung, deckId, tu.term_en]
      );
      thongKe.tuMoi += 1;
    }
  }

  return deckId;
}

// Những gì lời giải thích AI dựa vào (aiService.buildCourseExplanationPrompt); đổi thì giải thích cũ hết đúng
function noiDungGiaiThich(cau) {
  const mang = (value) => (typeof value === "string" ? JSON.parse(value) : value) || [];
  return JSON.stringify([
    cau.type,
    cau.instruction || null,
    cau.prompt,
    cau.listen_text || null,
    cau.explanation || null,
    mang(cau.options).map((luaChon) => [luaChon.key, luaChon.text]),
    cau.answer_key || null,
    mang(cau.accepted_answers),
  ]);
}

async function napCauHoi(connection, lessonId, questions, thongKe) {
  // Chỉ bỏ lời giải thích AI đã lưu của câu có nội dung đổi; câu giữ nguyên thì dùng lại (đỡ gọi Gemini)
  const [cauCu] = await connection.query(
    `SELECT id, question_key, type, instruction, prompt, listen_text, explanation,
            options, answer_key, accepted_answers
     FROM course_questions
     WHERE lesson_id = ?`,
    [lessonId]
  );
  const cuTheoMa = new Map(cauCu.map((cau) => [cau.question_key, cau]));
  const idCauDoi = questions
    .map((cau) => [cuTheoMa.get(cau.question_key), cau])
    .filter(([cu, moi]) => cu && noiDungGiaiThich(cu) !== noiDungGiaiThich(moi))
    .map(([cu]) => cu.id);
  if (idCauDoi.length > 0) {
    await connection.query("DELETE FROM course_question_explanations WHERE question_id IN (?)", [idCauDoi]);
  }

  for (const cau of questions) {
    await connection.execute(
      `INSERT INTO course_questions
         (lesson_id, question_key, source, section, type, instruction, prompt, options, answer_key,
          accepted_answers, explanation, answer_source, audio_path, listen_text, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         source = VALUES(source), section = VALUES(section), type = VALUES(type),
         instruction = VALUES(instruction), prompt = VALUES(prompt), options = VALUES(options),
         answer_key = VALUES(answer_key), accepted_answers = VALUES(accepted_answers),
         explanation = VALUES(explanation), answer_source = VALUES(answer_source),
         audio_path = VALUES(audio_path), listen_text = VALUES(listen_text), sort_order = VALUES(sort_order)`,
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
        cau.audio_path,
        cau.listen_text,
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
  cacTraLoiCanGiaiThich,
  kiemTraFileGiaiThich,
  chuanHoaTraLoi,
  laTraLoiDung,
  lichOnCauHoi,
  chuanHoaBaiHoc,
  kiemTraBaiHoc,
  taoBaiLuyenThem,
  gopBaiLuyenThem,
  boCauTheoTranh,
  napBaiHoc,
};
