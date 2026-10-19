const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { logRequestCham } = require("../src/middleware/logRequestCham");

function chay(duongDan, msGiaLap) {
  const ghi = [];
  const goc = console.warn;
  console.warn = (dong) => ghi.push(dong);
  const thatHrtime = process.hrtime.bigint;
  let lan = 0;
  process.hrtime.bigint = () => (lan++ === 0 ? 0n : BigInt(msGiaLap * 1e6));
  try {
    const res = new EventEmitter();
    res.statusCode = 200;
    logRequestCham({ method: "GET", originalUrl: duongDan }, res, () => {});
    res.emit("finish");
  } finally {
    console.warn = goc;
    process.hrtime.bigint = thatHrtime;
  }
  return ghi;
}

test("request thường chậm ≥ 800 ms được ghi log (bỏ query), nhanh thì không", () => {
  const log = chay("/api/courses?x=1", 1200);
  assert.equal(log.length, 1);
  assert.deepEqual(JSON.parse(log[0]), { severity: "WARNING", message: "slow_request", method: "GET", path: "/api/courses", status: 200, ms: 1200 });
  assert.equal(chay("/api/courses", 300).length, 0);
});

test("API gọi AI / audio vốn lâu thì không ghi", () => {
  assert.equal(chay("/api/course-questions/5/explain?stream=1", 5000).length, 0);
  assert.equal(chay("/api/course-questions/5/prepare", 5000).length, 0);
  assert.equal(chay("/api/chat", 5000).length, 0);
});
