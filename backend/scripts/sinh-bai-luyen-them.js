/**
 * sinh-bai-luyen-them.js — Sinh bài luyện thêm (trắc nghiệm 4 lựa chọn) cho một buổi của khoá học riêng
 * bằng Gemini, từ ngữ pháp + từ vựng của buổi. Ghi ra bai-XX/extra.json để SOÁT LẠI trước khi nhập;
 * `npm run nhap:khoa-hoc` nhập luôn extra.json nếu có.
 *
 * Chạy (trong backend/): npm run sinh:luyen-them -- --bai=13 [--so-cau=40] [--ghi-de]
 */
require("dotenv/config");
const fs = require("fs");
const { generateExtraPractice } = require("../src/services/aiService");
const { chuanHoaBaiHoc, gopBaiLuyenThem, kiemTraBaiHoc, taoBaiLuyenThem } = require("../src/utils/khoaHoc");
const { docFileBai, docThamSo, timCacBai } = require("./thuMucKhoaHoc");

async function main() {
  const soBai = Number(docThamSo("bai"));
  const soCau = Math.min(60, Math.max(10, Number(docThamSo("so-cau")) || 40));
  const [thuMucBai] = soBai ? timCacBai(soBai) : [];
  if (!thuMucBai) {
    console.error("❌ Cần --bai=<số bài> có thư mục bai-XX tương ứng");
    process.exit(1);
  }

  const { files, extra: extraCu, duongDanExtra } = docFileBai(thuMucBai.thuMuc);
  if (extraCu && !process.argv.includes("--ghi-de")) {
    console.error(`❌ Bài ${soBai} đã có extra.json (${extraCu.questions?.length || 0} câu). Thêm --ghi-de để sinh lại.`);
    process.exit(1);
  }

  const loiBai = kiemTraBaiHoc(files, soBai);
  if (loiBai.length > 0) {
    console.error(`❌ Bài ${soBai} chưa hợp lệ, sửa trước khi sinh bài luyện thêm:\n- ${loiBai.join("\n- ")}`);
    process.exit(1);
  }

  const bai = chuanHoaBaiHoc(files);
  const deBaiDaCo = bai.questions.map((cau) => cau.prompt);
  console.log(`Đang sinh ${soCau} câu cho bài ${soBai}: ${bai.title}...`);
  const cauTho = await generateExtraPractice({
    lessonNumber: bai.lesson_number,
    lessonTitle: bai.title,
    grammar: bai.content.grammar,
    vocabulary: bai.vocabulary,
    existingPrompts: deBaiDaCo,
    count: soCau,
  });

  const { extra, soCauBo } = taoBaiLuyenThem(cauTho, { lessonNumber: bai.lesson_number, deBaiDaCo });
  const loi = kiemTraBaiHoc(gopBaiLuyenThem(files, extra), soBai);
  if (extra.questions.length === 0 || loi.length > 0) {
    console.error(`❌ Kết quả AI không dùng được, chưa ghi file:\n- ${loi.join("\n- ") || "không có câu hợp lệ"}`);
    process.exit(1);
  }

  fs.writeFileSync(duongDanExtra, `${JSON.stringify(extra, null, 2)}\n`, "utf8");

  const tuVung = extra.questions.filter((cau) => cau.section === "tu_vung").length;
  const theoDapAn = Object.fromEntries(["A", "B", "C", "D"].map((chu) => [chu, 0]));
  for (const dapAn of extra.answers) theoDapAn[dapAn.answer] += 1;
  console.log(
    `✅ Đã ghi ${duongDanExtra}\n` +
      `   ${extra.questions.length} câu (${extra.questions.length - tuVung} ngữ pháp, ${tuVung} từ vựng)` +
      (soCauBo ? `, bỏ ${soCauBo} câu hỏng/trùng` : "") +
      `; đáp án A/B/C/D: ${Object.values(theoDapAn).join("/")}\n` +
      "   Soát lại file rồi nhập: npm run nhap:khoa-hoc -- --email=<email> --apply --bai=" +
      soBai
  );
}

main().catch((error) => {
  console.error("❌ Sinh bài luyện thêm thất bại:", error.message);
  process.exit(1);
});
