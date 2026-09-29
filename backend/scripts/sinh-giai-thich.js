/**
 * sinh-giai-thich.js — Soạn sẵn lời giải thích AI cho câu bài tập của khoá học riêng (không bắt buộc:
 * khi học, app đã tự soạn trước từng câu lúc câu hiện ra — POST /course-questions/:id/prepare).
 * Mỗi câu 1 lượt gọi AI: trắc nghiệm = mọi lựa chọn; điền từ = đáp án đúng + lỗi sai hay gặp.
 * Ghi vào bảng cache course_question_explanations (cùng khoá mà POST /explain đọc).
 *
 * Chạy (trong backend/, cần proxy Cloud SQL):
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13          đếm số câu cần soạn (không gọi AI)
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13 --thu    soạn thử 2 câu để soát, không ghi DB
 *   node scripts/sinh-giai-thich.js --email=<chủ khoá> --bai=13 --apply  soạn và ghi DB (câu đã đủ thì bỏ qua)
 *   --bai=tat-ca cho mọi buổi; --ghi-de soạn lại cả câu đã có;
 *   --tao-lai-truoc=2026-09-29 chỉ soạn lại lời tạo trước ngày đó (vd. sau khi đổi prompt);
 *   --moi-phut=10 (mặc định): lượt gọi AI tối đa mỗi phút. Gói miễn phí của Gemini chỉ cho 15 lượt/phút/model
 *   và DÙNG CHUNG với website đang chạy, nên để thấp hơn 15.
 *   Bị ngắt giữa chừng thì chạy lại: phần đã xong được bỏ qua. Tự dừng khi AI lỗi liên tiếp (hết hạn mức).
 */
require("dotenv/config");
const pool = require("../src/config/db");
const { explainAllAnswers } = require("../src/services/aiService");
const { cacTraLoiCanGiaiThich, locGiaiThichHopLe } = require("../src/utils/khoaHoc");
const { docThamSo } = require("./thuMucKhoaHoc");

const SO_LUONG_SONG_SONG = 3;
const SO_LAN_THU = 4;
const SO_CAU_THU = 2;
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

/** Soạn 1 câu bằng AI, lọc lại bằng luật chấm của server; trả về các lời hợp lệ. */
async function soanMotCau({ dong, question }) {
  const items = await coThuLai(() =>
    explainAllAnswers({
      lessonTitle: dong.lesson_title,
      grammar: docJson(dong.lesson_content, {}).grammar || [],
      question,
    })
  );
  const khoa = String(dong.id);
  return locGiaiThichHopLe(
    items.map((item) => ({ ...item, question_id: khoa })),
    new Map([[khoa, question]])
  ).hopLe;
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

  const [daCo] = await pool.query(
    "SELECT question_id, answer_norm, created_at FROM course_question_explanations WHERE question_id IN (?)",
    [cauHoi.map((cau) => cau.id)]
  );
  // Lời tạo trước --tao-lai-truoc coi như chưa có (sẽ được soạn lại)
  const khoaDaCo = new Set(
    daCo
      .filter((dong) => !taoLaiTruoc || new Date(dong.created_at) >= taoLaiTruoc)
      .map((dong) => `${dong.question_id}|${dong.answer_norm}`)
  );

  // Câu cần soạn: còn thiếu lời cho ít nhất một lựa chọn / đáp án đúng
  const viec = cauHoi
    .map((dong) => ({ dong, question: chuanHoaCau(dong) }))
    .filter(
      ({ dong, question }) =>
        ghiDe || cacTraLoiCanGiaiThich(question).some((traLoi) => !khoaDaCo.has(`${dong.id}|${traLoi.answerNorm}`))
    );

  console.log(
    `${cauHoi.length} câu bài tập, ${viec.length} câu cần soạn (1 lượt gọi AI mỗi câu); ` +
      `${soLuotMoiPhut} lượt/phút ≈ ${Math.ceil(viec.length / soLuotMoiPhut)} phút`
  );
  if (!apply && !thu) {
    console.log("Chưa gọi AI. Thêm --thu để xem vài câu mẫu, hoặc --apply để soạn và ghi DB.");
    return;
  }

  if (thu) {
    for (const mot of viec.slice(0, SO_CAU_THU)) {
      console.log(`\n— Bài ${mot.dong.lesson_number}, câu ${mot.dong.id}: ${mot.question.prompt}`);
      for (const muc of await soanMotCau(mot)) console.log(`[${muc.answerNorm}]\n${muc.explanation}\n`);
    }
    return;
  }

  let xong = 0;
  let soLoi = 0;
  let soLoiGhi = 0;
  let loiLienTiep = 0;
  let viTri = 0;
  async function thoLam() {
    while (viTri < viec.length && loiLienTiep < SO_LOI_LIEN_TIEP_TOI_DA) {
      const mot = viec[viTri];
      viTri += 1;
      try {
        for (const muc of await soanMotCau(mot)) {
          if (!ghiDe && khoaDaCo.has(`${muc.questionId}|${muc.answerNorm}`)) continue;
          await pool.query(
            `INSERT INTO course_question_explanations (question_id, answer_norm, explanation) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE explanation = VALUES(explanation), created_at = CURRENT_TIMESTAMP`,
            [muc.questionId, muc.answerNorm, muc.explanation]
          );
          soLoiGhi += 1;
        }
        xong += 1;
        loiLienTiep = 0;
      } catch (error) {
        soLoi += 1;
        loiLienTiep += 1;
        const lyDo = error.status ? `HTTP ${error.status} ${error.statusText || ""}` : error.message;
        console.error(`  ⚠ câu ${mot.dong.id}: ${String(lyDo).slice(0, 160)}`);
      }
      if ((xong + soLoi) % 25 === 0) console.log(`  ... ${xong + soLoi}/${viec.length} câu`);
    }
  }
  await Promise.all(Array.from({ length: SO_LUONG_SONG_SONG }, thoLam));
  if (loiLienTiep >= SO_LOI_LIEN_TIEP_TOI_DA) {
    console.error(`⛔ Dừng sớm: ${SO_LOI_LIEN_TIEP_TOI_DA} lỗi liên tiếp (có thể hết hạn mức API). Chạy lại sau để làm tiếp.`);
  }
  console.log(`✅ Soạn xong ${xong} câu, ghi ${soLoiGhi} lời giải thích` + (soLoi ? `; ${soLoi} câu lỗi (chạy lại để bù)` : ""));
}

main()
  .catch((error) => {
    console.error("❌ Soạn lời giải thích thất bại:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
