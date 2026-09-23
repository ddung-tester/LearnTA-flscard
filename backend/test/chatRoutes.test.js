const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
delete process.env.GEMINI_API_KEY;
const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/chat`;
});

after(() => server.close());

function postChat(body) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const WELCOME = { role: "model", parts: [{ text: "Xin chào!" }] };
const QUESTION = { role: "user", parts: [{ text: "since vs for?" }] };

test("rejects invalid bodies with 400", async () => {
  const invalidBodies = [
    { messages: "hi" },
    { messages: [] },
    { messages: [QUESTION, WELCOME] }, // tin cuối không phải user
    { messages: [{ role: "system", parts: [{ text: "x" }] }] },
    { messages: [{ role: "user", parts: [{ text: "a".repeat(2001) }] }] },
    { messages: [QUESTION], context: { cardId: -1 } },
    { messages: [QUESTION], context: { deckId: "abc" } },
  ];

  for (const body of invalidBodies) {
    const response = await postChat(body);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
});

test("accepts history starting with the welcome message", async () => {
  // Không có GEMINI_API_KEY → 503 sau khi qua validation
  const response = await postChat({ messages: [WELCOME, QUESTION], context: { deckId: "3", cardId: null } });
  assert.equal(response.status, 503);
});
