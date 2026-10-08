// Run from backend: node scripts/nhap-cau-mau.js [--apply | --restore=backup.json --apply]
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { isDeepStrictEqual } = require("node:util");

const TENSES = [
  ["present_simple", "S + V(s/es)"],
  ["present_continuous", "S + am/is/are + V-ing"],
  ["past_simple", "S + V2/V-ed"],
  ["past_continuous", "S + was/were + V-ing"],
  ["present_perfect", "S + have/has + V3"],
  ["future_simple", "S + will + V"],
];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(field.replace(/\r$/, "")); field = "";
      if (char === "\n") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else field += char;
  }
  assert(!quoted, "CSV: dấu ngoặc kép chưa đóng");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  assert(header?.includes("id") && header.includes("term_en") && header.includes("meaning_vi"), "CSV thiếu cột");
  return rows.map((values) => {
    assert.equal(values.length, header.length, "CSV: số cột không khớp");
    return Object.fromEntries(header.map((key, i) => [key, values[i]]));
  });
}

function addUnique(map, id, value, label) {
  assert(Number.isSafeInteger(id) && id > 0, `${label}: ID không hợp lệ`);
  assert(!map.has(id), `${label}: ID trùng ${id}`);
  map.set(id, value);
}

function parseBatch(text) {
  const cards = new Map();
  assert(!text.split(/^#/m)[0].trim(), "Có nội dung trước tiêu đề thẻ");
  for (const block of text.split(/^#/m).slice(1)) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const heading = /^(\d+) (.+)$/.exec(lines.shift() || "");
    assert(heading, "Tiêu đề thẻ không hợp lệ");
    const id = Number(heading[1]);
    assert.equal(lines.length, 6, `ID ${id}: cần đúng 6 câu`);
    const examples = lines.map((line, i) => {
      const parts = line.split("|");
      assert.equal(parts.length, 2, `ID ${id}: dấu phân cách không hợp lệ`);
      const english = parts[0].trim(), translation = parts[1].trim();
      const highlighted = /\*([^*]+)\*/.exec(english);
      assert(highlighted && (english.match(/\*/g) || []).length === 2 && translation, `ID ${id}: thiếu highlight hoặc bản dịch`);
      return { tense: TENSES[i][0], formula: TENSES[i][1], sentence: english.replace(/\*/g, ""), highlight: highlighted[1], translation };
    });
    addUnique(cards, id, { id, term_en: heading[2], examples }, "Câu mẫu");
  }
  return cards;
}

function loadDataset(root) {
  const source = new Map(), examples = new Map(), ipa = new Map();
  for (const row of parseCsv(fs.readFileSync(path.join(root, "tu-vung-day-du.csv"), "utf8"))) {
    addUnique(source, Number(row.id), row, "CSV");
  }
  for (let lot = 1; lot <= 27; lot++) {
    const name = `lo-${String(lot).padStart(2, "0")}.txt`;
    const batch = parseBatch(fs.readFileSync(path.join(root, "ket-qua", name), "utf8"));
    assert.equal(batch.size, lot === 27 ? 28 : 50, `${name}: sai số thẻ`);
    for (const [id, card] of batch) addUnique(examples, id, card, "Toàn bộ câu mẫu");
  }
  for (const line of fs.readFileSync(path.join(root, "ket-qua", "ipa.txt"), "utf8").split(/\r?\n/).filter((line) => line.trim())) {
    const parts = line.split(" ¦ ");
    assert(parts.length === 3 && /^\/[^/]+\/$/.test(parts[2]), "Dòng IPA không hợp lệ");
    addUnique(ipa, Number(parts[0]), { term_en: parts[1], pronunciation: parts[2] }, "IPA");
  }
  assert.equal(source.size, 1328, "CSV phải có 1328 thẻ");
  assert.equal(examples.size, source.size, "Câu mẫu thiếu hoặc thừa thẻ");
  assert.equal(ipa.size, source.size, "IPA thiếu hoặc thừa thẻ");
  return [...source].map(([id, row]) => {
    const card = examples.get(id), pronunciation = ipa.get(id);
    assert(card?.term_en === row.term_en && pronunciation?.term_en === row.term_en, `ID ${id}: từ nguồn không khớp`);
    return { id, term_en: row.term_en, meaning_vi: row.meaning_vi, tense_examples: JSON.stringify(card.examples), pronunciation: pronunciation.pronunciation };
  });
}

function jsonValue(raw) { return typeof raw === "string" ? JSON.parse(raw) : raw; }
function sameContent(a, b) {
  const left = Object.hasOwn(a, "saved_tense_examples") ? a.saved_tense_examples : a.tense_examples;
  const right = Object.hasOwn(b, "saved_tense_examples") ? b.saved_tense_examples : b.tense_examples;
  return (left === null) === (right === null) && isDeepStrictEqual(jsonValue(left), jsonValue(right)) && a.pronunciation === b.pronunciation;
}

function planImport(dataset, rows) {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const errors = [], changes = [];
  for (const card of dataset) {
    const row = byId.get(card.id);
    if (!row) errors.push(`ID ${card.id}: không có trong DB`);
    else if (row.term_en !== card.term_en) errors.push(`ID ${card.id}: term_en khác dữ liệu gốc`);
    else if (card.meaning_vi !== undefined && row.meaning_vi !== card.meaning_vi) errors.push(`ID ${card.id}: meaning_vi khác dữ liệu gốc`);
    else if (!sameContent(row, card)) changes.push(card);
  }
  assert.equal(errors.length, 0, errors.slice(0, 30).join("\n"));
  return changes;
}

function preservedFields(row) {
  const { tense_examples, pronunciation, saved_tense_examples, updated_at, ...rest } = row;
  return rest;
}

async function run(args = process.argv.slice(2)) {
  for (const arg of args) assert(arg === "--apply" || arg.startsWith("--restore="), `Tham số không hợp lệ: ${arg}`);
  const apply = args.includes("--apply");
  const restore = args.find((arg) => arg.startsWith("--restore="))?.slice(10);
  const root = path.resolve(__dirname, "../database/private-content/cau-mau");
  const backup = restore ? JSON.parse(fs.readFileSync(path.resolve(restore), "utf8")) : null;
  const dataset = backup ? backup.before : loadDataset(root);
  if (backup) {
    assert.equal(backup.version, 1, "Phiên bản sao lưu không hợp lệ");
    assert(Array.isArray(dataset) && dataset.length > 0, "Sao lưu rỗng");
    assert.equal(new Set(dataset.map((card) => card.id)).size, dataset.length, "Sao lưu trùng ID");
    for (const card of dataset) {
      assert(Number.isSafeInteger(card.id) && card.id > 0 && typeof card.term_en === "string", "Sao lưu sai thẻ");
      jsonValue(card.tense_examples);
      assert(card.pronunciation === null || typeof card.pronunciation === "string", "Sao lưu sai IPA");
    }
  }
  require("dotenv").config({ quiet: true });
  const pool = require("../src/config/db");
  let connection;
  try {
    connection = await pool.getConnection();
    const [[info]] = await connection.query("SELECT DATABASE() AS database_name");
    if (backup) assert.equal(backup.database, info.database_name, "Sao lưu thuộc DB khác");
    const [columns] = await connection.query("SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cards' AND COLUMN_NAME IN ('tense_examples','pronunciation')");
    assert(columns.some((c) => c.COLUMN_NAME === "tense_examples" && c.DATA_TYPE === "json") && columns.some((c) => c.COLUMN_NAME === "pronunciation"), "DB thiếu cột đúng cấu trúc; cần migration trước");
    await connection.beginTransaction();
    const ids = dataset.map((card) => card.id);
    const select = "SELECT *, CAST(tense_examples AS CHAR CHARACTER SET utf8mb4) AS saved_tense_examples FROM cards WHERE id IN (?) ORDER BY id";
    const [rows] = await connection.query(select + (apply ? " FOR UPDATE" : ""), [ids]);
    const changes = planImport(dataset, rows);
    if (backup) {
      const expected = new Map(backup.after.map((card) => [card.id, card]));
      const current = new Map(rows.map((row) => [Number(row.id), row]));
      for (const card of changes) assert(sameContent(current.get(card.id), expected.get(card.id)), `ID ${card.id}: đã bị thay đổi sau lần nhập; không khôi phục đè`);
    }
    const summary = { mode: apply ? "apply" : "preview", operation: backup ? "restore" : "import", database: info.database_name, matched: rows.length, sentences: backup ? undefined : dataset.length * 6, ipa: backup ? undefined : dataset.length, changes: changes.length, unchanged: dataset.length - changes.length, replacingExistingExamples: changes.filter((card) => rows.find((row) => Number(row.id) === card.id).tense_examples !== null).length };
    if (!apply || !changes.length) {
      await connection.rollback();
      console.log(JSON.stringify(summary, null, 2));
      return summary;
    }
    const changedIds = new Set(changes.map((card) => card.id));
    const backupDir = path.join(root, "work", "db-backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `${backup ? "restore" : "import"}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    const before = rows.filter((row) => changedIds.has(Number(row.id))).map((row) => ({ id: Number(row.id), term_en: row.term_en, tense_examples: row.saved_tense_examples, pronunciation: row.pronunciation }));
    fs.writeFileSync(backupPath, JSON.stringify({ version: 1, database: info.database_name, created_at: new Date().toISOString(), before, after: changes.map(({ id, term_en, tense_examples, pronunciation }) => ({ id, term_en, tense_examples, pronunciation })) }, null, 2), { encoding: "utf8", flag: "wx" });
    for (const card of changes) {
      const [result] = await connection.execute("UPDATE cards SET tense_examples = ?, pronunciation = ? WHERE id = ? AND term_en = ?", [card.tense_examples, card.pronunciation, card.id, card.term_en]);
      assert.equal(result.affectedRows, 1, `ID ${card.id}: cập nhật không thành công`);
    }
    const [after] = await connection.query(select, [ids]);
    assert.equal(planImport(dataset, after).length, 0, "DB sau ghi khác nội dung nguồn");
    const oldById = new Map(rows.map((row) => [Number(row.id), row]));
    for (const row of after) assert(isDeepStrictEqual(preservedFields(row), preservedFields(oldById.get(Number(row.id)))), `ID ${row.id}: trường ngoài phạm vi bị đổi`);
    await connection.commit();
    summary.backup = path.relative(path.resolve(__dirname, ".."), backupPath).replaceAll("\\", "/");
    summary.verified = true;
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

if (require.main === module) run().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
module.exports = { parseCsv, parseBatch, loadDataset, sameContent, planImport, run };
