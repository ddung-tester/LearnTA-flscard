const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tachHanhDong, huongDanHanhDong, dungNguCanhHocTap } = require("../src/services/chatNguCanhHocTap");

const DUONG_DAN = [{ to: "/review", nhan: "Ôn từ đến hạn" }, { to: "/khoa-hoc/1/bai/2/bai-tap", nhan: "Bài tập Buổi 2" }];

test("tách nút hợp lệ khỏi câu trả lời", () => {
  const { reply, actions } = tachHanhDong(
    "Bạn nên ôn lại.\n[[mo:/review|Ôn ngay]]\n[[mo:/khoa-hoc/1/bai/2/bai-tap|Làm bài]]\n[[them-tu:give up|từ bỏ]]",
    { duongDan: DUONG_DAN, coTheThemTu: true }
  );
  assert.equal(reply, "Bạn nên ôn lại.");
  assert.deepEqual(actions, [
    { loai: "mo", to: "/review", nhan: "Ôn ngay" },
    { loai: "mo", to: "/khoa-hoc/1/bai/2/bai-tap", nhan: "Làm bài" },
    { loai: "them-tu", tu: "give up", nghia: "từ bỏ" },
  ]);
});

test("bỏ đường dẫn bịa, link ngoài, thêm từ khi là khách và chữ không phải tiếng Anh", () => {
  const { reply, actions } = tachHanhDong(
    "OK [[mo:/admin|Quản trị]] [[mo:https://evil.example|Xem]] [[them-tu:<script>|x]]",
    { duongDan: DUONG_DAN, coTheThemTu: true }
  );
  assert.equal(reply, "OK");
  assert.deepEqual(actions, []);
  assert.deepEqual(tachHanhDong("[[them-tu:apple|táo]]", { duongDan: DUONG_DAN }).actions, []);
});

test("hướng dẫn chỉ liệt kê đường dẫn server tạo", () => {
  const huongDan = huongDanHanhDong(DUONG_DAN, false);
  assert.match(huongDan, /\/khoa-hoc\/1\/bai\/2\/bai-tap/);
  assert.doesNotMatch(huongDan, /them-tu/);
});

test("khách: chỉ có vị trí trang, không đọc DB, không có nút", async () => {
  const db = { async query() { throw new Error("không được gọi DB"); } };
  const kq = await dungNguCanhHocTap(db, { trang: "on-tap" });
  assert.match(kq.text, /Ôn tập/);
  assert.deepEqual(kq.duongDan, []);
});
