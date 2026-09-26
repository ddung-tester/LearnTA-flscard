const { test } = require("node:test");
const assert = require("node:assert/strict");
const noiDungThat = require("../database/content/lo-trinh.json");
const {
  chuanHoaNoiDungLoTrinh,
  kiemTraNoiDungLoTrinh,
  napNoiDungLoTrinh,
} = require("../src/utils/noiDungLoTrinh");

test("the bundled roadmap content is valid: every example contains its word", () => {
  assert.deepEqual(kiemTraNoiDungLoTrinh(noiDungThat), []);

  const loTrinh = chuanHoaNoiDungLoTrinh(noiDungThat);
  const soTu = loTrinh.flatMap((lt) => lt.decks).reduce((tong, bo) => tong + bo.words.length, 0);
  assert.equal(loTrinh.length, 3);
  assert.equal(soTu, 240);
});

test("kiemTraNoiDungLoTrinh reports bad slugs, duplicates and examples without the word", () => {
  const loi = kiemTraNoiDungLoTrinh({
    roadmaps: [
      {
        slug: "Bad Slug",
        title: "X",
        decks: [
          {
            key: "bo-1",
            title: "Bộ 1",
            words: [
              ["apple", "noun", "quả táo", "I like pineapples."],
              ["Apple", "noun", "quả táo", "An apple a day."],
              ["pear", "noun", "", "A pear."],
            ],
          },
        ],
      },
      { slug: "ok", title: "Y", decks: [{ key: "bo-1", title: "Bộ 2", words: [["a", "", "b", "a b"]] }] },
    ],
  });

  assert.ok(loi.some((dong) => dong.includes("slug không hợp lệ")));
  assert.ok(loi.some((dong) => dong.includes("câu ví dụ không chứa từ")));
  assert.ok(loi.some((dong) => dong.includes("bị trùng trong bộ")));
  assert.ok(loi.some((dong) => dong.includes("thiếu từ hoặc nghĩa")));
  assert.ok(loi.some((dong) => dong.includes("key bị trùng")));
  assert.deepEqual(kiemTraNoiDungLoTrinh({}), ["Thiếu mảng roadmaps"]);
});

// DB giả trong bộ nhớ, đủ cho các câu lệnh mà napNoiDungLoTrinh dùng
function taoDbGia() {
  const db = { roadmaps: [], roadmap_decks: [], decks: [], cards: [], nextId: 1 };
  const id = () => db.nextId++;

  return {
    db,
    async query(sql, params) {
      if (sql.includes("FROM roadmap_decks")) {
        return [db.roadmap_decks.filter((row) => row.deck_key === params[0])];
      }
      if (sql.includes("FROM roadmaps")) return [db.roadmaps.filter((row) => row.slug === params[0])];
      if (sql.includes("FROM cards")) return [db.cards.filter((row) => row.deck_id === params[0])];
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, params) {
      if (sql.startsWith("INSERT INTO roadmaps")) {
        const [slug, title] = params;
        const hienCo = db.roadmaps.find((row) => row.slug === slug);
        if (hienCo) hienCo.title = title;
        else db.roadmaps.push({ id: id(), slug, title });
        return [{}];
      }
      if (sql.startsWith("INSERT INTO decks")) {
        const row = { id: id(), user_id: null, title: params[0] };
        db.decks.push(row);
        return [{ insertId: row.id }];
      }
      if (sql.startsWith("INSERT INTO roadmap_decks")) {
        const [roadmap_id, deck_id, deck_key, sort_order] = params;
        db.roadmap_decks.push({ id: id(), roadmap_id, deck_id, deck_key, sort_order });
        return [{}];
      }
      if (sql.includes("INSERT INTO cards")) {
        const [meaning_vi, , , , , deck_id, term_en] = params;
        db.cards.push({ id: id(), deck_id, term_en, meaning_vi });
        return [{}];
      }
      if (sql.includes("UPDATE cards")) {
        db.cards.find((row) => row.id === params[5]).meaning_vi = params[0];
        return [{}];
      }
      if (sql.startsWith("UPDATE decks") || sql.startsWith("UPDATE roadmap_decks")) return [{}];
      throw new Error(`Unexpected execute: ${sql}`);
    },
  };
}

test("napNoiDungLoTrinh is idempotent: a second run updates instead of duplicating", async () => {
  const noiDung = {
    roadmaps: [
      {
        slug: "thu",
        title: "Thử",
        decks: [{ key: "thu-1", title: "Bộ thử", words: [["apple", "noun", "quả táo", "An apple."]] }],
      },
    ],
  };
  const conn = taoDbGia();

  const lan1 = await napNoiDungLoTrinh(conn, chuanHoaNoiDungLoTrinh(noiDung));
  assert.deepEqual(lan1, { loTrinh: 1, boMoi: 1, tuMoi: 1, tuCapNhat: 0 });

  noiDung.roadmaps[0].decks[0].words = [
    ["Apple", "noun", "trái táo", "An apple."],
    ["pear", "noun", "quả lê", "A pear."],
  ];
  const lan2 = await napNoiDungLoTrinh(conn, chuanHoaNoiDungLoTrinh(noiDung));

  assert.deepEqual(lan2, { loTrinh: 1, boMoi: 0, tuMoi: 1, tuCapNhat: 1 });
  assert.equal(conn.db.decks.length, 1);
  assert.equal(conn.db.roadmaps.length, 1);
  assert.deepEqual(
    conn.db.cards.map((the) => [the.term_en, the.meaning_vi]),
    [
      ["apple", "trái táo"],
      ["pear", "quả lê"],
    ]
  );
  assert.equal(conn.db.decks[0].user_id, null);
});
