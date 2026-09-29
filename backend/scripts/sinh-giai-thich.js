/**
 * sinh-giai-thich.js — Tạo sẵn lời giải thích AI cho câu bài tập của khoá học riêng, để khi học
 * chỉ việc hiện ra (không chờ AI). Trắc nghiệm: mọi lựa chọn (đúng lẫn sai); điền từ: mọi đáp án đúng.
 * Ghi vào bảng cache course_question_explanations (cùng khoá mà POST /explain đọc).
 *
 * Chạy (trong backend/, cần proxy Cloud SQL):
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13          đếm số lời giải thích cần tạo (không gọi AI)
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13 --thu    tạo thử vài mẫu để soát, không ghi DB
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13 --apply  tạo và ghi DB (bỏ qua câu trả lời đã có)
 *   --ghi-de: thay cả lời giải thích đã có; --tao-lai-truoc=2026-09-29: chỉ thay những lời tạo trước ngày đó
 *   (vd. sau khi đổi prompt); --bai=tat-ca cho mọi buổi. Bị ngắt giữa chừng thì chạy lại: phần đã xong được bỏ qua.
 *   --moi-phut=10 (mặc định): số lượt gọi AI tối đa mỗi phút. Gói miễn phí của Gemini chỉ cho 15 lượt/phút/model
 *   và DÙNG CHUNG với website đang chạy, nên để thấp hơn 15; gói trả phí có thể đặt cao (vd. 300).
 *   --tu-file: KHÔNG gọi AI — nạp các file bai-XX/giai-thich*.json do ChatGPT soạn theo prompt ở
 *   docs/khoa-hoc-48-ngay.md (mục "Prompt tạo sẵn lời giải thích"); không --apply thì chỉ kiểm tra file.
 *   --loi-thuong-gap: câu điền từ còn được AI đoán trước 4 đáp án SAI hay gặp và tạo sẵn lời giải thích cho chúng.
 *   Dừng sớm khi AI lỗi liên tiếp (thường là hết hạn mức API) để không đốt lượt gọi.
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");
const { doanLoiThuongGap, explainCourseQuestion, MODEL_GIAI_THICH_SINH_SAN } = require("../src/services/aiService");
const { cacTraLoiCanGiaiThich, chuanHoaTraLoi, kiemTraFileGiaiThich } = require("../src/utils/khoaHoc");
const { docJson: docFileJson, docThamSo, timCacBai } = require("./thuMucKhoaHoc");

const SO_LUONG_SONG_SONG = 4;
const SO_LAN_THU = 4;
const SO_MAU_THU = 4;
const SO_LOI_LIEN_TIEP_TOI_DA = 12;

function docJson(value, macDinh) {
  if (value === null || value === undefined) return macDinh;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return macDinh;
  }
}

const cho = (ms) => new Promise((xong) => setTimeout(xong, ms));

// Giãn đều các lượt gọi AI theo --moi-phut (dùng chung cho mọi luồng)
const soLuotMoiPhut = Math.max(1, Number(docThamSo("moi-phut")) || 10);
let luotTiepTheo = 0;
async function choLuotGoi() {
  const bayGio = Date.now();
  const luotCuaMinh = Math.max(bayGio, luotTiepTheo);
  luotTiepTheo = luotCuaMinh + 60000 / soLuotMoiPhut;
  await cho(luotCuaMinh - bayGio);
}

// Quá tải/hết lượt (429, 503) thì chờ lâu dần rồi thử lại
async function coThuLai(lam) {
  for (let lan = 1; ; lan += 1) {
    try {
      await choLuotGoi();
      return await lam();
    } catch (error) {
      if (lan >= SO_LAN_THU) throw error;
      await cho(2000 * 2 ** lan);
    }
  }
}

const giaiThichCoThuLai = (input) =>
  coThuLai(() => explainCourseQuestion(input, { models: MODEL_GIAI_THICH_SINH_SAN }));

function chuanHoaCau(dong) {
  return {
    id: dong.id,
    type: dong.type,
    instruction: dong.instruction || null,
    prompt: dong.prompt,
    options: docJson(dong.options, null),
    answer_key: dong.answer_key || null,
    accepted_answers: docJson(dong.accepted_answers, null),
    explanation: dong.explanation || null,
    listen_text: dong.listen_text || null,
  };
}

const LUU_GIAI_THICH = `INSERT INTO course_question_explanations (question_id, answer_norm, explanation) VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE explanation = VALUES(explanation), created_at = CURRENT_TIMESTAMP`;

// --tu-file: nạp lời giải thích ChatGPT đã soạn (bai-XX/giai-thich*.json), kiểm tra kỹ trước khi ghi
async function napTuFile(cauHoi, soBai, apply) {
  let tongGhi = 0;
  for (const { soBai: so, thuMuc } of timCacBai(soBai)) {
    const cacFile = fs.readdirSync(thuMuc).filter((ten) => /^giai-thich.*\.json$/.test(ten)).sort();
    if (cacFile.length === 0) continue;

    const cauCuaBai = cauHoi.filter((dong) => dong.lesson_number === so);
    const cauTheoKey = new Map(cauCuaBai.map((dong) => [dong.question_key, chuanHoaCau(dong)]));
    const items = cacFile.flatMap((ten) => {
      const duLieu = docFileJson(path.join(thuMuc, ten));
      return Array.isArray(duLieu) ? duLieu : duLieu.items || [];
    });
    const { hopLe, loi } = kiemTraFileGiaiThich(items, cauTheoKey);

    // Độ phủ: mọi lựa chọn trắc nghiệm + đáp án đúng của câu điền từ phải có lời giải thích
    const daCo = new Set(hopLe.map((muc) => `${muc.questionId}|${muc.answerNorm}`));
    const thieu = [...cauTheoKey.entries()].flatMap(([key, cau]) =>
      cacTraLoiCanGiaiThich(cau)
        .filter((traLoi) => !daCo.has(`${cau.id}|${traLoi.answerNorm}`))
        .map((traLoi) => `${key}/${traLoi.answerNorm}`)
    );
    const soLoiThuongGap = hopLe.filter((muc) => {
      const cau = [...cauTheoKey.values()].find((c) => c.id === muc.questionId);
      return cau.type !== "multiple_choice" && !cacTraLoiCanGiaiThich(cau).some((t) => t.answerNorm === muc.answerNorm);
    }).length;

    console.log(
      `Bài ${so} (${cacFile.join(", ")}): ${hopLe.length} lời hợp lệ (${soLoiThuongGap} cho lỗi hay gặp), ` +
        `${loi.length} dòng bị bỏ, còn thiếu ${thieu.length}`
    );
    loi.slice(0, 8).forEach((dong) => console.log(`   ⚠ ${dong}`));
    if (thieu.length) console.log(`   thiếu: ${thieu.slice(0, 10).join(", ")}${thieu.length > 10 ? ", ..." : ""}`);

    if (apply) {
      for (const muc of hopLe) {
        await pool.query(LUU_GIAI_THICH, [muc.questionId, muc.answerNorm, muc.explanation]);
      }
      tongGhi += hopLe.length;
    }
  }
  console.log(apply ? `✅ Đã ghi ${tongGhi} lời giải thích từ file` : "Chỉ kiểm tra. Thêm --apply để ghi DB.");
}

/** Chạy lam(mục) cho cả danh sách với SO_LUONG_SONG_SONG luồng; dừng sớm khi lỗi liên tiếp quá nhiều. */
async function chaySongSong(danhSach, lam, nhan) {
  const thongKe = { xong: 0, loi: 0, dungSom: false };
  let loiLienTiep = 0;
  let viTri = 0;
  async function thoLam() {
    while (viTri < danhSach.length && loiLienTiep < SO_LOI_LIEN_TIEP_TOI_DA) {
      const muc = danhSach[viTri];
      viTri += 1;
      try {
        await lam(muc);
        thongKe.xong += 1;
        loiLienTiep = 0;
      } catch (error) {
        thongKe.loi += 1;
        loiLienTiep += 1;
        const lyDo = error.status ? `HTTP ${error.status} ${error.statusText || ""}` : error.message;
        console.error(`  ⚠ ${nhan(muc)}: ${String(lyDo).slice(0, 160)}`);
      }
      if ((thongKe.xong + thongKe.loi) % 50 === 0) console.log(`  ... ${thongKe.xong + thongKe.loi}/${danhSach.length}`);
    }
  }
  await Promise.all(Array.from({ length: SO_LUONG_SONG_SONG }, thoLam));
  if (loiLienTiep >= SO_LOI_LIEN_TIEP_TOI_DA) {
    thongKe.dungSom = true;
    console.error(`⛔ Dừng sớm: ${SO_LOI_LIEN_TIEP_TOI_DA} lỗi liên tiếp (có thể hết hạn mức API). Chạy lại sau để làm tiếp.`);
  }
  return thongKe;
}

