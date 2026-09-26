import { describe, expect, it } from "vitest";
import { locTuTrung, phanTichDanNhanh } from "./nhapNhanhTu";

describe("phanTichDanNhanh", () => {
  it("reads the full 6-column format", () => {
    const { hopLe, loi } = phanTichDanNhanh(
      "apple | /ˈæp.əl/ | noun | quả táo | I eat an apple. | Đồng nghĩa: không có"
    );

    expect(loi).toEqual([]);
    expect(hopLe).toEqual([
      {
        term_en: "apple",
        pronunciation: "/ˈæp.əl/",
        part_of_speech: "noun",
        meaning_vi: "quả táo",
        example_sentence: "I eat an apple.",
        note: "Đồng nghĩa: không có",
      },
    ]);
  });

  it("allows empty columns and tab-separated rows pasted from Excel", () => {
    const { hopLe } = phanTichDanNhanh("run |  | verb | chạy |  | \nbook\t/bʊk/\tnoun\tquyển sách");

    expect(hopLe[0]).toMatchObject({ term_en: "run", pronunciation: "", part_of_speech: "verb", meaning_vi: "chạy" });
    expect(hopLe[1]).toMatchObject({ term_en: "book", pronunciation: "/bʊk/", meaning_vi: "quyển sách" });
  });

  it("keeps supporting the old two-column formats and a 3-column shortcut", () => {
    const { hopLe } = phanTichDanNhanh(
      "apple - quả táo\nbook, quyển sách\ncat | con mèo\ndog | con chó | The dog barks."
    );

    expect(hopLe.map((t) => [t.term_en, t.meaning_vi])).toEqual([
      ["apple", "quả táo"],
      ["book", "quyển sách"],
      ["cat", "con mèo"],
      ["dog", "con chó"],
    ]);
    expect(hopLe[3].example_sentence).toBe("The dog barks.");
  });

  it("reports invalid lines with their line numbers and skips blank lines", () => {
    const { hopLe, loi } = phanTichDanNhanh("\njust a word\napple |  | noun |  | x\n");

    expect(hopLe).toEqual([]);
    expect(loi).toEqual([
      { dong: 2, noiDung: "just a word", lyDo: "Thiếu nghĩa" },
      { dong: 3, noiDung: "apple |  | noun |  | x", lyDo: "Thiếu nghĩa" },
    ]);
  });

  it("rejects fields longer than the database allows", () => {
    const { loi } = phanTichDanNhanh(`${"a".repeat(256)} - dài`);
    expect(loi[0].lyDo).toBe("Quá dài (tối đa 255 ký tự)");
  });
});

describe("locTuTrung", () => {
  it("drops words already in the deck or repeated in the paste (same word + part of speech)", () => {
    const hienCo = [{ term_en: "Apple", part_of_speech: "noun" }, { term_en: "run" }];
    const moi = [
      { term_en: "apple", part_of_speech: "noun" },
      { term_en: "apple", part_of_speech: "verb" },
      { term_en: "run", part_of_speech: "verb" },
      { term_en: "book", part_of_speech: "" },
      { term_en: "Book  ", part_of_speech: "" },
    ];

    const { moi: giuLai, trung } = locTuTrung(moi, hienCo);

    expect(giuLai.map((t) => `${t.term_en}/${t.part_of_speech}`)).toEqual(["apple/verb", "book/"]);
    expect(trung).toHaveLength(3);
  });
});
