import { describe, expect, it } from "vitest";
import {
  cheTuTrongCau,
  chiaVong,
  chonTheChoPhien,
  chuanHoaDapAn,
  ganTienTrinh,
  khopDapAn,
  laCapNoiDung,
  O_TRONG,
  tachCauMau,
  taoGoiY,
  tachKetQuaPhien,
  taoDanhSachTienTrinh,
  tinhTienTrinh,
  tronMangOnDinh,
} from "./phienHoc";
import {
  ganLoaiCauHonHop,
  LOAI_CAU_HON_HOP,
  taoDanhSachCauHoi,
  taoDanhSachCauHoiNguCanh,
} from "./cauHoiTracNghiem";

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

  it("does not keep consecutive ids together (ids trong DB thường liên tiếp)", () => {
    const the = Array.from({ length: 20 }, (_, i) => ({ id: 267 + i }));
    let soCapLienTiep = 0;
    const cacThuTu = new Set();

    for (let i = 0; i < 200; i += 1) {
      const ids = tronMangOnDinh(the, `seed-${i}`, (t) => t.id).map((t) => t.id);
      cacThuTu.add(ids.join(","));
      for (let j = 1; j < ids.length; j += 1) {
        if (Math.abs(ids[j] - ids[j - 1]) === 1) soCapLienTiep += 1;
      }
    }

    // Hoán vị ngẫu nhiên 20 phần tử: trung bình ~1,9 cặp kề nhau liên tiếp
    expect(soCapLienTiep / 200).toBeLessThan(3);
    expect(cacThuTu.size).toBe(200);
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

describe("cheTuTrongCau", () => {
  it("blanks the word and its inflections, case-insensitive", () => {
    expect(cheTuTrongCau("She runs. Run fast!", "run")).toBe(`She ${O_TRONG}. ${O_TRONG} fast!`);
    expect(cheTuTrongCau("I gave up smoking.", "gave up")).toBe(`I ${O_TRONG} smoking.`);
  });

  it("returns null when the sentence does not contain the word", () => {
    expect(cheTuTrongCau("I like pineapples.", "apple")).toBeNull();
    expect(cheTuTrongCau(null, "apple")).toBeNull();
    expect(cheTuTrongCau("Apple pie.", "")).toBeNull();
  });
});

describe("taoDanhSachCauHoiNguCanh", () => {
  const CO_VI_DU = THE.map((the) => ({
    ...the,
    example_sentence: the.id === 5 ? "No example here." : `I bought a ${the.term_en} today.`,
  }));

  it("only keeps cards whose example contains the word, answers are English words", () => {
    const ds = taoDanhSachCauHoiNguCanh(CO_VI_DU, "s", CO_VI_DU);

    expect(ds.map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(ds[0]).toMatchObject({ cauHoi: `I bought a ${O_TRONG} today.`, dapAnDung: "apple" });
    expect(ds[0].danhSachDapAn).toHaveLength(4);
    expect(ds[0].danhSachDapAn.every((d) => CO_VI_DU.some((t) => t.term_en === d))).toBe(true);
  });
});

describe("ganLoaiCauHonHop", () => {
  it("gives every card one of the four types, choice cards carry 4 options", () => {
    const ds = ganLoaiCauHonHop(THE, "seed", THE);

    expect(ds.every((t) => LOAI_CAU_HON_HOP.includes(t.__loaiCau))).toBe(true);
    for (const the of ds.filter((t) => t.__loaiCau === "chon")) {
      expect(["en-vi", "vi-en"]).toContain(the.__chieuChon);
      expect(the.__dapAnLuaChon).toHaveLength(4);
    }
    expect(ganLoaiCauHonHop(THE, "seed", THE)).toEqual(ds);
  });

  it("drops the choice type when the deck has fewer than 4 words", () => {
    const ds = ganLoaiCauHonHop(THE.slice(0, 3), "seed", THE.slice(0, 3));
    expect(ds.some((t) => t.__loaiCau === "chon")).toBe(false);
  });

  it("uses every type across a larger session", () => {
    const nhieu = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, term_en: `w${i}`, meaning_vi: `n${i}` }));
    const cacLoai = new Set(ganLoaiCauHonHop(nhieu, "x", nhieu).map((t) => t.__loaiCau));
    expect([...cacLoai].sort()).toEqual([...LOAI_CAU_HON_HOP].sort());
  });
});

