const { test } = require("node:test");
const assert = require("node:assert/strict");

// deckController nạp config DB khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const { buildChatContext } = require("../src/services/chatContextService");

const PUBLIC_CARD = {
  id: 5, deck_id: 1, term_en: "apple", meaning_vi: "quả táo", example_sentence: "I eat an apple.",
  note: null, pronunciation: "/ˈæp.əl/", part_of_speech: "noun",
  user_id: null, is_public: 0, deck_title: "Fruits",
};

function fakeDb({ cards = {}, decks = {}, deckCards = [], mistakes = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push(sql);
      if (sql.includes("FROM cards c")) return [[cards[params[0]]].filter(Boolean)];
      if (sql.includes("FROM decks")) return [[decks[params[0]]].filter(Boolean)];
      if (sql.includes("FROM cards")) return [deckCards];
      if (sql.includes("FROM mistake_words")) return [mistakes];
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test("returns empty string without any context", async () => {
  const db = fakeDb();
  assert.equal(await buildChatContext(db, {}), "");
  assert.equal(db.calls.length, 0);
});

test("includes current card and its deck words", async () => {
  const db = fakeDb({
    cards: { 5: PUBLIC_CARD },
    deckCards: [{ term_en: "apple", meaning_vi: "quả táo" }, { term_en: "pear", meaning_vi: "quả lê" }],
  });
  const context = await buildChatContext(db, { cardId: 5 });

  assert.match(context, /Word: apple/);
  assert.match(context, /Part of speech: noun/);
  assert.match(context, /Current deck: "Fruits"\. Words in it: apple = quả táo; pear = quả lê/);
  assert.doesNotMatch(context, /Learner's note/);
});

test("ignores cards and decks the user cannot read", async () => {
  const privateCard = { ...PUBLIC_CARD, user_id: 99 };
  const privateDeck = { id: 2, user_id: 99, is_public: 0, title: "Secret" };
  const db = fakeDb({ cards: { 5: privateCard }, decks: { 2: privateDeck } });

  assert.equal(await buildChatContext(db, { cardId: 5 }), "");
  assert.equal(await buildChatContext(db, { userId: 7, deckId: 2 }), "");
  assert.match(await buildChatContext(db, { userId: 99, deckId: 2 }), /Current deck: "Secret"/);
});

test("adds top mistakes only for logged-in users", async () => {
  const db = fakeDb({ mistakes: [{ term_en: "though", meaning_vi: "mặc dù", mistake_count: 4 }] });

  assert.equal(await buildChatContext(db, {}), "");
  assert.match(await buildChatContext(db, { userId: 7 }), /though = mặc dù \(wrong 4x\)/);
});

test("clips long fields", async () => {
  const db = fakeDb({ cards: { 5: { ...PUBLIC_CARD, note: "x".repeat(1000) } } });
  const context = await buildChatContext(db, { cardId: 5 });
  const noteLine = context.split("\n").find((line) => line.startsWith("- Learner's note"));
  assert.ok(noteLine.length < 330);
});
