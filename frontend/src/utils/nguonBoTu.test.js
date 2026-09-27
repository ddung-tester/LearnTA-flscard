import { describe, expect, it } from "vitest";
import { layNoiChuaBo, nhomBoTuTheoNguon } from "./nguonBoTu";

const BO_KHOA_HOC = {
  id: 30,
  source: "course",
  parent: { course_id: 2, course_title: "Khoá 48 ngày", lesson_number: 13, lesson_title: "Quá khứ đơn" },
};
const BO_LO_TRINH = { id: 10, source: "roadmap", parent: { slug: "nen-tang", title: "Nền tảng A1–A2" } };

describe("nguonBoTu", () => {
  it("bộ của khoá học / lộ trình quay lại đúng buổi / chặng, bộ độc lập thì không có", () => {
    expect(layNoiChuaBo(BO_KHOA_HOC)).toEqual({ to: "/khoa-hoc/2/bai/13", nhan: "Buổi 13" });
    expect(layNoiChuaBo(BO_LO_TRINH)).toEqual({ to: "/roadmap/nen-tang", nhan: "Nền tảng A1–A2" });
    expect(layNoiChuaBo({ id: 1, source: "user", parent: null })).toBeNull();
    // Backend cũ chưa trả source/parent
    expect(layNoiChuaBo({ id: 1 })).toBeNull();
  });

  it("nhóm theo nguồn, giữ thứ tự xuất hiện", () => {
    const nhom = nhomBoTuTheoNguon([
      { id: 1, source: "user" },
      { id: 2 },
      BO_KHOA_HOC,
      { ...BO_KHOA_HOC, id: 31 },
      { id: 3, source: "sample" },
      BO_LO_TRINH,
    ]);

    expect(nhom.map((n) => [n.nhan, n.danhSach.map((bo) => bo.id)])).toEqual([
      ["Bộ từ của tôi", [1, 2]],
      ["Khoá 48 ngày", [30, 31]],
      ["Bộ từ mẫu", [3]],
      ["Lộ trình: Nền tảng A1–A2", [10]],
    ]);
  });
});
