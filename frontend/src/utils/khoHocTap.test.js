import { beforeEach, expect, it, vi } from "vitest";
import { chonKhoHocTap, khoaKhoHocTap, layPhienKhoHocTap, laPhienKhoHienTai } from "./khoHocTap";
import { themVaoSRS, layTatCaSRS, taiSRSDongBo, dongBoSRSLenBackend } from "./srsReview";
import { luuTienDoQuiz, layTienDoDeck } from "./tienDoHocTap";
import { taoStudySessionLocal } from "./studySessionHistory";

const api = vi.hoisted(() => ({ layReviews: vi.fn(), dongBoReviews: vi.fn() }));
vi.mock("../services/reviewApi", () => api);

beforeEach(() => {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  });
  vi.stubGlobal("window", { localStorage, dispatchEvent: vi.fn() });
  chonKhoHocTap(null);
});

it("keeps A's words and progress out of B and guest, and restores A's own cache", () => {
  chonKhoHocTap(1);
  themVaoSRS([{ id: 101, term_en: "private A" }], { deckId: 10, deckTitle: "A" });
  luuTienDoQuiz(10, { correct: 1, review: 0, total: 1 });
  chonKhoHocTap(2);
  expect(layTatCaSRS()).toEqual([]);
  expect(layTienDoDeck(10)).toBeNull();
  chonKhoHocTap(null);
  expect(layTatCaSRS()).toEqual([]);
  chonKhoHocTap(1);
  expect(layTatCaSRS()[0].word).toBe("private A");
  expect(layTienDoDeck(10).quiz.correct).toBe(1);
});

it("does not assign legacy unowned data to a new account or erase it", () => {
  localStorage.setItem("streak_drop_srs_v1", JSON.stringify({ 101: { id: "101", word: "legacy" } }));
  chonKhoHocTap(2);
  expect(layTatCaSRS()).toEqual([]);
  expect(localStorage.getItem("streak_drop_srs_v1")).toContain("legacy");
});

it("ignores A's delayed backend response after switching to B", async () => {
  chonKhoHocTap(1);
  let resolve;
  api.layReviews.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const request = taiSRSDongBo();
  chonKhoHocTap(2);
  resolve([{ card_id: 101, term_en: "private A", level: 2 }]);
  await request;
  expect(layTatCaSRS()).toEqual([]);
  expect(localStorage.getItem(khoaKhoHocTap("streak_drop_srs_v1")) ?? "").not.toContain("private A");
});

it("invalidates an old response even after A switches away and back", () => {
  chonKhoHocTap(1);
  const old = layPhienKhoHocTap();
  chonKhoHocTap(2);
  chonKhoHocTap(1);
  expect(laPhienKhoHienTai(old)).toBe(false);
});

it("does not seed SRS from answers awaiting sync, preventing a second level increase", async () => {
  chonKhoHocTap(1);
  themVaoSRS([{ id: 101, term_en: "pending" }, { id: 102, term_en: "other" }], { deckId: 10 });
  taoStudySessionLocal({ answers: [{ card_id: 101 }], sync: { pending: true } });
  api.dongBoReviews.mockResolvedValueOnce({ reviews: [] });
  await dongBoSRSLenBackend();
  expect(api.dongBoReviews.mock.calls.at(-1)[0].map((item) => item.card_id)).toEqual([102]);
});

it("pushes only words the server has not seen, in batches the API accepts", async () => {
  chonKhoHocTap(1);
  api.layReviews.mockResolvedValueOnce([{ card_id: 1, level: 2 }]);
  await taiSRSDongBo();
  themVaoSRS(Array.from({ length: 250 }, (_, i) => ({ id: 1000 + i, term_en: `w${i}` })), { deckId: 10 });
  api.dongBoReviews.mockReset().mockImplementation(async (items) => ({
    reviews: items.map((item) => ({ card_id: item.card_id, level: 0 })),
  }));

  await dongBoSRSLenBackend();
  const lo = api.dongBoReviews.mock.calls.map(([items]) => items.map((item) => item.card_id));
  expect(lo.map((items) => items.length)).toEqual([200, 50]);
  expect(lo.flat()).not.toContain(1);

  api.dongBoReviews.mockClear();
  await dongBoSRSLenBackend();
  expect(api.dongBoReviews).not.toHaveBeenCalled();
});
