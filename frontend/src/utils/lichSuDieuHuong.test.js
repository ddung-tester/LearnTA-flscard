import { beforeEach, describe, expect, it, vi } from "vitest";
import { ghiTrang, soBuocLui } from "./lichSuDieuHuong";

beforeEach(() => {
  const values = new Map();
  vi.stubGlobal("sessionStorage", { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) });
  vi.stubGlobal("window", { history: { state: null } });
});

function diQua(...cacTrang) {
  cacTrang.forEach((duongDan, idx) => ghiTrang(idx, duongDan, { catNhanh: true }));
  return cacTrang.length - 1;
}

describe("soBuocLui", () => {
  it("nút có nhãn chỉ lùi khi trang ngay trước đúng là đích (kể cả khác bước buổi học, khác query)", () => {
    const idx = diQua("/khoa-hoc/1/bai/1", "/decks/101?filter=tat-ca");
    expect(soBuocLui("len", "/khoa-hoc/1/bai/1/tu-vung", "/decks/101", idx)).toBe(-1);
    expect(soBuocLui("len", "/decks", "/decks/101", idx)).toBeNull();
  });

  it("Trở về của trang học về trang gần nhất người học đến từ đó, bỏ qua các lượt làm lại", () => {
    const idx = diQua("/practice", "/decks/5/quiz?n=20", "/decks/5/quiz?q=sai");
    expect(soBuocLui("noi-truoc", "/decks/5", "/decks/5/quiz?q=sai", idx)).toBe(-2);
  });

  it("mở thẳng link (không có trang trước trong app) thì đi theo đường dẫn", () => {
    const idx = diQua("/decks/5/quiz");
    expect(soBuocLui("noi-truoc", "/decks/5", "/decks/5/quiz", idx)).toBeNull();
    expect(soBuocLui("len", "/decks/5", "/decks/5/quiz", 3)).toBeNull();
  });

  it("đi trang mới từ giữa lịch sử thì nhánh cũ phía sau bị bỏ", () => {
    diQua("/decks", "/decks/5", "/decks/5/quiz");
    ghiTrang(1, "/stats", { catNhanh: true });
    expect(soBuocLui("len", "/decks", "/x", 2)).toBeNull();
  });
});
