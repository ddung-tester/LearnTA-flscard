import { describe, expect, it } from "vitest";
import { chiSoDangDoc, tachAmTiet } from "./amTiet";

const amTiet = (text) => tachAmTiet(text).filter((p) => p.laAmTiet).map((p) => p.text);

describe("tachAmTiet", () => {
  it("tách từ nhiều âm tiết, gộp e câm cuối", () => {
    expect(amTiet("family")).toEqual(["fa", "mi", "ly"]);
    expect(amTiet("understand")).toEqual(["un", "der", "stand"]);
    expect(amTiet("make")).toEqual(["make"]);
    expect(amTiet("rhythm")).toEqual(["rhythm"]);
  });

  it("ghép lại đúng câu gốc, giữ vị trí ký tự", () => {
    const cau = "My family eats dinner, together!";
    const manh = tachAmTiet(cau);
    expect(manh.map((p) => p.text).join("")).toBe(cau);
    for (const p of manh) expect(cau.slice(p.batDau, p.batDau + p.text.length)).toBe(p.text);
  });
});

describe("chiSoDangDoc", () => {
  const manh = tachAmTiet("hello world");
  // hel | lo | " " | world

  it("không đọc thì -1", () => {
    expect(chiSoDangDoc(manh, { dangDoc: false, kyTu: 0, kyTuLuc: 0 }, 100)).toBe(-1);
  });

  it("chạy theo thời gian từ lúc bắt đầu, dừng ở âm tiết cuối", () => {
    const tt = { dangDoc: true, kyTu: 0, kyTuLuc: 1000 };
    expect(manh[chiSoDangDoc(manh, tt, 1000, 200)].text).toBe("hel");
    expect(manh[chiSoDangDoc(manh, tt, 1250, 200)].text).toBe("lo");
    expect(manh[chiSoDangDoc(manh, tt, 9000, 200)].text).toBe("world");
  });

  it("nhảy tới từ mà trình duyệt báo", () => {
    const tt = { dangDoc: true, kyTu: 6, kyTuLuc: 500 };
    expect(manh[chiSoDangDoc(manh, tt, 500, 200)].text).toBe("world");
  });
});
