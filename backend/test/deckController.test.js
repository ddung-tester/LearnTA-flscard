const { test } = require("node:test");
const assert = require("node:assert/strict");

// config/db tạo pool khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const {
  canReadDeck,
  canWriteDeck,
  deleteDeck,
  getDeck,
  isDeckOwner,
  listDecks,
  updateDeck,
} = require("../src/controllers/deckController");
const { toggleFavorite } = require("../src/controllers/cardController");

function fakePool(ketQuaTheoLan) {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [ketQuaTheoLan[calls.length - 1] ?? []];
  };
  pool.execute = async (sql, params) => {
    calls.push({ sql, params });
    return [{ affectedRows: 1 }];
  };
  return calls;
}

function fakeRes() {
  return {
    body: undefined,
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const BO_CO_BAN = { title: "Bộ", description: null, is_public: 0, card_count: 3 };
const BO_KHOA_HOC = {
  ...BO_CO_BAN,
  id: 30,
  user_id: 7,
  course_lesson_id: 4,
  course_id: 2,
  course_lesson_number: 13,
  course_lesson_title: "Thì quá khứ đơn",
  course_title: "Khoá 48 ngày",
};

test("getDeck derives the source and parent of each deck", async () => {
  const cacTruongHop = [
    [BO_KHOA_HOC, "course", { course_id: 2, course_title: "Khoá 48 ngày", lesson_number: 13, lesson_title: "Thì quá khứ đơn" }],
    [{ ...BO_CO_BAN, id: 10, user_id: null, roadmap_deck_id: 1, roadmap_slug: "nen-tang", roadmap_title: "Nền tảng" }, "roadmap", { slug: "nen-tang", title: "Nền tảng" }],
    [{ ...BO_CO_BAN, id: 11, user_id: 7 }, "user", null],
    [{ ...BO_CO_BAN, id: 12, user_id: null }, "sample", null],
  ];

  for (const [row, source, parent] of cacTruongHop) {
    fakePool([[row]]);
    const res = fakeRes();
    await getDeck({ params: { deckId: String(row.id) }, ...(row.user_id === null ? {} : { user: { id: 7 } }) }, res);
    assert.equal(res.body.source, source);
    assert.deepEqual(res.body.parent, parent);
  }
});

test("listDecks for a logged-in user returns only their own standalone decks", async () => {
  const calls = fakePool([[]]);
  await listDecks({ query: {}, user: { id: 7 } }, fakeRes());

  assert.match(calls[0].sql, /WHERE d\.user_id = \? AND rd\.id IS NULL AND cl\.id IS NULL/);
  assert.doesNotMatch(calls[0].sql, /d\.user_id IS NULL/);
  assert.deepEqual(calls[0].params, [7, 7]);
});

test("listDecks for guests excludes roadmap and course decks", async () => {
  const calls = fakePool([[]]);
  await listDecks({ query: {} }, fakeRes());

  assert.match(calls[0].sql, /WHERE d\.user_id IS NULL AND rd\.id IS NULL AND cl\.id IS NULL/);
  assert.doesNotMatch(calls[0].sql, /is_public = TRUE/);
  assert.deepEqual(calls[0].params, [null]);
});

test("scope=learnable: own decks plus roadmap decks, grouped by source", async () => {
  const calls = fakePool([[{ ...BO_KHOA_HOC }]]);
  const res = fakeRes();
  await listDecks({ query: { scope: "learnable" }, user: { id: 7 } }, res);

  assert.match(calls[0].sql, /WHERE \(d\.user_id <=> \? OR \(d\.user_id IS NULL AND rd\.id IS NOT NULL\)\)/);
  assert.match(calls[0].sql, /ORDER BY\s+CASE WHEN cl\.id IS NOT NULL/);
  assert.deepEqual(calls[0].params, [7, 7]);
  assert.equal(res.body[0].source, "course");

  const callsKhach = fakePool([[]]);
  await listDecks({ query: { scope: "learnable" } }, fakeRes());
  assert.deepEqual(callsKhach[0].params, [null, null]);
});

test("course decks are read-only even for their owner", () => {
  assert.equal(isDeckOwner({ user_id: 7, source: "course" }, 7), true);
  assert.equal(canWriteDeck({ user_id: 7, source: "course" }, 7), false);
  assert.equal(canWriteDeck({ user_id: 7, source: "user" }, 7), true);
  assert.equal(canWriteDeck({ user_id: 7, source: "user" }, 8), false);
  assert.equal(canWriteDeck({ user_id: null, source: "roadmap" }, 7), false);
});

test("updateDeck and deleteDeck reject course decks with 403", async () => {
  for (const handler of [updateDeck, deleteDeck]) {
    const calls = fakePool([[BO_KHOA_HOC]]);
    await assert.rejects(
      handler({ params: { deckId: "30" }, body: { title: "Tên mới" }, user: { id: 7 } }, fakeRes()),
      (error) => error.status === 403 || error.statusCode === 403
    );
    assert.equal(calls.filter((call) => /^\s*(UPDATE|DELETE)/i.test(call.sql)).length, 0);
  }
});

test("the owner can still favorite a word in a read-only course deck", async () => {
  const the = { id: 99, deck_id: 30, term_en: "went", meaning_vi: "đã đi", is_favorite: 0 };
  const calls = fakePool([[the], [BO_KHOA_HOC], [{ ...the, is_favorite: 1 }]]);
  const res = fakeRes();

  await toggleFavorite({ params: { cardId: "99" }, body: { is_favorite: true }, user: { id: 7 } }, res);

  assert.ok(calls.some((call) => /UPDATE cards SET is_favorite/.test(call.sql)));

  fakePool([[the], [BO_KHOA_HOC]]);
  await assert.rejects(
    toggleFavorite({ params: { cardId: "99" }, body: { is_favorite: true }, user: { id: 8 } }, fakeRes()),
    (error) => error.status === 403 || error.statusCode === 403
  );
});

test("deck read policy allows only guest samples or the authenticated owner's decks", async () => {
  for (const owner of [null, 7, 8]) {
    for (const userId of [null, 7, 8]) {
      const row = { ...BO_CO_BAN, id: 99, user_id: owner, is_public: 1 };
      const allowed = owner === userId;
      assert.equal(canReadDeck(row, userId), allowed);
      fakePool([[row]]);
      const req = { params: { deckId: "99" }, ...(userId === null ? {} : { user: { id: userId } }) };
      if (allowed) await getDeck(req, fakeRes());
      else await assert.rejects(getDeck(req, fakeRes()), { statusCode: 404 });
    }
  }
  assert.equal(canReadDeck({ user_id: 7 }, "7"), true);
});

test("roadmap decks (sample decks inside a roadmap) are readable by guests and every account, never writable", async () => {
  for (const userId of [null, 7, 8]) {
    assert.equal(canReadDeck({ user_id: null, source: "roadmap" }, userId), true);
    assert.equal(canReadDeck({ user_id: null, is_roadmap: 1 }, userId), true);
    assert.equal(canWriteDeck({ user_id: null, source: "roadmap" }, userId), false);
  }
  // Bộ mẫu ngoài lộ trình và bộ riêng của người khác vẫn đóng với tài khoản
  assert.equal(canReadDeck({ user_id: null, source: "sample" }, 7), false);
  assert.equal(canReadDeck({ user_id: 8, source: "roadmap" }, 7), false);
});
