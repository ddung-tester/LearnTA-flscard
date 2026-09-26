const { test } = require("node:test");
const assert = require("node:assert/strict");

// config/db tạo pool khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const { getRoadmap, listRoadmaps } = require("../src/controllers/roadmapController");

function fakePool(ketQuaTheoLan) {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [ketQuaTheoLan[calls.length - 1] ?? []];
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

test("listRoadmaps returns counts as numbers and uses the viewer for progress", async () => {
  const calls = fakePool([
    [
      {
        id: 1,
        slug: "nen-tang",
        title: "Nền tảng",
        description: null,
        level_label: "A1–A2",
        deck_count: 4,
        word_count: "100",
        learned_count: "12",
        mastered_count: "3",
      },
    ],
  ]);
  const res = fakeRes();

  await listRoadmaps({ user: { id: 7 } }, res);

  assert.deepEqual(calls[0].params, [7]);
  assert.match(calls[0].sql, /d\.user_id IS NULL OR d\.is_public = TRUE/);
  assert.deepEqual(res.body, [
    {
      id: 1,
      slug: "nen-tang",
      title: "Nền tảng",
      description: "",
      level_label: "A1–A2",
      deck_count: 4,
      word_count: 100,
      learned_count: 12,
      mastered_count: 3,
    },
  ]);
});

test("anonymous viewers get zero progress (no user id to match)", async () => {
  const calls = fakePool([[]]);
  await listRoadmaps({}, fakeRes());
  assert.deepEqual(calls[0].params, [null]);
});

test("getRoadmap returns ordered decks with progress", async () => {
  const calls = fakePool([
    [{ id: 3, slug: "toeic", title: "TOEIC", description: "d", level_label: null }],
    [
      { id: 10, title: "Văn phòng", description: null, word_count: 25, learned_count: "5", mastered_count: "1", due_count: "2" },
    ],
  ]);
  const res = fakeRes();

  await getRoadmap({ params: { slug: "toeic" }, user: { id: 7 } }, res);

  assert.deepEqual(calls[1].params, [7, 3]);
  assert.match(calls[1].sql, /ORDER BY rd\.sort_order ASC/);
  assert.deepEqual(res.body.decks, [
    { id: 10, title: "Văn phòng", description: "", word_count: 25, learned_count: 5, mastered_count: 1, due_count: 2 },
  ]);
});

test("getRoadmap answers 404 for unknown or malformed slugs without querying bad input", async () => {
  const calls = fakePool([[]]);
  await assert.rejects(getRoadmap({ params: { slug: "khong-co" } }, fakeRes()), { statusCode: 404 });
  await assert.rejects(getRoadmap({ params: { slug: "x'; DROP" } }, fakeRes()), { statusCode: 404 });
  assert.equal(calls.length, 1);
});
