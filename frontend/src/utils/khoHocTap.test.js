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
