import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  capNhatKetQuaOn,
  datLaiSRS,
  hopNhatSRSTuBackend,
  layCardsDenHan,
  layThongKeSRS,
  themVaoSRS,
  xoaKhoiSRS,
} from "./srsReview";

vi.mock("../services/reviewApi", () => ({}));

function taoLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const CARD = { id: 1, term_en: "apple", meaning_vi: "quả táo" };
const OPTS = { deckId: 10, deckTitle: "Fruits" };

beforeEach(() => {
  vi.stubGlobal("localStorage", taoLocalStorage());
});

describe("themVaoSRS", () => {
  it("adds a new card due immediately", () => {
    themVaoSRS([CARD], OPTS);
    const [entry] = layCardsDenHan();
    expect(entry).toMatchObject({ id: "1", deckId: 10, word: "apple", level: 0, status: "active" });
  });

  it("keeps nextReviewAt when the card already exists", () => {
    themVaoSRS([CARD], OPTS);
    const updated = capNhatKetQuaOn(1, "good");
    themVaoSRS([{ ...CARD, meaning_vi: "táo" }], OPTS);

    const entry = JSON.parse(localStorage.getItem("streak_drop_srs_v1"))["1"];
    expect(entry.meaning).toBe("táo");
    expect(entry.nextReviewAt).toBe(updated.nextReviewAt);
  });
});

describe("capNhatKetQuaOn", () => {
  it("returns null for unknown cards", () => {
    expect(capNhatKetQuaOn(999, "good")).toBeNull();
  });

  it.each([
    ["again", 1],
    ["hard", 2],
    ["good", 3],
    ["easy", 4],
  ])("ease %s from level 2 gives level %i", (ease, expected) => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, "easy"); // level 0 → 2
    expect(capNhatKetQuaOn(1, ease).level).toBe(expected);
  });

  it("marks card mastered at level 5 and removes it from due list", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, "easy");
    capNhatKetQuaOn(1, "easy");
    const entry = capNhatKetQuaOn(1, "easy");

    expect(entry.level).toBe(5);
    expect(entry.status).toBe("mastered");
    expect(layThongKeSRS()).toMatchObject({ total: 1, mastered: 1, active: 0 });
  });

  it("schedules 'again' 4 hours later, so it is no longer due now", () => {
    themVaoSRS([CARD], OPTS);
    const entry = capNhatKetQuaOn(1, "again");
    const hours = (new Date(entry.nextReviewAt) - Date.now()) / 36e5;

    expect(hours).toBeCloseTo(4, 1);
    expect(layCardsDenHan()).toHaveLength(0);
  });
});

describe("datLaiSRS / xoaKhoiSRS", () => {
  it("resets a mastered card to active, one level lower, due now", () => {
    themVaoSRS([CARD], OPTS);
    ["easy", "easy", "easy"].forEach((ease) => capNhatKetQuaOn(1, ease));
    datLaiSRS(1);

    const [entry] = layCardsDenHan();
    expect(entry).toMatchObject({ status: "active", level: 4 });
  });

  it("removes a card", () => {
    themVaoSRS([CARD], OPTS);
    xoaKhoiSRS(1);
    expect(layThongKeSRS().total).toBe(0);
  });
});

describe("hopNhatSRSTuBackend", () => {
  it("keeps the higher level and newer content when merging", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, "easy"); // local level 2

    const [entry] = hopNhatSRSTuBackend([
      {
        id: 55,
        card_id: 1,
        term_en: "apple (backend)",
        level: 1,
        review_count: 5,
        updated_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);

    expect(entry).toMatchObject({ backendId: 55, word: "apple (backend)", level: 2, reviewCount: 5 });
  });
});
