const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { getTodayVN } = require("../src/services/streakService");

test("getTodayVN uses Vietnam time (UTC+7)", (t) => {
  t.after(() => mock.timers.reset());

  // 16:59 UTC = 23:59 giờ VN, vẫn cùng ngày
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-03-10T16:59:00Z") });
  assert.equal(getTodayVN(), "2026-03-10");

  // 17:00 UTC = 00:00 giờ VN ngày hôm sau
  mock.timers.setTime(Date.parse("2026-03-10T17:00:00Z"));
  assert.equal(getTodayVN(), "2026-03-11");
});
