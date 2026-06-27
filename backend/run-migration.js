/**
 * run-migration.js — Chạy migration SQL thêm cột email_reminders.
 * Chạy: node run-migration.js (từ thư mục backend)
 */
require("dotenv/config");
const mysql = require("mysql2/promise");

async function main() {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Running migration: add email_reminders to user_settings...");
    await pool.execute(
      "ALTER TABLE user_settings ADD COLUMN email_reminders BOOLEAN NOT NULL DEFAULT TRUE"
    );
    console.log("✅ Migration successful: email_reminders column added.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("⚠️  Column email_reminders already exists — skipping.");
    } else {
      console.error("❌ Migration failed:", err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main();