describe("chiaVong", () => {
  const ds = (n) => Array.from({ length: n }, (_, i) => i);

  it("splits evenly with at most N per round", () => {
    expect(chiaVong(ds(11), 5).map((v) => v.length)).toEqual([4, 4, 3]);
    expect(chiaVong(ds(10), 5).map((v) => v.length)).toEqual([5, 5]);
    expect(chiaVong(ds(6), 5).map((v) => v.length)).toEqual([3, 3]);
    expect(chiaVong(ds(3), 5).map((v) => v.length)).toEqual([3]);
  });

  it("keeps order and every item", () => {
    expect(chiaVong(ds(7), 5).flat()).toEqual(ds(7));
    expect(chiaVong([], 5)).toEqual([]);
  });
});

describe("laCapNoiDung", () => {
  const BIG = { id: 1, term_en: "big", meaning_vi: "lớn" };
  const LARGE = { id: 2, term_en: "large", meaning_vi: " Lớn " };
  const BANK_1 = { id: 3, term_en: "bank", meaning_vi: "ngân hàng" };
  const BANK_2 = { id: 4, term_en: "Bank", meaning_vi: "bờ sông" };

  it("accepts the same card, same meaning or same word", () => {
    expect(laCapNoiDung(BIG, BIG)).toBe(true);
    expect(laCapNoiDung(BIG, LARGE)).toBe(true);
    expect(laCapNoiDung(BANK_1, BANK_2)).toBe(true);
  });

  it("rejects unrelated cards", () => {
    expect(laCapNoiDung(BIG, BANK_1)).toBe(false);
  });
});

describe("chonTheChoPhien", () => {
  const nhieu = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));

  it("keeps order and cuts to the limit when not random", () => {
    expect(chonTheChoPhien(nhieu, { soLuong: 5 }).map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
    expect(chonTheChoPhien(nhieu, { soLuong: 0 })).toHaveLength(30);
  });

  it("shuffles before cutting, so a random pick is not just the first N", () => {
    const a = chonTheChoPhien(nhieu, { ngauNhien: true, seed: "a", soLuong: 10 });
    const b = chonTheChoPhien(nhieu, { ngauNhien: true, seed: "b", soLuong: 10 });

    expect(a).toHaveLength(10);
    expect(a.map((t) => t.id)).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(a.map((t) => t.id)).not.toEqual(b.map((t) => t.id));
    expect(chonTheChoPhien(nhieu, { ngauNhien: true, seed: "a", soLuong: 10 })).toEqual(a);
  });
});

describe("chuanHoaDapAn / taoGoiY", () => {
  it("compares typed answers ignoring case and extra spaces", () => {
    expect(chuanHoaDapAn("  Give   UP ")).toBe(chuanHoaDapAn("give up"));
    expect(chuanHoaDapAn(null)).toBe("");
  });

  it("accepts the full answer or any one meaning in a list", () => {
    expect(khopDapAn("anh trai", "anh trai, em trai")).toBe(true);
    expect(khopDapAn(" Em  trai ", "anh trai, em trai")).toBe(true);
    expect(khopDapAn("anh trai, em trai", "anh trai, em trai")).toBe(true);
    expect(khopDapAn("phụ huynh", "cha hoặc mẹ, phụ huynh")).toBe(true);
    expect(khopDapAn("cũ", "già; cũ")).toBe(true);
    expect(khopDapAn("trai", "anh trai, em trai")).toBe(false);
    expect(khopDapAn("", "anh trai, em trai")).toBe(false);
    expect(khopDapAn(" , ", "anh trai, em trai")).toBe(false);
  });

  it("shows 40% of the letters, keeps spaces", () => {
    expect(taoGoiY("apple")).toBe("ap___");
    expect(taoGoiY("give up")).toBe("giv_ __");
    expect(taoGoiY("a")).toBe("a");
    expect(taoGoiY("")).toBe("");
  });
});
