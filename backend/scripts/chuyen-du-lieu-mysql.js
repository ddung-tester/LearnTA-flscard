/**
 * chuyen-du-lieu-mysql.js — Chép toàn bộ dữ liệu từ DB MySQL cũ (Cloud SQL) sang Postgres (Supabase).
 * Giữ nguyên id, chạy trong một transaction, cuối cùng so số dòng từng bảng.
 *
 * Nguồn: MYSQL_HOST, MYSQL_PORT (3306), MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 * Đích:  DATABASE_URL (hoặc DB_*) như backend; đã chạy database/schema.sql, các bảng còn trống.
 *
 * Xem trước:            node scripts/chuyen-du-lieu-mysql.js
 * Chép:                 node scripts/chuyen-du-lieu-mysql.js --apply
 * Xoá dữ liệu đích rồi chép lại: thêm --xoa-dich
 */
require("dotenv/config");
const mysql = require("mysql2/promise");
const pool = require("../src/config/db");

// Thứ tự theo khoá ngoại: bảng cha trước
const CAC_BANG = [
  "users", "decks", "cards", "study_sessions", "study_answers", "card_progress",
  "mistake_words", "card_reviews", "quiz_results", "streak_logs", "user_settings",
  "roadmaps", "roadmap_decks", "courses", "course_lessons", "course_questions",
  "course_question_explanations", "course_question_progress",
];
const SO_DONG_MOI_LO = 500;
const APPLY = process.argv.includes("--apply");
const XOA_DICH = process.argv.includes("--xoa-dich");

function doiGiaTri(giaTri, kieu) {
  if (giaTri === null || giaTri === undefined) return null;
  if (kieu === "boolean") return Boolean(Number(giaTri));
  if (kieu === "jsonb" || kieu === "json") {
    return typeof giaTri === "string" ? giaTri : JSON.stringify(giaTri);
  }
  return giaTri;
}

async function cotNguon(nguon, bang) {
  const [rows] = await nguon.query(
    "SELECT COLUMN_NAME AS ten FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [bang]
  );
  return new Set(rows.map((row) => row.ten));
}

async function cotDich(client, bang) {
  const [rows] = await client.query(
    `SELECT column_name AS ten, data_type AS kieu
     FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = ?
     ORDER BY ordinal_position`,
    [bang]
  );
  return rows;
}

async function chepBang(nguon, client, bang) {
  const coNguon = await cotNguon(nguon, bang);
  if (coNguon.size === 0) {
    console.log(`  ${bang}: không có ở nguồn, bỏ qua`);
    return 0;
  }
  const cot = (await cotDich(client, bang)).filter((c) => coNguon.has(c.ten));
  const danhSachCot = cot.map((c) => `"${c.ten}"`).join(", ");
  const chonCot = cot.map((c) => `\`${c.ten}\``).join(", ");

  let daChep = 0;
  let idCuoi = 0;
  for (;;) {
    const [rows] = await nguon.query(
      `SELECT ${chonCot} FROM \`${bang}\` WHERE id > ? ORDER BY id LIMIT ${SO_DONG_MOI_LO}`,
      [idCuoi]
    );
    if (rows.length === 0) break;

    const thamSo = [];
    const cacDong = rows.map((row) => {
      const giuCho = cot.map((c) => {
        let giaTri = doiGiaTri(row[c.ten], c.kieu);
        // MySQL so email không phân biệt hoa thường (unique đã đảm bảo không trùng); Postgres có phân biệt
        if (bang === "users" && c.ten === "email" && giaTri) giaTri = String(giaTri).trim().toLowerCase();
        thamSo.push(giaTri);
        return "?";
      });
      return `(${giuCho.join(", ")})`;
    });
    await client.query(`INSERT INTO ${bang} (${danhSachCot}) VALUES ${cacDong.join(", ")}`, thamSo);

    daChep += rows.length;
    idCuoi = rows[rows.length - 1].id;
  }

  // Id tự tăng của Postgres phải chạy tiếp sau id lớn nhất đã chép
  await client.query(
    `SELECT setval(pg_get_serial_sequence('${bang}', 'id'), COALESCE((SELECT MAX(id) FROM ${bang}), 0) + 1, false)`
  );
  return daChep;
}

async function demNguon(nguon) {
  const ketQua = {};
  for (const bang of CAC_BANG) {
    try {
      const [[row]] = await nguon.query(`SELECT COUNT(*) AS n FROM \`${bang}\``);
      ketQua[bang] = Number(row.n);
    } catch {
      ketQua[bang] = null;
    }
  }
  return ketQua;
}

async function main() {
  const nguon = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    // TIMESTAMP đọc theo UTC, DATE giữ chuỗi 'YYYY-MM-DD' để không lệch ngày theo giờ máy
    timezone: "Z",
    dateStrings: ["DATE"],
    supportBigNumbers: true,
  });
  await nguon.query("SET time_zone = '+00:00'");

  const client = await pool.getConnection();
  try {
    const soNguon = await demNguon(nguon);
    console.log("Số dòng ở MySQL nguồn:");
    for (const bang of CAC_BANG) console.log(`  ${bang.padEnd(30)} ${soNguon[bang] ?? "(không có bảng)"}`);

    if (!APPLY) {
      console.log("\nXem trước xong. Thêm --apply để chép sang Postgres.");
      return;
    }

    await client.beginTransaction();
    if (XOA_DICH) {
      await client.query(`TRUNCATE ${CAC_BANG.join(", ")} RESTART IDENTITY CASCADE`);
    } else {
      for (const bang of CAC_BANG) {
        const [[row]] = await client.query(`SELECT COUNT(*) AS n FROM ${bang}`);
        if (row.n > 0) {
          throw new Error(`Bảng đích ${bang} đã có ${row.n} dòng. Chạy với --xoa-dich nếu muốn ghi đè.`);
        }
      }
    }

    console.log("\nĐang chép:");
    for (const bang of CAC_BANG) {
      const n = await chepBang(nguon, client, bang);
      console.log(`  ${bang.padEnd(30)} ${n}`);
    }

    const lech = [];
    for (const bang of CAC_BANG) {
      if (soNguon[bang] === null) continue;
      const [[row]] = await client.query(`SELECT COUNT(*) AS n FROM ${bang}`);
      if (row.n !== soNguon[bang]) lech.push(`${bang}: nguồn ${soNguon[bang]}, đích ${row.n}`);
    }
    if (lech.length > 0) {
      throw new Error(`Số dòng không khớp, đã huỷ:\n  ${lech.join("\n  ")}`);
    }

    await client.commit();
    console.log("\n✅ Đã chép xong, số dòng mọi bảng khớp với nguồn.");
  } catch (error) {
    await client.rollback().catch(() => {});
    throw error;
  } finally {
    client.release();
    await nguon.end();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("❌", error.message);
  process.exitCode = 1;
});
