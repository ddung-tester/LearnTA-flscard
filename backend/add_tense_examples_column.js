/**
 * add_tense_examples_column.js
 * Migration: thêm cột tense_examples JSON vào bảng cards.
 * Chạy: node add_tense_examples_column.js (từ thư mục backend)
 */
require("dotenv/config");
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Running migration: ADD COLUMN tense_examples ...");
    await conn.execute(
      "ALTER TABLE cards ADD COLUMN tense_examples JSON NULL DEFAULT NULL"
    );
    console.log("✅ Migration successful: tense_examples column added.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("⚠️  Column tense_examples already exists — skipping.");
    } else {
      console.error("❌ Migration failed:", err.message);
      process.exit(1);
    }
  } finally {
    await conn.end();
  }
}

main();
