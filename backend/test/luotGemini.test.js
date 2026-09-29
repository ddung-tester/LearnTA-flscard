const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ghiNhanLoi, xepTheoLuot, NGHI_SAU_429_MS } = require("../src/services/luotGemini");

test("a model that just returned 429 is tried last until its cool-down ends", () => {
  const A = { model: "a-test" };
  const B = { model: "b-test" };
  const now = 1_000_000;
  assert.deepEqual(xepTheoLuot([A, B], now), [A, B]);

  ghiNhanLoi(A, { status: 429 }, now);
  assert.deepEqual(xepTheoLuot([A, B], now + 1000), [B, A]);
  assert.deepEqual(xepTheoLuot([A, B], now + NGHI_SAU_429_MS + 1), [A, B]);
});

test("other errors do not put a model to rest; plain model names work too", () => {
  const now = 2_000_000;
  ghiNhanLoi("c-test", { status: 503 }, now);
  assert.deepEqual(xepTheoLuot(["c-test", "d-test"], now + 1), ["c-test", "d-test"]);
});
