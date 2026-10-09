import { describe, expect, it } from "vitest";
import { soSanhTungTu } from "./luyenCau";

describe("soSanhTungTu", () => {
  it("bỏ qua hoa thường, dấu câu và kiểu dấu nháy", () => {
    const kq = soSanhTungTu("I don't like it.", "i don’t like it");
    expect(kq.soDung).toBe(4);
    expect(kq.tiLe).toBe(100);
    expect(kq.cacTu.map((t) => t.tu)).toEqual(["I", "don't", "like", "it."]);
  });

  it("một từ thiếu không làm sai các từ phía sau", () => {
    const kq = soSanhTungTu("She is very resilient", "She resilient");
    expect(kq.cacTu.map((t) => t.dung)).toEqual([true, false, false, true]);
    expect(kq.tiLe).toBe(50);
  });

  it("từ thừa trong câu trả lời không bị tính", () => {
    const kq = soSanhTungTu("We meet today", "we um meet uh today");
    expect(kq.soDung).toBe(3);
  });

  it("câu trả lời rỗng thì không từ nào đúng", () => {
    const kq = soSanhTungTu("Hello world", "");
    expect(kq.soDung).toBe(0);
    expect(kq.tongSo).toBe(2);
    expect(kq.tiLe).toBe(0);
  });

  it("bỏ qua dấu gạch đứng riêng", () => {
    expect(soSanhTungTu("Wait — now", "wait now").tongSo).toBe(2);
  });
});
