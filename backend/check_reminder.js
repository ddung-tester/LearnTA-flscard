require("dotenv").config();
const pool = require("./src/config/db");

async function restore() {
  const [r] = await pool.query(
    "UPDATE users SET last_study_date = '2026-07-01' WHERE email = 'ddung.tester@gmail.com'"
  );
  console.log("Updated rows:", r.affectedRows);

  // Verify
  const [rows] = await pool.query(
    "SELECT email, last_study_date FROM users WHERE email = 'ddung.tester@gmail.com'"
  );
  console.log("Current last_study_date:", rows[0]?.last_study_date);
  process.exit(0);
}

restore().catch((e) => { console.error(e.message); process.exit(1); });
