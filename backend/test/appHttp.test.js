const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test", JWT_SECRET: "local-regression-test-secret", CORS_ORIGIN: "https://app.example" });
const pool = require("../src/config/db");
const app = require("../src/app");

let server, port;
before(async () => {
  // Danh sách lộ trình đủ lớn để vượt ngưỡng nén (1 KB)
  pool.query = async () => [Array.from({ length: 40 }, (_, i) => ({ id: i + 1, slug: `lo-trinh-${i}`, title: `Lộ trình ${i}`, description: "Mô tả khá dài để phản hồi vượt ngưỡng nén của compression.", level_label: "A1", deck_count: 4, word_count: 80, learned_count: 3, mastered_count: 1 }))];
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  port = server.address().port;
});
after(() => server.close());

function goi(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res));
    });
    req.on("error", reject);
    req.end();
  });
}

test("preflight CORS được trình duyệt nhớ 2 giờ (không hỏi lại OPTIONS mỗi request)", async () => {
  const res = await goi("OPTIONS", "/api/decks", {
    Origin: "https://app.example",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "authorization",
  });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-max-age"], "7200");
});

test("JSON lớn được nén khi trình duyệt nhận gzip/br", async () => {
  const res = await goi("GET", "/api/roadmaps", { "Accept-Encoding": "gzip" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-encoding"], "gzip");
});

test("POST không có body không bị chặn ở bước kiểm tra body (prepare gửi không kèm body)", async () => {
  const khongBody = await goi("POST", "/api/course-questions/1/prepare");
  // Đi tới bước xác thực (401) thay vì bị trả 400 "Request body phai la JSON object"
  assert.equal(khongBody.statusCode, 401);

  const mang = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method: "POST", path: "/api/course-questions/1/prepare", headers: { "Content-Type": "application/json" } },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res));
      }
    );
    req.on("error", reject);
    req.end("[1,2]");
  });
  assert.equal(mang.statusCode, 400);
});
