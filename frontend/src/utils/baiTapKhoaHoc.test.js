import { describe, expect, it } from "vitest";
import {
  chuanHoaTraLoi,
  laTraLoiDung,
  layDapAnHienThi,
  tachChuDam,
  tachCongThuc,
  tongSoBuoiKhoaHoc,
  nhomPhanBaiTap,
  phanBaiTap,
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

describe("tongSoBuoiKhoaHoc", () => {
  it("reads the lesson count from the course name, never below the lessons that exist", () => {
    expect(tongSoBuoiKhoaHoc("Khoá 48 ngày lấy gốc tiếng Anh", 13)).toBe(48);
    expect(tongSoBuoiKhoaHoc("Khoá ngữ pháp", 13)).toBe(13);
    expect(tongSoBuoiKhoaHoc("Khoá 10 buổi", 12)).toBe(12);
  });
});

describe("tachCongThuc", () => {
  it("marks learner slots and fixed words", () => {
    expect(tachCongThuc("S + did not (didn’t) + V nguyên mẫu + ...")).toEqual([
      { text: "S", laCho: true },
      { text: "did not (didn’t)", laCho: false },
      { text: "V nguyên mẫu", laCho: true },
      { text: "...", laCho: true },
    ]);
    expect(tachCongThuc("Was/Were + S + ...?").map((k) => k.laCho)).toEqual([false, true, true]);
    expect(tachCongThuc("She/He + V2/V-ed").map((k) => k.laCho)).toEqual([false, true]);
    expect(tachCongThuc("")).toEqual([]);
  });
});

describe("hiển thị", () => {
  it("names exercise sections and groups them by source", () => {
    expect(phanBaiTap(TRAC_NGHIEM)).toEqual({ khoa: "lesson/quiz_2", nguon: "Trong bài", phan: "Quiz 2" });
    expect(phanBaiTap(DIEN_TU).phan).toBe("Điền động từ");
    expect(phanBaiTap({ source: "khac", section: "new_part" })).toEqual({
      khoa: "khac/new_part",
      nguon: "Khác",
      phan: "new part",
    });
    expect(nhomPhanBaiTap([TRAC_NGHIEM, DIEN_TU, TRAC_NGHIEM])).toEqual([
      { nguon: "Trong bài", cacPhan: [{ khoa: "lesson/quiz_2", phan: "Quiz 2", soCau: 2 }] },
      { nguon: "Bài thi", cacPhan: [{ khoa: "exam/fill_verbs", phan: "Điền động từ", soCau: 1 }] },
    ]);
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
