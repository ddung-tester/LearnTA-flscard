/**
 * seed-roadmaps.js — Nạp lộ trình học từ database/content/lo-trinh.json (hoặc file truyền vào).
 * Chạy (từ thư mục backend, sau migration 009): npm run seed:roadmaps [-- duong/dan/file.json]
 * Chạy lại nhiều lần an toàn: cập nhật nội dung, thêm từ mới, không xoá từ cũ.
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const {
  chuanHoaNoiDungLoTrinh,
  kiemTraNoiDungLoTrinh,
  napNoiDungLoTrinh,
} = require("../src/utils/noiDungLoTrinh");

async function main() {
  const duongDan = process.argv[2] || path.join(__dirname, "../database/content/lo-trinh.json");
  const noiDung = JSON.parse(fs.readFileSync(duongDan, "utf8"));

  const loi = kiemTraNoiDungLoTrinh(noiDung);
  if (loi.length > 0) {
    console.error(`❌ Nội dung không hợp lệ (${loi.length} lỗi):\n- ${loi.join("\n- ")}`);
    process.exit(1);
  }

  const pool = require("../src/config/db");
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const thongKe = await napNoiDungLoTrinh(connection, chuanHoaNoiDungLoTrinh(noiDung));
    await connection.commit();
    console.log(
      `✅ Đã nạp ${thongKe.loTrinh} lộ trình: ${thongKe.boMoi} bộ từ mới, ` +
        `${thongKe.tuMoi} từ mới, ${thongKe.tuCapNhat} từ cập nhật.`
    );
  } catch (error) {
    await connection.rollback();
    console.error("❌ Nạp lộ trình thất bại:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
