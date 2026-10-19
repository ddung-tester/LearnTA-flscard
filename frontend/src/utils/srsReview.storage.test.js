import { beforeEach, expect, it, vi } from "vitest";

// Module đăng ký nghe sự kiện "storage" / "pagehide" lúc nạp: cần window giả trước khi import
let srs;
beforeEach(async () => {
  vi.resetModules();
  const store = new Map();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { location: new URL("http://localhost/") }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.stubGlobal("localStorage", {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  });
  srs = await import("./srsReview");
});

it("thấy thay đổi do tab khác ghi vào localStorage", () => {
  srs.themVaoSRS([{ id: 1, term_en: "apple" }], { deckId: 10 });
  srs.ghiNgayKhoSRS();
  const tatCa = JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"));
  tatCa["1"].level = 4;
  localStorage.setItem("streak_drop_srs_v1:guest", JSON.stringify(tatCa));
  window.dispatchEvent(Object.assign(new Event("storage"), { key: "streak_drop_srs_v1:guest" }));
  expect(srs.layLevelSRS([1])).toEqual({ 1: 4 });
});

it("rời trang thì ghi ngay phần đang chờ", () => {
  srs.themVaoSRS([{ id: 2, term_en: "pear" }], { deckId: 10 });
  expect(localStorage.getItem("streak_drop_srs_v1:guest")).toBeNull();
  window.dispatchEvent(new Event("pagehide"));
  expect(Object.keys(JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest")))).toEqual(["2"]);
});
