import { describe, expect, it } from "vitest";
import { kyTuEmoji, timEmoji } from "./timEmoji";

describe("timEmoji", () => {
  it("tìm theo từ và cụm từ", () => {
    expect(timEmoji("apple")).toBe("1f34e");
    expect(timEmoji("Climate change")).toBe("1f30f");
    expect(timEmoji("wake up")).toBe("23f0");
  });

  it("bỏ đuôi số nhiều, -ed, -ing, mạo từ và 'to'", () => {
    expect(timEmoji("apples")).toBe("1f34e");
    expect(timEmoji("strawberries")).toBe("1f353");
    expect(timEmoji("cooked")).toBe("1f373");
    expect(timEmoji("dancing")).toBe("1f483");
    expect(timEmoji("running")).toBe("1f45f");
    expect(timEmoji("to recycle")).toBe("1f6ae");
    expect(timEmoji("an apple")).toBe("1f34e");
  });

  it("thử từ cuối của cụm, không có thì null", () => {
    expect(timEmoji("red apple")).toBe("1f34e");
    expect(timEmoji("although")).toBeNull();
    expect(timEmoji("")).toBeNull();
  });

  it("đổi mã thành ký tự emoji", () => {
    expect(kyTuEmoji("1f34e")).toBe("🍎");
    expect(kyTuEmoji("2764_fe0f")).toBe("❤️");
  });
});
