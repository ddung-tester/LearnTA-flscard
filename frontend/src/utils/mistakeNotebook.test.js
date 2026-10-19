import { beforeEach, expect, it, vi } from "vitest";
import {
  dongBoTuSaiLenBackend,
  ghiNgayKhoTuSai,
  hopNhatTuSaiTuBackend,
  layTatCaTuSai,
  luuTuSai,
  xoaTatCaTuSai,
} from "./mistakeNotebook";

const api = vi.hoisted(() => ({ dongBoMistakes: vi.fn() }));
vi.mock("../services/mistakeApi", () => api);

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

it("chỉ đẩy lên từ sai server chưa có hoặc vừa đổi trên máy, không gửi lại cả sổ mỗi lần mở app", async () => {
  xoaTatCaTuSai();
  // Server đã có "apple"; "pear" mới sai trên máy
  hopNhatTuSaiTuBackend([{ id: 5, card_id: 1, term_en: "apple", updated_at: "2026-09-01T00:00:00.000Z" }]);
  luuTuSai([{ id: 2, term_en: "pear", meaning_vi: "lê" }], { deckId: 10, deckTitle: "Fruits", source: "quiz" });
  api.dongBoMistakes.mockReset().mockImplementation(async (items) => ({
    mistakes: items.map((item, i) => ({ id: 100 + i, card_id: item.card_id, term_en: "x", updated_at: "2026-09-02T00:00:00.000Z" })),
  }));

  await dongBoTuSaiLenBackend();
  expect(api.dongBoMistakes.mock.calls.map(([items]) => items.map((item) => item.card_id))).toEqual([[2]]);

  api.dongBoMistakes.mockClear();
  await dongBoTuSaiLenBackend();
  expect(api.dongBoMistakes).not.toHaveBeenCalled();

  // Sai lại "apple" trên máy (vd. mất mạng lúc lưu): lần sau đẩy đúng từ đó
  luuTuSai([{ id: 1, term_en: "apple", meaning_vi: "táo" }], { deckId: 10, deckTitle: "Fruits", source: "quiz" });
  await dongBoTuSaiLenBackend();
  expect(api.dongBoMistakes.mock.calls.map(([items]) => items.map((item) => item.card_id))).toEqual([[1]]);
});
