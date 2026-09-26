/**
 * nhap-khoa-hoc.js — Nạp khoá học riêng (tài liệu cá nhân) vào tài khoản của chủ khoá.
 * Nội dung: database/private-content/khoa-hoc-48-ngay/bai-XX/{lesson,exercises,answers}.json
 * (thư mục đã .gitignore, KHÔNG commit). Chạy lại nhiều lần an toàn.
 *
 * Kiểm tra file (không đụng DB): node scripts/nhap-khoa-hoc.js
 * Nạp vào DB:                    node scripts/nhap-khoa-hoc.js --email=ban@example.com --apply
 * Chỉ một bài:                   thêm --bai=13
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { chuanHoaBaiHoc, kiemTraBaiHoc, napBaiHoc } = require("../src/utils/khoaHoc");

const KHOA_HOC = {
  slug: "khoa-hoc-48-ngay",
  title: "Khoá 48 ngày lấy gốc tiếng Anh",
  description: "Tài liệu cá nhân, chỉ bạn xem được.",
};
const THU_MUC = path.join(__dirname, "../database/private-content/khoa-hoc-48-ngay");
const APPLY = process.argv.includes("--apply");

function docThamSo(ten) {
  const thamSo = process.argv.find((arg) => arg.startsWith(`--${ten}=`));
  return thamSo ? thamSo.slice(ten.length + 3).trim() : "";
}

function docJson(duongDan) {
  return JSON.parse(fs.readFileSync(duongDan, "utf8").replace(/^﻿/, ""));
}

function timCacBai(chiBai) {
  if (!fs.existsSync(THU_MUC)) return [];
  return fs
    .readdirSync(THU_MUC, { withFileTypes: true })
    .filter((muc) => muc.isDirectory() && /^bai-\d+$/.test(muc.name))
    .map((muc) => ({ soBai: Number(muc.name.slice(4)), thuMuc: path.join(THU_MUC, muc.name) }))
    .filter((bai) => !chiBai || bai.soBai === chiBai)
    .sort((a, b) => a.soBai - b.soBai);
}

async function main() {
  const chiBai = Number(docThamSo("bai")) || null;
  const cacBai = timCacBai(chiBai);
  if (cacBai.length === 0) {
    console.error(`❌ Không thấy thư mục bai-XX nào trong ${THU_MUC}`);
    process.exit(1);
  }

  const hopLe = [];
  let coLoi = false;
  for (const { soBai, thuMuc } of cacBai) {
    let files;
    try {
      files = {
        lesson: docJson(path.join(thuMuc, "lesson.json")),
        exercises: docJson(path.join(thuMuc, "exercises.json")),
        answers: docJson(path.join(thuMuc, "answers.json")),
      };
    } catch (error) {
      console.error(`❌ Bài ${soBai}: không đọc được file (${error.message})`);
      coLoi = true;
      continue;
    }

    const loi = kiemTraBaiHoc(files, soBai);
    if (loi.length > 0) {
      console.error(`❌ Bài ${soBai} (${loi.length} lỗi):\n- ${loi.join("\n- ")}`);
      coLoi = true;
      continue;
    }

    const bai = chuanHoaBaiHoc(files);
    const tracNghiem = bai.questions.filter((cau) => cau.type === "multiple_choice").length;
    const dapAnTuSuyRa = bai.questions.filter((cau) => cau.answer_source !== "answer_pdf").length;
    console.log(
      `✅ Bài ${soBai}: ${bai.vocabulary.length} từ, ${bai.content.grammar.length} mục ngữ pháp, ` +
        `${bai.questions.length} câu (${tracNghiem} trắc nghiệm, ${bai.questions.length - tracNghiem} điền từ)` +
        (dapAnTuSuyRa ? `, ${dapAnTuSuyRa} câu đáp án không lấy từ file đáp án` : "")
    );
    hopLe.push(bai);
  }

  if (coLoi) process.exit(1);
  if (!APPLY) {
    console.log("\nFile hợp lệ. Nạp vào DB: thêm --email=<email tài khoản> --apply");
    return;
  }

  const email = docThamSo("email");
  if (!email) {
    console.error("❌ Cần --email=<email tài khoản chủ khoá>");
    process.exit(1);
  }

  const pool = require("../src/config/db");
  const connection = await pool.getConnection();
  try {
    const [nguoiDung] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (!nguoiDung[0]) throw new Error(`không có tài khoản với email ${email}`);

    const thongKe = { baiHoc: 0, boMoi: 0, tuMoi: 0, tuCapNhat: 0, cauHoi: 0, cauXoa: 0 };
    await connection.beginTransaction();
    for (const bai of hopLe) {
      await napBaiHoc(connection, { userId: nguoiDung[0].id, khoaHoc: KHOA_HOC, bai }, thongKe);
    }
    await connection.commit();
    console.log(
      `\n✅ Đã nạp ${thongKe.baiHoc} bài: ${thongKe.boMoi} bộ từ mới, ${thongKe.tuMoi} từ mới, ` +
        `${thongKe.tuCapNhat} từ cập nhật, ${thongKe.cauHoi} câu hỏi, xoá ${thongKe.cauXoa} câu không còn trong file.`
    );
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("❌ Nạp khoá học thất bại:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
