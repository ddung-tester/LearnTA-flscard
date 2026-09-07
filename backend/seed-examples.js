// Preview: npm run seed:examples. Apply missing examples: npm run seed:examples -- --apply
require("dotenv/config");
const fs = require("node:fs");
const path = require("node:path");
const pool = require("./src/config/db");

async function main() {
  const entries = fs.readFileSync(path.join(__dirname, "database/examples.tsv"), "utf8")
    .trim().split(/\r?\n/).map((line) => line.split("\t"));
  const examples = new Map(entries);
  if (examples.size !== entries.length || entries.some(([term, sentence]) => !term || !sentence)) {
    throw new Error("Invalid or duplicate example seed entries");
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cards] = await connection.query(
      "SELECT id, term_en FROM cards WHERE example_sentence IS NULL OR TRIM(example_sentence) = '' FOR UPDATE"
    );
    const missing = cards.filter((card) => !examples.has(card.term_en.trim().toLowerCase()));
    const matched = cards.filter((card) => examples.has(card.term_en.trim().toLowerCase()));
    console.log(JSON.stringify({ empty: cards.length, matched: matched.length, unmatched: missing }));
    if (!process.argv.includes("--apply")) {
      await connection.rollback();
      return;
    }
    let updated = 0;
    for (const card of matched) {
      const [result] = await connection.execute(
        "UPDATE cards SET example_sentence = ? WHERE id = ? AND (example_sentence IS NULL OR TRIM(example_sentence) = '')",
        [examples.get(card.term_en.trim().toLowerCase()), card.id]
      );
      updated += result.affectedRows;
    }
    await connection.commit();
    console.log(JSON.stringify({ updated }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => pool.end());