async function main() {
  const email = docThamSo("email");
  const bai = docThamSo("bai");
  if (!email || !bai) {
    console.error("❌ Cần --email=<email chủ khoá> và --bai=<số bài | tat-ca>");
    process.exit(1);
  }
  const ghiDe = process.argv.includes("--ghi-de");
  const apply = process.argv.includes("--apply");
  const thu = process.argv.includes("--thu");
  const loiThuongGap = process.argv.includes("--loi-thuong-gap");
  const taoLaiTruoc = docThamSo("tao-lai-truoc") ? new Date(docThamSo("tao-lai-truoc")) : null;
  if (taoLaiTruoc && Number.isNaN(taoLaiTruoc.getTime())) throw new Error("--tao-lai-truoc phải là ngày YYYY-MM-DD");

  const [nguoiDung] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (!nguoiDung[0]) throw new Error(`không có tài khoản với email ${email}`);

  const [cauHoi] = await pool.query(
    `SELECT q.*, l.lesson_number, l.title AS lesson_title, l.content AS lesson_content
     FROM course_questions q
     JOIN course_lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE c.user_id = ? ${bai === "tat-ca" ? "" : "AND l.lesson_number = ?"}
     ORDER BY l.lesson_number, q.id`,
    bai === "tat-ca" ? [nguoiDung[0].id] : [nguoiDung[0].id, Number(bai)]
  );
  if (cauHoi.length === 0) throw new Error(`không có câu bài tập nào cho --bai=${bai}`);

  if (process.argv.includes("--tu-file")) {
    await napTuFile(cauHoi, bai === "tat-ca" ? undefined : Number(bai), apply);
    return;
  }

  const [daCo] = await pool.query(
    `SELECT question_id, answer_norm, created_at FROM course_question_explanations WHERE question_id IN (?)`,
    [cauHoi.map((cau) => cau.id)]
  );
  // Lời tạo trước --tao-lai-truoc coi như chưa có (sẽ được tạo lại)
  const khoaDaCo = new Set(
    daCo
      .filter((dong) => !taoLaiTruoc || new Date(dong.created_at) >= taoLaiTruoc)
      .map((dong) => `${dong.question_id}|${dong.answer_norm}`)
  );

  const viec = [];
  const cauDienTu = [];
  for (const dong of cauHoi) {
    const question = chuanHoaCau(dong);
    const nguCanh = { lessonTitle: dong.lesson_title, grammar: docJson(dong.lesson_content, {}).grammar || [], question };
    if (question.type !== "multiple_choice") cauDienTu.push({ questionId: dong.id, soBai: dong.lesson_number, nguCanh });
    for (const traLoi of cacTraLoiCanGiaiThich(question)) {
      if (!ghiDe && khoaDaCo.has(`${dong.id}|${traLoi.answerNorm}`)) continue;
      viec.push({
        questionId: dong.id,
        soBai: dong.lesson_number,
        answerNorm: traLoi.answerNorm,
        input: { ...nguCanh, learnerAnswer: traLoi.learnerAnswer, isCorrect: traLoi.isCorrect },
      });
    }
  }

  console.log(
    `${cauHoi.length} câu bài tập, ${viec.length} lời giải thích cần tạo` +
      (ghiDe ? " (ghi đè cả cái đã có)" : ` (bỏ qua ${khoaDaCo.size} cái đã có)`) +
      `; ${soLuotMoiPhut} lượt/phút ≈ ${Math.ceil(viec.length / soLuotMoiPhut)} phút`
  );
  if (loiThuongGap) {
    console.log(`+ đoán lỗi hay gặp cho ${cauDienTu.length} câu điền từ (khoảng ${cauDienTu.length * 4} lời giải thích nữa)`);
  }
  if (!apply && !thu) {
    console.log("Chưa gọi AI. Thêm --thu để xem vài mẫu, hoặc --apply để tạo và ghi DB.");
    return;
  }

  if (loiThuongGap) {
    const cauCanDoan = thu ? cauDienTu.slice(0, 2) : cauDienTu;
    console.log(`Đang đoán lỗi hay gặp cho ${cauCanDoan.length} câu điền từ...`);
    const ketQuaDoan = await chaySongSong(
      cauCanDoan,
      async ({ questionId, soBai, nguCanh }) => {
        const cacLoi = await coThuLai(() => doanLoiThuongGap(nguCanh));
        for (const traLoi of cacLoi) {
          const answerNorm = chuanHoaTraLoi(traLoi);
          if (!ghiDe && khoaDaCo.has(`${questionId}|${answerNorm}`)) continue;
          viec.push({ questionId, soBai, answerNorm, input: { ...nguCanh, learnerAnswer: traLoi, isCorrect: false } });
        }
      },
      ({ questionId }) => `đoán lỗi câu ${questionId}`
    );
    if (ketQuaDoan.dungSom) return;
    console.log(`Tổng cộng ${viec.length} lời giải thích cần tạo.`);
  }

  if (thu) {
    // Có --loi-thuong-gap: xem mẫu của các đáp án sai vừa đoán (nằm cuối danh sách)
    const mau = loiThuongGap ? viec.slice(-SO_MAU_THU) : viec.slice(0, SO_MAU_THU);
    for (const mot of mau) {
      const text = await giaiThichCoThuLai(mot.input);
      console.log(`\n— Bài ${mot.soBai}, câu ${mot.questionId}, trả lời "${mot.answerNorm}" (${mot.input.isCorrect ? "đúng" : "sai"}):\n${text}`);
    }
    return;
  }

  const { xong, loi } = await chaySongSong(
    viec,
    async (mot) => {
      const text = await giaiThichCoThuLai(mot.input);
      if (!text) throw new Error("AI trả về rỗng");
      await pool.query(LUU_GIAI_THICH, [mot.questionId, mot.answerNorm, text]);
    },
    (mot) => `câu ${mot.questionId} "${mot.answerNorm}"`
  );
  console.log(`✅ Đã ghi ${xong} lời giải thích` + (loi ? `, ${loi} lỗi (chạy lại để bù, không cần --ghi-de)` : ""));
}

main()
  .catch((error) => {
    console.error("❌ Tạo lời giải thích thất bại:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
