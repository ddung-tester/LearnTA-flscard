import { describe, expect, it } from "vitest";
import { boCuaKhoaHoc, danhDauXong, demTuDenHan, lapKeHoach, ngayVN } from "./keHoachHomNay";

const buoi = (lesson_number, tienDo = {}) => ({
  lesson_number,
  title: `Bài ${lesson_number}`,
  deck_id: 100 + lesson_number,
  word_count: 8,
  question_count: 10,
  learned_count: 0,
  answered_count: 0,
  correct_count: 0,
  ...tienDo,
});
const khoa = (lessons) => ({ id: 1, title: "Khoá 48 ngày", lessons });

describe("keHoachHomNay", () => {
  it("khởi động bằng câu sai và từ của khoá, rồi tới buổi đang học theo thứ tự 3 bước", () => {
    const viec = lapKeHoach({ khoa: khoa([buoi(1), buoi(2)]), tuDenHan: { khoa: 12, khac: 0 }, cauDenHan: 4 });
    expect(viec.map((muc) => muc.id).slice(0, 5)).toEqual(["on-cau", "on-tu-khoa", "tu-vung:1", "ly-thuyet:1", "bai-tap:1"]);
    expect(viec[2].to).toBe("/khoa-hoc/1/bai/1/tu-vung");
    expect(viec[1].to).toBe("/review?nguon=khoa");
  });

  it("còn thời gian thì thêm buổi kế; bỏ bước đã xong", () => {
    const viec = lapKeHoach({
      khoa: khoa([buoi(1, { learned_count: 8, answered_count: 3, correct_count: 3 }), buoi(2)]),
      tuDenHan: { khoa: 0, khac: 0 },
      cauDenHan: 0,
      daDoc: (so) => so === 1,
    });
    expect(viec.map((muc) => muc.id)).toEqual(["bai-tap:1", "tu-vung:2", "ly-thuyet:2", "bai-tap:2"]);
  });

  it("từ của bộ khác chỉ vào phần Ôn thêm khi còn thời gian", () => {
    const viec = lapKeHoach({ khoa: null, tuDenHan: { khoa: 0, khac: 30 }, cauDenHan: 0 });
    expect(viec).toHaveLength(1);
    expect(viec[0]).toMatchObject({ id: "on-tu-khac", to: "/review?nguon=khac" });
  });

  it("đánh dấu xong theo dữ liệu thật, bài tập xong khi đúng ≥80%", () => {
    const keHoach = lapKeHoach({ khoa: khoa([buoi(1)]), tuDenHan: { khoa: 3, khac: 0 }, cauDenHan: 2 });
    const sau = danhDauXong(keHoach, {
      khoa: khoa([buoi(1, { learned_count: 8, answered_count: 10, correct_count: 8 })]),
      tuDenHan: { khoa: 0, khac: 0 },
      cauDenHan: 1,
      daDoc: () => true,
    });
    expect(Object.fromEntries(sau.map((muc) => [muc.id, muc.xong]))).toEqual({
      "on-cau": false,
      "on-tu-khoa": true,
      "tu-vung:1": true,
      "ly-thuyet:1": true,
      "bai-tap:1": true,
    });
  });

  it("tách từ đến hạn của khoá và bộ khác", () => {
    const ids = boCuaKhoaHoc([khoa([buoi(1)])]);
    const now = new Date("2026-11-24T05:00:00Z");
    const srs = [
      { deckId: 101, nextReviewAt: "2026-11-24T00:00:00Z" },
      { deckId: 7, nextReviewAt: "2026-11-23T00:00:00Z" },
      { deckId: 7, nextReviewAt: "2026-11-30T00:00:00Z" },
    ];
    expect(demTuDenHan(srs, ids, now)).toEqual({ khoa: 1, khac: 1 });
  });

  it("ngày tính theo giờ Việt Nam", () => {
    expect(ngayVN(new Date("2026-11-24T17:30:00Z"))).toBe("2026-11-25");
  });
});
