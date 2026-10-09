const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { parseCsv, parseBatch, loadDataset, sameContent, planImport, run } = require("../scripts/nhap-cau-mau");
const root = path.resolve(__dirname, "../database/private-content/cau-mau");
// Dữ liệu nguồn nằm trong private-content (.gitignore): máy/CI không có thì bỏ qua test cần nó
const canDuLieu = { skip: !fs.existsSync(path.join(root, "tu-vung-day-du.csv")) && "thiếu private-content/cau-mau" };

test("CSV giữ dấu phẩy, dấu ngoặc kép và dòng mới trong trường", () => {
  const parsed = parseCsv('\uFEFFid,term_en,meaning_vi\r\n"1","say","nói, kể \\"'.replace('\\"', '""') + 'chuyện""\nở nhà"\r\n');
  assert.equal(parsed[0].meaning_vi, 'nói, kể "chuyện"\nở nhà');
});

test("1328 thẻ nguồn được chuyển chính xác, giữ dạng đã chia và IPA", canDuLieu, () => {
  const cards = loadDataset(root);
  assert.equal(cards.length, 1328);
  const first = cards.find((card) => card.id === 1);
  assert.equal(first.term_en, "cds");
  assert.equal(first.pronunciation, "/ˌsiːˈdiːz/");
  const examples = JSON.parse(first.tense_examples);
  assert.equal(examples.length, 6);
  assert(examples.every((item) => item.highlight && item.translation && !item.sentence.includes("*")));
  assert.equal(examples[3].tense, "past_continuous");
  const source = fs.readFileSync(path.join(root, "ket-qua/lo-01.txt"), "utf8");
  assert.equal(examples[0].sentence, source.split(/\r?\n/)[1].split("|")[0].trim().replaceAll("*", ""));
});

test("từ chối thẻ trùng, thiếu câu hoặc sai dấu sao trước khi ghi", () => {
  const lines = Array(6).fill("I *paid* yesterday. | Tôi đã trả tiền.").join("\n");
  assert.throws(() => parseBatch(`#1 pay\n${lines}\n#1 pay\n${lines}`), /trùng/);
  assert.throws(() => parseBatch("#1 pay\nI *paid*. | Tôi đã trả tiền."), /6 câu/);
  assert.throws(() => parseBatch(`#1 pay\n${lines.replace("*paid*", "paid")}`), /highlight/);
});

test("đối chiếu từ chối ID thiếu, khác từ hoặc khác nghĩa", () => {
  const card = { id: 4, term_en: "bank", meaning_vi: "ngân hàng", tense_examples: "[]", pronunciation: "/bæŋk/" };
  assert.throws(() => planImport([card], []), /không có/);
  assert.throws(() => planImport([card], [{ ...card, term_en: "river" }]), /term_en/);
  assert.throws(() => planImport([card], [{ ...card, meaning_vi: "bờ sông" }]), /meaning_vi/);
});

test("chạy lại không đổi dữ liệu vì thứ tự khóa JSON; phân biệt SQL NULL với JSON null", () => {
  const a = { tense_examples: '[{"sentence":"Hi","highlight":"Hi"}]', pronunciation: "/haɪ/" };
  const b = { tense_examples: [{ highlight: "Hi", sentence: "Hi" }], pronunciation: "/haɪ/" };
  assert(sameContent(a, b));
  assert(!sameContent({ tense_examples: null, pronunciation: null }, { tense_examples: "null", pronunciation: null }));
  assert(!sameContent({ tense_examples: null, saved_tense_examples: "null", pronunciation: null }, { tense_examples: null, pronunciation: null }));
});

test("lỗi khi cập nhật sẽ rollback, không commit và vẫn giữ bản sao lưu", canDuLieu, async () => {
  const rows = loadDataset(root).map((card) => ({ ...card, saved_tense_examples: card.tense_examples }));
  rows[0] = { ...rows[0], tense_examples: null, saved_tense_examples: null, pronunciation: null };
  const calls = [];
  const connection = {
    async query(sql) {
      if (sql.includes("DATABASE() AS")) return [[{ database_name: "test_flashcard_import" }]];
      if (sql.includes("information_schema")) return [[{ COLUMN_NAME: "tense_examples", DATA_TYPE: "json" }, { COLUMN_NAME: "pronunciation", DATA_TYPE: "varchar" }]];
      if (sql.includes("FROM cards")) return [rows];
      throw new Error("Unexpected query");
    },
    async beginTransaction() { calls.push("begin"); },
    async execute() { throw new Error("simulated update failure"); },
    async rollback() { calls.push("rollback"); },
    async commit() { calls.push("commit"); },
    release() { calls.push("release"); },
  };
  const poolPath = require.resolve("../src/config/db");
  const previous = require.cache[poolPath];
  require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: { async getConnection() { return connection; }, async end() { calls.push("end"); } } };
  try {
    await assert.rejects(run(["--apply"]), /simulated update failure/);
    assert.deepEqual(calls, ["begin", "rollback", "release", "end"]);
    const dir = path.join(root, "work/db-backups");
    const own = fs.readdirSync(dir).filter((name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")).database === "test_flashcard_import");
    assert.equal(own.length, 1);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, own[0]), "utf8"));
    assert.equal(saved.before[0].tense_examples, null);
    assert.equal(saved.after.length, 1);
    fs.unlinkSync(path.join(dir, own[0]));
  } finally {
    if (previous) require.cache[poolPath] = previous;
    else delete require.cache[poolPath];
  }
});
