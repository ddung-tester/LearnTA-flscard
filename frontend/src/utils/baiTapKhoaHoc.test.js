import { describe, expect, it } from "vitest";
import {
  chuanHoaTraLoi,
  laTraLoiDung,
  layDapAnHienThi,
  tachChuDam,
  tenPhanBaiTap,
} from "./baiTapKhoaHoc";

const TRAC_NGHIEM = {
  type: "multiple_choice",
  source: "lesson",
  section: "quiz_2",
  options: [
    { key: "A", text: "is" },
    { key: "B", text: "are" },
  ],
  answer_key: "A",
};
const DIEN_TU = {
  type: "fill_blank",
  source: "exam",
  section: "fill_verbs",
  accepted_answers: ["did not pay", "didn’t pay"],
};

describe("chấm bài tập khoá học", () => {
  it("normalizes case, spaces, final punctuation and curly quotes", () => {
    expect(chuanHoaTraLoi("  Didn’t   PAY. ")).toBe("didn't pay");
  });

  it("checks the option letter for multiple choice", () => {
    expect(laTraLoiDung(TRAC_NGHIEM, "a")).toBe(true);
    expect(laTraLoiDung(TRAC_NGHIEM, "B")).toBe(false);
  });

  it("accepts any accepted spelling for fill-in, including a straight apostrophe", () => {
    expect(laTraLoiDung(DIEN_TU, "didn't pay")).toBe(true);
    expect(laTraLoiDung(DIEN_TU, "Did not pay!")).toBe(true);
    expect(laTraLoiDung(DIEN_TU, "not pay")).toBe(false);
    expect(laTraLoiDung(DIEN_TU, "   ")).toBe(false);
  });

  it("shows the correct answer text", () => {
    expect(layDapAnHienThi(TRAC_NGHIEM)).toBe("is");
    expect(layDapAnHienThi(DIEN_TU)).toBe("did not pay / didn’t pay");
  });
});

describe("hiển thị", () => {
  it("names exercise sections", () => {
    expect(tenPhanBaiTap(TRAC_NGHIEM)).toBe("Bài tập trong bài · Quiz 2");
    expect(tenPhanBaiTap(DIEN_TU)).toBe("Bài thi · Điền dạng đúng của động từ");
    expect(tenPhanBaiTap({ source: "khac", section: "new_part" })).toBe("new part");
  });

  it("splits **bold** segments without HTML", () => {
    expect(tachChuDam("Dùng **was** với I.")).toEqual([
      { text: "Dùng ", dam: false },
      { text: "was", dam: true },
      { text: " với I.", dam: false },
    ]);
    expect(tachChuDam("<b>x</b>")).toEqual([{ text: "<b>x</b>", dam: false }]);
    expect(tachChuDam("chủ ngữ số nhiều (*You, We*) dùng **were**")).toEqual([
      { text: "chủ ngữ số nhiều (You, We) dùng ", dam: false },
      { text: "were", dam: true },
    ]);
  });
});
