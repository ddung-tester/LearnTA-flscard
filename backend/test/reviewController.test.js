const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// config/db tao pool khi require; pool khong ket noi cho toi khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const reviewController = require("../src/controllers/reviewController");

const REVIEW_ROW = {
  id: 7,
  user_id: 1,
  card_id: 5,
  deck_id: 2,
  deck_title: "Fruits",
  term_en: "apple",
  meaning_vi: "quả táo",
  example_sentence: null,
  mastery_level: 5,
  review_count: 3,
  next_review_at: new Date(),
};

let db;

function fakeDb({ readable = true, progress = null, review = REVIEW_ROW } = {}) {
  const state = { queries: [], executed: [] };
  const handler = {
    async query(sql, params) {
      if (sql.includes("AS bayGio")) return [[{ bayGio: new Date("2026-10-10T08:00:00Z") }]];
      state.queries.push({ sql, params });
      if (sql.includes("SELECT c.id")) return [readable ? [{ id: params[0] }] : []];
      if (sql.includes("FROM card_progress cp")) return [review ? [review] : []];
      if (sql.includes("FROM card_progress")) return [progress ? [progress] : []];
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, params) {
      state.executed.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };
  const connection = {
    ...handler,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  pool.query = handler.query;
  pool.execute = handler.execute;
  pool.getConnection = async () => connection;
  return state;
}

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function fakeReq({ query = {}, params = {}, body = {} } = {}) {
  return { user: { id: 1 }, query, params, body };
}

beforeEach(() => {
  db = fakeDb();
});

test("GET /reviews/due only returns due words (Lv5 included)", async () => {
  const res = fakeRes();
  await reviewController.listDueReviews(fakeReq(), res);

  const [{ sql }] = db.queries;
  assert.match(sql, /cp\.next_review_at <= CURRENT_TIMESTAMP/);
  assert.doesNotMatch(sql, /mastery_level < 5/);
  assert.equal(res.body[0].level, 5);
  assert.equal(res.body[0].status, "mastered");
});

test("GET /reviews lists everything unless asked for due words", async () => {
  await reviewController.listReviews(fakeReq(), fakeRes());
  assert.doesNotMatch(db.queries[0].sql, /next_review_at <= CURRENT_TIMESTAMP/);
});

test("GET /reviews?since only returns rows changed since the cursor and sends the next cursor", async () => {
  const res = fakeRes();
  await reviewController.listReviews(fakeReq({ query: { since: "2026-10-10T07:00:00.000Z" } }), res);

  const [{ sql, params }] = db.queries;
  assert.match(sql, /cp\.updated_at >= \? OR c\.updated_at >= \? OR d\.updated_at >= \?/);
  // Lùi 5 s so với mốc để không sót giao dịch ghi xong ngay sau lúc lấy mốc
  const tu = new Date("2026-10-10T06:59:55.000Z").getTime();
  assert.deepEqual(params.filter((p) => p instanceof Date).map((d) => d.getTime()), [tu, tu, tu]);
  assert.equal(res.headers["X-Dong-Bo-Luc"], "2026-10-10T08:00:00.000Z");

  // Không có since (hoặc since hỏng): tải đủ như cũ
  db = fakeDb();
  await reviewController.listReviews(fakeReq({ query: { since: "khong-phai-ngay" } }), fakeRes());
  assert.doesNotMatch(db.queries[0].sql, /updated_at >= \?/);
});

test("wrong result lowers the level by one and makes the word due now", async () => {
  db = fakeDb({ progress: { id: 7, mastery_level: 3 } });
  const before = Date.now();
  await reviewController.updateReviewResultByCard(
    fakeReq({ params: { cardId: "5" }, body: { result: "wrong" } }),
    fakeRes()
  );

  const [level, correct, wrong, nextReviewAt] = db.executed[0].params;
  assert.deepEqual([level, correct, wrong], [2, 0, 1]);
  assert.ok(nextReviewAt.getTime() >= before && nextReviewAt.getTime() <= Date.now());
});

test("choosing a level sets it directly", async () => {
  db = fakeDb({ progress: { id: 7, mastery_level: 1 } });
  await reviewController.updateReviewResultByCard(
    fakeReq({ params: { cardId: "5" }, body: { level: 4 } }),
    fakeRes()
  );

  const [level, correct, wrong] = db.executed[0].params;
  assert.deepEqual([level, correct, wrong], [4, 0, 0]);
});

test("rejects unknown results and cards the user cannot read", async () => {
  await assert.rejects(
    reviewController.updateReviewResultByCard(
      fakeReq({ params: { cardId: "5" }, body: { result: "maybe" } }),
      fakeRes()
    ),
    { statusCode: 400 }
  );

  db = fakeDb({ readable: false });
  await assert.rejects(
    reviewController.updateReviewResultByCard(
      fakeReq({ params: { cardId: "5" }, body: { result: "correct" } }),
      fakeRes()
    ),
    { statusCode: 404 }
  );
  assert.equal(db.executed.length, 0);
});

test("bulk sync only inserts missing progress and skips unreadable cards", async () => {
  const res = fakeRes();
  await reviewController.bulkUpsertReviews(
    fakeReq({ body: { items: [{ card_id: 5, level: 9 }, { term_en: "no card id" }] } }),
    res
  );

  assert.equal(db.executed.length, 1);
  const [{ sql, params }] = db.executed;
  assert.match(sql, /ON DUPLICATE KEY UPDATE id = id/);
  assert.deepEqual(params.slice(0, 3), [1, 5, 5]);
  assert.equal(res.body.synced_count, 1);

  db = fakeDb({ readable: false });
  const skipped = fakeRes();
  await reviewController.bulkUpsertReviews(fakeReq({ body: { items: [{ card_id: 5 }] } }), skipped);
  assert.equal(db.executed.length, 0);
  assert.equal(skipped.body.synced_count, 0);
});

test("review reads and card writes only query the owner's decks or roadmap decks", async () => {
  await reviewController.listDueReviews(fakeReq(), fakeRes());
  await reviewController.updateReviewResultByCard(fakeReq({ params: { cardId: "5" }, body: { result: "wrong" } }), fakeRes());
  for (const { sql } of db.queries.filter(call => call.sql.includes("JOIN decks"))) {
    assert.match(sql, /\(d\.user_id = \? OR \(d\.user_id IS NULL AND EXISTS \(SELECT 1 FROM roadmap_decks/);
    assert.doesNotMatch(sql, /is_public = TRUE/);
  }
});
