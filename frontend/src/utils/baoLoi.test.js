import { afterEach, beforeEach, expect, it, vi } from "vitest";

let ss;
beforeEach(() => {
  vi.resetModules();
  ss = new Map();
  vi.stubGlobal("sessionStorage", { getItem: (k) => ss.get(k) ?? null, setItem: (k, v) => ss.set(k, String(v)) });
  vi.stubGlobal("window", { location: { reload: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

it("nhận ra lỗi tải file JS của bản cũ trên các trình duyệt", async () => {
  const { laLoiTaiFileJs } = await import("./baoLoi");
  expect(laLoiTaiFileJs(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js"))).toBe(true);
  expect(laLoiTaiFileJs(new TypeError("Importing a module script failed."))).toBe(true);
  expect(laLoiTaiFileJs(new Error("error loading dynamically imported module"))).toBe(true);
  expect(laLoiTaiFileJs(new Error("x is not a function"))).toBe(false);
});

it("gặp file JS cũ thì tải lại trang đúng một lần, lần sau để lỗi hiện ra", async () => {
  const { taiTrangAnToan } = await import("./baoLoi");
  const loi = new TypeError("Failed to fetch dynamically imported module");
  const tai = taiTrangAnToan(() => Promise.reject(loi));

  const lan1 = tai();
  await Promise.resolve();
  await Promise.resolve();
  expect(window.location.reload).toHaveBeenCalledTimes(1);
  void lan1;

  await expect(tai()).rejects.toBe(loi);
  expect(window.location.reload).toHaveBeenCalledTimes(1);
});

it("lỗi khác không tải lại trang", async () => {
  const { taiTrangAnToan } = await import("./baoLoi");
  const loi = new Error("x is not a function");
  await expect(taiTrangAnToan(() => Promise.reject(loi))()).rejects.toBe(loi);
  expect(window.location.reload).not.toHaveBeenCalled();
});
