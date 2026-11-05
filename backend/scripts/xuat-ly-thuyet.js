/**
 * xuat-ly-thuyet.js — Chép phần lý thuyết (grammar + ghi chú) đang có trên DB về các file
 * database/private-content/khoa-hoc-48-ngay/bai-XX/lesson.json, để lần chạy nhap-khoa-hoc.js sau
 * không ghi đè nội dung đã sửa thẳng trên DB (bảng, ảnh, lời giải thích viết lại).
 * Chỉ đổi hai trường lesson.grammar và lesson.learning_notes_vi; từ vựng, bài tập giữ nguyên.
 *
 * Xem trước (không ghi file):  node scripts/xuat-ly-thuyet.js --email=ban@example.com
 * Ghi vào file:                thêm --apply      Chỉ một bài: thêm --bai=15
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { docJson, docThamSo, timCacBai } = require("./thuMucKhoaHoc");

const SLUG_KHOA = "khoa-hoc-48-ngay";
const APPLY = process.argv.includes("--apply");

async function main() {
  const email = docThamSo("email");
  if (!email) {
    console.error("❌ Cần --email=<email tài khoản chủ khoá>");
    process.exit(1);
  }
  const cacBai = timCacBai(Number(docThamSo("bai")) || null);
  if (cacBai.length === 0) {
    console.error("❌ Không thấy thư mục bai-XX nào trong private-content");
    process.exit(1);
  }

  const pool = require("../src/config/db");
  try {
    const [rows] = await pool.query(
      `SELECT l.lesson_number, l.content
       FROM course_lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN users u ON u.id = c.user_id
       WHERE u.email = ? AND c.slug = ?`,
      [email, SLUG_KHOA]
    );
    const theoSo = new Map(rows.map((row) => [Number(row.lesson_number), row.content]));

    let soDoi = 0;
    for (const { soBai, thuMuc } of cacBai) {
      const content = theoSo.get(soBai);
      if (!content) {
        console.log(`⚠️  Bài ${soBai}: không có trên DB, bỏ qua`);
        continue;
      }
      const duongDan = path.join(thuMuc, "lesson.json");
      const lesson = docJson(duongDan);
      const moi = { ...lesson, grammar: content.grammar || [], learning_notes_vi: content.notes || [] };
      if (JSON.stringify(moi) === JSON.stringify(lesson)) continue;
      soDoi += 1;
      console.log(`✏️  Bài ${soBai}: lý thuyết trên DB khác file`);
      if (APPLY) fs.writeFileSync(duongDan, `${JSON.stringify(moi, null, 2)}\n`, "utf8");
    }
    console.log(
      soDoi === 0
        ? "\n✅ File đã khớp DB."
        : APPLY
          ? `\n✅ Đã ghi ${soDoi} file lesson.json.`
          : `\n${soDoi} bài khác DB. Thêm --apply để ghi vào file.`
    );
  } catch (error) {
    console.error("❌ Xuất lý thuyết thất bại:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
