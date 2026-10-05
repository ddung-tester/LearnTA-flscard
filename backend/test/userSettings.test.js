const { test } = require("node:test");
const assert = require("node:assert/strict");

// config/db tạo pool khi require; pool không kết nối cho tới khi query
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const { getUserSettings, updateUserSettings } = require("../src/controllers/userController");

function fakePool(rowsSettings = []) {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [rowsSettings];
  };
  pool.execute = async (sql, params) => {
    calls.push({ sql, params });
    return [{ affectedRows: 1 }];
  };
  return calls;
}

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
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

test("GET settings trả preferences đã lưu, chưa có thì null", async () => {
  fakePool([{ default_direction: "en-vi", email_reminders: 1, preferences: { giaoDien: "den-ban" } }]);
  const res = fakeRes();
  await getUserSettings({ user: { id: 7 } }, res);
  assert.deepEqual(res.body.preferences, { giaoDien: "den-ban" });

  fakePool([]);
  const resMoi = fakeRes();
  await getUserSettings({ user: { id: 7 } }, resMoi);
  assert.equal(resMoi.body.preferences, null);
});

test("PATCH preferences gộp vào bản đã lưu bằng JSON_MERGE_PATCH, theo đúng user trong token", async () => {
  const calls = fakePool([]);
  const res = fakeRes();
  await updateUserSettings({ user: { id: 7 }, body: { preferences: { amThanh: false } } }, res);

  const ghi = calls.find((call) => call.sql.includes("INSERT INTO user_settings"));
  assert.match(ghi.sql, /preferences = JSON_MERGE_PATCH\(COALESCE\(preferences, JSON_OBJECT\(\)\), CAST\(\? AS JSON\)\)/);
  assert.deepEqual(ghi.params, [7, '{"amThanh":false}', '{"amThanh":false}']);
});

test("PATCH vẫn cập nhật được cột cũ cùng lúc với preferences", async () => {
  const calls = fakePool([]);
  await updateUserSettings(
    { user: { id: 3 }, body: { email_reminders: false, preferences: { giaoDien: "sang" } } },
    fakeRes()
  );
  const ghi = calls.find((call) => call.sql.includes("INSERT INTO user_settings"));
  assert.deepEqual(ghi.params, [3, false, '{"giaoDien":"sang"}', false, '{"giaoDien":"sang"}']);
});

test("PATCH từ chối preferences không phải object hoặc quá lớn", async () => {
  fakePool([]);
  for (const preferences of [null, "den-ban", [1, 2]]) {
    await assert.rejects(
      updateUserSettings({ user: { id: 7 }, body: { preferences } }, fakeRes()),
      (error) => error.statusCode === 400
    );
  }
  await assert.rejects(
    updateUserSettings({ user: { id: 7 }, body: { preferences: { rac: "x".repeat(17 * 1024) } } }, fakeRes()),
    (error) => error.statusCode === 400
  );
});

test("PATCH cần đăng nhập", async () => {
  fakePool([]);
  await assert.rejects(
    updateUserSettings({ body: { preferences: {} } }, fakeRes()),
    (error) => error.statusCode === 401
  );
});
