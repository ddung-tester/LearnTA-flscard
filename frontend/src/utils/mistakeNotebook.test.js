import { beforeEach, expect, it, vi } from "vitest";
import { ghiNgayKhoTuSai, layTatCaTuSai, luuTuSai, xoaTatCaTuSai } from "./mistakeNotebook";

vi.mock("../services/mistakeApi", () => ({}));

let store;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  });
});

it("ghi sổ từ sai: đọc lại thấy ngay, xuống localStorage sau; xoá hết thì trống cả hai", () => {
  luuTuSai([{ id: 1, term_en: "apple", meaning_vi: "táo" }], { deckId: 10, deckTitle: "Fruits", source: "quiz" });
  expect(layTatCaTuSai().map((t) => t.word)).toEqual(["apple"]);
  expect(store.size).toBe(0);

  ghiNgayKhoTuSai();
  expect(JSON.parse(store.get("streak_drop_mistake_notebook_v1:guest"))["1"].word).toBe("apple");

  xoaTatCaTuSai();
  expect(layTatCaTuSai()).toEqual([]);
  expect(store.get("streak_drop_mistake_notebook_v1:guest")).toBe("{}");
});
