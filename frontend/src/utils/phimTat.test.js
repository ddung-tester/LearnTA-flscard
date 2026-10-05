import { describe, expect, it } from "vitest";
import { laDangGoChu } from "./phimTat";

// Môi trường test không có DOM: giả lập phần tử với closest() theo tên thẻ
function phanTu(tagName, thuocTinh = {}) {
  const ten = tagName.toLowerCase();
  return {
    tagName,
    ...thuocTinh,
    closest: (selector) => (selector.split(",").some((s) => s.trim() === ten) ? {} : null),
  };
}

describe("laDangGoChu", () => {
  it("bỏ qua phím tắt khi gõ trong textarea hoặc ô nhập đang mở", () => {
    expect(laDangGoChu(phanTu("TEXTAREA"))).toBe(true);
    expect(laDangGoChu(phanTu("INPUT"))).toBe(true);
  });

  it("vẫn cho phím tắt ở ô nhập đã khoá, nút bấm và body", () => {
    expect(laDangGoChu(phanTu("INPUT", { readOnly: true }))).toBe(false);
    expect(laDangGoChu(phanTu("INPUT", { disabled: true }))).toBe(false);
    expect(laDangGoChu(phanTu("BUTTON"))).toBe(false);
    expect(laDangGoChu(phanTu("BODY"))).toBe(false);
    expect(laDangGoChu(null)).toBe(false);
  });
});
