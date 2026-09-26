import { describe, expect, it } from "vitest";
import {
  ganTienTrinh,
  tachCauMau,
  tachKetQuaPhien,
  taoDanhSachTienTrinh,
  tinhTienTrinh,
  tronMangOnDinh,
} from "./phienHoc";
import { taoDanhSachCauHoi } from "./cauHoiTracNghiem";

const THE = [
  { id: 1, term_en: "apple", meaning_vi: "quả táo" },
  { id: 2, term_en: "pear", meaning_vi: "quả lê" },
  { id: 3, term_en: "banana", meaning_vi: "quả chuối" },
  { id: 4, term_en: "grape", meaning_vi: "quả nho" },
  { id: 5, term_en: "orange", meaning_vi: "quả cam" },
];

describe("tronMangOnDinh", () => {
  it("is deterministic for a seed and keeps every item", () => {
    const a = tronMangOnDinh(THE, "s1", (the) => the.id);
    expect(tronMangOnDinh(THE, "s1", (the) => the.id)).toEqual(a);
    expect([...a].sort((x, y) => x.id - y.id)).toEqual(THE);
  });
});

describe("tiến trình theo đoạn 10 câu", () => {
  it("splits 23 questions into 10/10/3", () => {
    expect(taoDanhSachTienTrinh(23).map((t) => t.totalValue)).toEqual([10, 10, 3]);
  });

  it("tags each item with its segment", () => {
    const ds = ganTienTrinh(Array.from({ length: 12 }, (_, i) => ({ id: i })));
    expect(ds[9].__segmentIndex).toBe(0);
    expect(ds[10]).toMatchObject({ __segmentIndex: 1, __sessionKey: "10-10" });
  });

  it("fills segments linearly and points at the first unfinished one", () => {
    const tt = tinhTienTrinh(taoDanhSachTienTrinh(23), 12);
    expect(tt.cacThanh.map((t) => t.currentValue)).toEqual([10, 2, 0]);
    expect(tt).toMatchObject({ chiSoDangHoatDong: 1, soHoanThanh: 1, tienDoDoanHienTai: 20 });
    expect(tt.payload[0]).toEqual({ segment_index: 0, current: 10, total: 10, is_completed: true });
  });

  it("stays on the last segment when everything is done", () => {
    const tt = tinhTienTrinh(taoDanhSachTienTrinh(3), 3);
    expect(tt).toMatchObject({ chiSoDangHoatDong: 0, soHoanThanh: 1, tienDoDoanHienTai: 100 });
  });
});

describe("tachKetQuaPhien", () => {
  it("only counts cards that were in the session, once each", () => {
    const phien = [THE[0], THE[1], THE[0], THE[2]];
    const { danhSachCardDung, danhSachCardSai } = tachKetQuaPhien(phien, new Set([2]));

    expect(danhSachCardDung.map((t) => t.id)).toEqual([1, 3]);
    expect(danhSachCardSai.map((t) => t.id)).toEqual([2]);
  });
});

describe("tachCauMau", () => {
  it("marks the learned word, case-insensitive, at word starts only", () => {
    const doan = tachCauMau("Apple trees grow apples, not pineapples.", "apple");

    expect(doan.filter((d) => d.laTu).map((d) => d.text)).toEqual(["Apple", "apple"]);
    expect(doan.map((d) => d.text).join("")).toBe("Apple trees grow apples, not pineapples.");
  });

  it("handles phrases, regex characters and a missing word", () => {
    expect(tachCauMau("Look up (a.k.a.) it", "a.k.a.").some((d) => d.laTu)).toBe(true);
    expect(tachCauMau("I give up now", "give up").filter((d) => d.laTu)).toHaveLength(1);
    expect(tachCauMau("Hello", "")).toEqual([{ text: "Hello", laTu: false }]);
  });
});

describe("taoDanhSachCauHoi", () => {
  it("builds 4 distinct options including the right answer", () => {
    const [cau] = taoDanhSachCauHoi([THE[0]], "vi-en", "seed", THE);

    expect(cau).toMatchObject({ id: 1, cauHoi: "quả táo", dapAnDung: "apple" });
    expect(cau.danhSachDapAn).toHaveLength(4);
    expect(new Set(cau.danhSachDapAn).size).toBe(4);
    expect(cau.danhSachDapAn).toContain("apple");
  });

  it("is deterministic per seed and needs at least 4 cards in the pool", () => {
    expect(taoDanhSachCauHoi(THE, "en-vi", "x")).toEqual(taoDanhSachCauHoi(THE, "en-vi", "x"));
    expect(taoDanhSachCauHoi(THE.slice(0, 3), "en-vi", "x")).toEqual([]);
  });
});
