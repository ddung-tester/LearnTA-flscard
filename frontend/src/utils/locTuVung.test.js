import { describe, expect, it } from "vitest";
import {
  apDungBoLoc,
  demTheoFilter,
  docBoLocTuUrl,
  FILTER_TU,
  locFilterCoIch,
  soLuongCoIch,
  laTuMoiThem,
  locTheoFilter,
  taoQueryBoLoc,
  timTheoTuKhoa,
} from "./locTuVung";

const NGAY = 86400000;
const bayGio = Date.now();
const danhSach = [
  { id: 1, term_en: "banana", meaning_vi: "quả chuối", correct_count: 6, wrong_count: 0, is_favorite: true, created_at: new Date(bayGio - 30 * NGAY).toISOString() },
  { id: 2, term_en: "apple", meaning_vi: "quả táo", correct_count: 2, wrong_count: 3, is_favorite: false, created_at: new Date(bayGio - 1 * NGAY).toISOString() },
  { id: 3, term_en: "road", meaning_vi: "đường", correct_count: 0, wrong_count: 1, is_favorite: false, created_at: new Date(bayGio - 10 * NGAY).toISOString(), example_sentence: "Cross the road." },
];
const ids = (ds) => ds.map((t) => t.id);

describe("locTuVung", () => {
  it("'Mới thêm' dựa vào ngày thêm, không trùng với 'Chưa học'", () => {
    expect(ids(locTheoFilter(danhSach, "moi-them"))).toEqual([2]);
    expect(ids(locTheoFilter(danhSach, "chua-hoc-filter"))).toEqual([2, 3]);
    expect(laTuMoiThem({ created_at: null })).toBe(false);
  });

  it("lọc đã học / yêu thích / tất cả", () => {
    expect(ids(locTheoFilter(danhSach, "da-hoc"))).toEqual([1]);
    expect(ids(locTheoFilter(danhSach, "yeu-thich"))).toEqual([1]);
    expect(locTheoFilter(danhSach, "tat-ca")).toBe(danhSach);
  });

  it("đếm số từ theo từng bộ lọc", () => {
    expect(demTheoFilter(danhSach)).toEqual({
      "tat-ca": 3, "yeu-thich": 1, "moi-them": 1, "chua-hoc-filter": 2, "da-hoc": 1,
    });
  });

  it("tìm kiếm không phân biệt dấu, hoa thường, trên cả nghĩa và câu ví dụ", () => {
    expect(ids(timTheoTuKhoa(danhSach, "qua tao"))).toEqual([2]);
    expect(ids(timTheoTuKhoa(danhSach, "DUONG"))).toEqual([3]);
    expect(ids(timTheoTuKhoa(danhSach, "cross"))).toEqual([3]);
    expect(timTheoTuKhoa(danhSach, "  ")).toBe(danhSach);
  });

  it("kết hợp lọc + tìm + sắp xếp", () => {
    expect(ids(apDungBoLoc(danhSach, { sort: "ten" }))).toEqual([2, 1, 3]);
    expect(ids(apDungBoLoc(danhSach, { sort: "so-cau-sai" }))).toEqual([2, 3, 1]);
    expect(ids(apDungBoLoc(danhSach, { sort: "da-hoc" }))[0]).toBe(1);
    expect(ids(apDungBoLoc(danhSach, { filter: "chua-hoc-filter", tuKhoa: "qua", sort: "ten" }))).toEqual([2]);
  });

  it("đọc/ghi URL, bỏ qua giá trị không hợp lệ", () => {
    const query = taoQueryBoLoc({ filter: "da-hoc", sort: "ten", tuKhoa: " táo " });
    expect(docBoLocTuUrl(new URLSearchParams(query))).toEqual({ filter: "da-hoc", sort: "ten", tuKhoa: "táo", soLuong: 0, ngauNhien: null });
    expect(taoQueryBoLoc({})).toBe("");
    expect(docBoLocTuUrl(new URLSearchParams("filter=xyz&sort=abc"))).toEqual({ filter: "tat-ca", sort: "mac-dinh", tuKhoa: "", soLuong: 0, ngauNhien: null });
  });
});

describe("số lượng và thứ tự ngẫu nhiên trên URL", () => {
  it("reads n and random, ignoring invalid values", () => {
    const boLoc = docBoLocTuUrl(new URLSearchParams("filter=da-hoc&n=20&random=1"));
    expect(boLoc).toMatchObject({ filter: "da-hoc", soLuong: 20, ngauNhien: true });

    expect(docBoLocTuUrl(new URLSearchParams("n=-3&random=0"))).toMatchObject({ soLuong: 0, ngauNhien: false });
    expect(docBoLocTuUrl(new URLSearchParams("n=abc"))).toMatchObject({ soLuong: 0, ngauNhien: null });
    expect(docBoLocTuUrl(new URLSearchParams("n=99999")).soLuong).toBe(1000);
  });

  it("writes n and random only when set", () => {
    expect(taoQueryBoLoc({ filter: "chua-hoc-filter", soLuong: 50, ngauNhien: true })).toBe(
      "?filter=chua-hoc-filter&n=50&random=1"
    );
    expect(taoQueryBoLoc({ soLuong: 0, ngauNhien: null })).toBe("");
    expect(taoQueryBoLoc({ ngauNhien: false })).toBe("?random=0");
  });
});

describe("bộ lọc có tác dụng", () => {
  const keys = (ds) => ds.map((f) => f.key);

  it("hides empty filters and filters equal to all", () => {
    const dem = { "tat-ca": 20, "yeu-thich": 0, "moi-them": 20, "chua-hoc-filter": 15, "da-hoc": 5 };
    expect(keys(locFilterCoIch(FILTER_TU, dem, "tat-ca"))).toEqual(["tat-ca", "chua-hoc-filter", "da-hoc"]);
  });

  it("keeps the active filter even when it has no effect", () => {
    const dem = { "tat-ca": 20, "yeu-thich": 0, "moi-them": 20, "chua-hoc-filter": 20, "da-hoc": 0 };
    expect(keys(locFilterCoIch(FILTER_TU, dem, "tat-ca"))).toEqual(["tat-ca"]);
    expect(keys(locFilterCoIch(FILTER_TU, dem, "yeu-thich"))).toEqual(["tat-ca", "yeu-thich"]);
  });

  it("offers only amounts smaller than the word count", () => {
    expect(soLuongCoIch(20, 20)).toEqual([10, 20, 0]);
    expect(soLuongCoIch(20, 0)).toEqual([10, 0]);
    expect(soLuongCoIch(8, 0)).toEqual([0]);
    expect(soLuongCoIch(500, 0)).toEqual([10, 20, 50, 100, 200, 0]);
  });
});
