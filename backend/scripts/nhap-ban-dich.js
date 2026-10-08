// Preview: node scripts/nhap-ban-dich.js; apply: add --apply.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

function loadTranslations(root) {
  const source = JSON.parse(fs.readFileSync(path.join(root, "work/cau-vi-du-hien-tai.json"), "utf8"));
  const translations = new Map();
  for (let lot = 1; lot <= 27; lot++) {
    const file = `ban-dich-${String(lot).padStart(2, "0")}.txt`;
    for (const line of fs.readFileSync(path.join(root, "work/dich-vi-du", file), "utf8").split(/\r?\n/).filter(Boolean)) {
      const match = /^(\d+) ¦ (.+)$/.exec(line);
      assert(match, `${file}: dòng không hợp lệ`);
      const id = Number(match[1]), translation = match[2].trim();
      assert(translation && translation.length <= 2000 && !translations.has(id), `ID ${id}: rỗng, quá dài hoặc trùng`);
      translations.set(id, translation);
    }
  }
  assert.equal(source.length, 1328, "Nguồn phải đủ 1328 thẻ");
  const expected = source.filter(row => row.example_sentence?.trim());
  assert.equal(expected.length, 1320);
  assert.equal(translations.size, expected.length);
  return expected.map(row => {
    assert(translations.has(row.id), `ID ${row.id}: thiếu bản dịch`);
    return { ...row, example_translation: translations.get(row.id) };
  });
}

function planUpdates(source, rows) {
  const current = new Map(rows.map(row => [row.id, row]));
  return source.filter(row => {
    const saved = current.get(row.id);
    assert(saved && saved.term_en === row.term_en && saved.example_sentence === row.example_sentence,
      `ID ${row.id}: từ hoặc câu tiếng Anh đã thay đổi, dừng nhập`);
    if (saved.example_translation === row.example_translation) return false;
    assert(!saved.example_translation?.trim(), `ID ${row.id}: đã có bản dịch khác, dừng nhập`);
    return true;
  });
}

async function main() {
  require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
  const pool = require("../src/config/db");
  const root = path.join(__dirname, "../database/private-content/cau-mau");
  const source = loadTranslations(root);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query("SELECT * FROM cards ORDER BY id");
    let changes = planUpdates(source, rows);
    console.log(`Có câu gốc: ${source.length}. Cần bổ sung: ${changes.length}. Không có câu gốc: 8.`);
    if (!process.argv.includes("--apply") || !changes.length) return;
    const [[column]] = await connection.query("SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cards' AND COLUMN_NAME = 'example_translation'");
    if (!column.total) await connection.query("ALTER TABLE cards ADD COLUMN example_translation TEXT NULL AFTER example_sentence");
    await connection.beginTransaction();
    const [locked] = await connection.query("SELECT * FROM cards ORDER BY id FOR UPDATE");
    changes = planUpdates(source, locked);
    const backup = path.join(root, "work/db-backups", `translations-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, JSON.stringify(locked, null, 2), { encoding: "utf8", flag: "wx" });
    for (let offset = 0; offset < changes.length; offset += 200) {
      const batch = changes.slice(offset, offset + 200);
      const cases = batch.map(() => "WHEN ? THEN ?").join(" ");
      const ids = batch.map(() => "?").join(",");
      const values = [...batch.flatMap(row => [row.id, row.example_translation]), ...batch.map(row => row.id)];
      const [result] = await connection.execute(`UPDATE cards SET example_translation = CASE id ${cases} END WHERE id IN (${ids})`, values);
      assert.equal(result.affectedRows, batch.length);
    }
    const [after] = await connection.query("SELECT * FROM cards ORDER BY id");
    assert.equal(planUpdates(source, after).length, 0);
    // All original card fields, including English, six tenses and IPA, must survive.
    const strip = row => Object.fromEntries(Object.entries(row).filter(([key]) => !["example_translation", "updated_at"].includes(key)));
    assert.deepEqual(after.map(strip), locked.map(strip));
    await connection.commit();
    console.log(`Đã bổ sung ${changes.length} bản dịch. Giữ nguyên câu Anh, 6 thì, IPA và các trường khác.`);
    console.log(`Backup: ${backup}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}
module.exports = { loadTranslations, planUpdates };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
