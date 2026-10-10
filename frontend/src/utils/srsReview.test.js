import { chonKhoHocTap } from "./khoHocTap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capNhatKetQuaOn,
  datLaiSRS,
  ghiNgayKhoSRS,
  ghiNhanDungVaoSRS,
  ghiNhanLuyenCauDat,
  ghiNhanSaiVaoSRS,
  hopNhatSRSTuBackend,
  layCardsDenHan,
  layLevelSRS,
  layThongKeSRS,
  levelSauKetQua,
  moTaKhoangOn,
  themVaoSRS,
  taiSRSDongBo,
  taiCardsDenHanDongBo,
  xoaKhoiSRS,
} from "./srsReview";

const reviews = vi.hoisted(() => ({ all: vi.fn(), due: vi.fn() }));
vi.mock("../services/reviewApi", () => ({
  layReviewsKemMoc: async (params) => ({ items: await reviews.all(params), moc: reviews.moc?.(params) ?? null }),
  layReviewsDenHan: reviews.due,
}));

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

// 2026-09-26 10:00 giờ máy
const NOW = new Date(2026, 8, 26, 10, 0, 0);

function nuaDemSau(soNgay) {
  return new Date(2026, 8, 26 + soNgay, 0, 0, 0).toISOString();
}

beforeEach(() => {
  vi.stubGlobal("localStorage", taoLocalStorage());
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("themVaoSRS", () => {
  it("adds a new card due immediately", () => {
    themVaoSRS([CARD], OPTS);
    const [entry] = layCardsDenHan();
    expect(entry).toMatchObject({ id: "1", deckId: 10, word: "apple", level: 0, status: "active" });
  });

  it("keeps level and nextReviewAt when the card already exists", () => {
    themVaoSRS([CARD], OPTS);
    const updated = capNhatKetQuaOn(1, "correct");
    themVaoSRS([{ ...CARD, meaning_vi: "táo" }], OPTS);
    ghiNgayKhoSRS();

    const entry = JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"))["1"];
    expect(entry.meaning).toBe("táo");
    expect(entry.level).toBe(1);
    expect(entry.nextReviewAt).toBe(updated.nextReviewAt);
  });
});

describe("capNhatKetQuaOn — one rule for every mode", () => {
  it("returns null for unknown cards", () => {
    expect(capNhatKetQuaOn(999, "correct")).toBeNull();
  });

  it.each([
    [0, 1, 1],
    [1, 2, 3],
    [2, 3, 7],
    [3, 4, 14],
    [4, 5, 30],
    [5, 5, 30],
  ])("correct from Lv%i goes to Lv%i, due in %i days at midnight", (from, to, days) => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, from);
    const entry = capNhatKetQuaOn(1, "correct");

    expect(entry.level).toBe(to);
    expect(entry.nextReviewAt).toBe(nuaDemSau(days));
  });

  it("wrong lowers one level (min 0) and is due now", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, 3);

    expect(capNhatKetQuaOn(1, "wrong")).toMatchObject({ level: 2, nextReviewAt: NOW.toISOString() });
    capNhatKetQuaOn(1, 0);
    expect(capNhatKetQuaOn(1, "wrong").level).toBe(0);
    expect(layCardsDenHan()).toHaveLength(1);
  });

  it("choosing a level schedules by that level", () => {
    themVaoSRS([CARD], OPTS);
    expect(capNhatKetQuaOn(1, 4)).toMatchObject({ level: 4, nextReviewAt: nuaDemSau(14) });
    expect(capNhatKetQuaOn(1, 0).nextReviewAt).toBe(NOW.toISOString());
  });

  it("Lv5 is mastered but comes back when due", () => {
    themVaoSRS([CARD], OPTS);
    const entry = capNhatKetQuaOn(1, 5);

    expect(entry.status).toBe("mastered");
    expect(layThongKeSRS()).toMatchObject({ total: 1, mastered: 1, active: 0, duHomNay: 0 });

    vi.setSystemTime(new Date(2026, 9, 27, 8, 0, 0)); // 31 ngày sau
    expect(layCardsDenHan()).toHaveLength(1);
    expect(layThongKeSRS().duHomNay).toBe(1);
  });
});

describe("ghiNhanDungVaoSRS / ghiNhanSaiVaoSRS", () => {
  it("adds unseen cards then applies the answer", () => {
    ghiNhanDungVaoSRS([CARD], OPTS);
    ghiNhanSaiVaoSRS([{ id: 2, term_en: "pear", meaning_vi: "quả lê" }], OPTS);
    ghiNgayKhoSRS();

    const tatCa = JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"));
    expect(tatCa["1"]).toMatchObject({ level: 1, nextReviewAt: nuaDemSau(1) });
    expect(tatCa["2"]).toMatchObject({ level: 0, nextReviewAt: NOW.toISOString() });
  });

  it("a wrong answer on a known card lowers its level", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, 3);
    ghiNhanSaiVaoSRS([CARD], OPTS);
    ghiNgayKhoSRS();

    expect(JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"))["1"].level).toBe(2);
  });
});

describe("ghiNhanLuyenCauDat", () => {
  it("levels up a new or due card once, but not one that is not due yet", async () => {
    await ghiNhanLuyenCauDat(CARD, OPTS);
    ghiNgayKhoSRS();
    expect(JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"))["1"].level).toBe(1);

    // Vừa lên Lv1, hẹn ôn ngày mai: luyện câu lại hôm nay không leo thêm
    expect(await ghiNhanLuyenCauDat(CARD, OPTS)).toBeNull();
    ghiNgayKhoSRS();
    expect(JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"))["1"].level).toBe(1);
  });
});

describe("datLaiSRS / xoaKhoiSRS", () => {
  it("resets a mastered card to active, one level lower, due now", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, 5);
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
  it("backend is the source of truth, local-only fields are kept", () => {
    themVaoSRS([CARD], { ...OPTS, source: "flashcard" });
    capNhatKetQuaOn(1, 2); // local Lv2

    const [entry] = hopNhatSRSTuBackend([
      {
        id: 55,
        card_id: 1,
        term_en: "apple (backend)",
        level: 1,
        review_count: 5,
        next_review_at: nuaDemSau(1),
      },
    ]);

    expect(entry).toMatchObject({
      id: "1",
      word: "apple (backend)",
      level: 1,
      reviewCount: 5,
      source: "flashcard",
    });
  });
});

describe("layLevelSRS / levelSauKetQua", () => {
  it("reads current levels without writing and predicts the next level", () => {
    themVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, 3);
    ghiNgayKhoSRS();
    const truoc = localStorage.getItem("streak_drop_srs_v1:guest");

    expect(layLevelSRS([1, 2])).toEqual({ 1: 3, 2: null });
    ghiNgayKhoSRS();
    expect(localStorage.getItem("streak_drop_srs_v1:guest")).toBe(truoc);
    expect(levelSauKetQua(3, "correct")).toBe(4);
    expect(levelSauKetQua(3, "wrong")).toBe(2);
    expect(levelSauKetQua(null, "correct")).toBe(1);
    expect(levelSauKetQua(null, "wrong")).toBe(0);
  });
});

describe("moTaKhoangOn", () => {
  it("labels each level's interval", () => {
    expect([0, 1, 2, 3, 4, 5].map(moTaKhoangOn)).toEqual([
      "Ôn ngay",
      "1 ngày",
      "3 ngày",
      "7 ngày",
      "14 ngày",
      "30 ngày",
    ]);
  });
});


describe("complete SRS pagination", () => {
  it.each([250, 400])("loads every card from a %i-card server queue", async (count) => {
    const cards = Array.from({ length: count }, (_, i) => ({ card_id: i + 1, deck_id: 10, word: `word${i}`, meaning: "test", level: 1, next_review_at: NOW.toISOString() }));
    reviews.all.mockReset().mockImplementation(async ({ limit, offset }) => cards.slice(offset, offset + limit));
    await taiSRSDongBo({ limit: 200, deck_id: 10 });
    expect(layThongKeSRS().total).toBe(count);
    expect(reviews.all.mock.calls.map(([params]) => params.offset)).toEqual(count === 400 ? [0, 200, 400] : [0, 200]);
    expect(reviews.all.mock.calls.every(([params]) => params.deck_id === 10)).toBe(true);
  });
  it("paginates due cards too and never merges an incomplete download", async () => {
    const page = Array.from({ length: 200 }, (_, i) => ({ card_id: i + 1, level: 0, next_review_at: NOW.toISOString() }));
    reviews.due.mockReset().mockResolvedValueOnce(page).mockRejectedValueOnce(new Error("offline"));
    expect(await taiCardsDenHanDongBo({ limit: 200 })).toEqual([]);
    expect(layThongKeSRS().total).toBe(0);
    reviews.due.mockReset().mockResolvedValueOnce(page).mockResolvedValueOnce([{ card_id: 201, level: 0, next_review_at: NOW.toISOString() }]);
    expect(await taiCardsDenHanDongBo({ limit: 200 })).toHaveLength(201);
  });
});


describe("SRS sync speed", () => {
  const taoTrang = (count) => Array.from({ length: count }, (_, i) => ({ card_id: i + 1, deck_id: 10, level: 1, next_review_at: NOW.toISOString() }));

  it("requests every expected page at once when the local store already knows the size", async () => {
    const cards = taoTrang(450);
    reviews.all.mockReset().mockImplementation(async ({ limit, offset }) => cards.slice(offset, offset + limit));
    await taiSRSDongBo({ limit: 200 });
    reviews.all.mockClear();
    let dangCho = 0;
    let toiDa = 0;
    reviews.all.mockImplementation(async ({ limit, offset }) => {
      dangCho += 1;
      toiDa = Math.max(toiDa, dangCho);
      await Promise.resolve();
      dangCho -= 1;
      return cards.slice(offset, offset + limit);
    });
    await taiSRSDongBo({ limit: 200 });
    expect(reviews.all.mock.calls.map(([params]) => params.offset)).toEqual([0, 200, 400]);
    expect(toiDa).toBe(3);
    expect(layThongKeSRS().total).toBe(450);
  });

  it("shares one download between callers that start together", async () => {
    reviews.all.mockReset().mockResolvedValue([{ card_id: 1, level: 1, next_review_at: NOW.toISOString() }]);
    const [a, b] = await Promise.all([taiSRSDongBo({ limit: 200 }), taiSRSDongBo({ limit: 200 })]);
    expect(reviews.all).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});

it("discards pagination when the account changes between pages", async () => {
  chonKhoHocTap(77);
  const page = Array.from({ length: 200 }, (_, i) => ({ card_id: i + 1 }));
  reviews.all.mockReset().mockResolvedValueOnce(page).mockImplementationOnce(async () => {
    chonKhoHocTap(88);
    return [{ card_id: 201 }];
  });
  expect(await taiSRSDongBo()).toEqual([]);
  expect(layThongKeSRS().total).toBe(0);
  chonKhoHocTap(null);
});


describe("đồng bộ phần thay đổi", () => {
  afterEach(() => {
    reviews.moc = undefined;
  });

  it("downloads everything once, then only asks for rows changed since the server cursor", async () => {
    const cards = Array.from({ length: 450 }, (_, i) => ({ card_id: i + 1, deck_id: 10, level: 1, next_review_at: NOW.toISOString() }));
    reviews.moc = ({ since }) => (since ? "2026-09-26T03:05:00.000Z" : "2026-09-26T03:00:00.000Z");
    reviews.all.mockReset().mockImplementation(async ({ limit, offset, since }) =>
      since ? [{ card_id: 7, deck_id: 10, level: 3, next_review_at: NOW.toISOString() }] : cards.slice(offset, offset + limit)
    );

    await taiSRSDongBo({ limit: 200 });
    expect(reviews.all).toHaveBeenCalledTimes(3);

    reviews.all.mockClear();
    await taiSRSDongBo({ limit: 200 });
    expect(reviews.all.mock.calls.map(([p]) => p)).toEqual([{ limit: 200, offset: 0, since: "2026-09-26T03:00:00.000Z" }]);
    expect(layThongKeSRS().total).toBe(450);
    expect(layLevelSRS(["7"])["7"]).toBe(3);

    // Mốc tiến theo server sau mỗi lần
    reviews.all.mockClear();
    await taiSRSDongBo({ limit: 200 });
    expect(reviews.all.mock.calls[0][0].since).toBe("2026-09-26T03:05:00.000Z");
  });

  it("downloads everything again after 24 hours, when filtering by deck, or when the server sends no cursor", async () => {
    reviews.moc = () => "2026-09-26T03:00:00.000Z";
    reviews.all.mockReset().mockResolvedValue([{ card_id: 1, deck_id: 10, level: 1, next_review_at: NOW.toISOString() }]);
    await taiSRSDongBo({ limit: 200 });

    reviews.all.mockClear();
    await taiSRSDongBo({ limit: 200, deck_id: 10 });
    expect(reviews.all.mock.calls[0][0].since).toBeUndefined();

    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60 * 60 * 1000));
    reviews.all.mockClear();
    await taiSRSDongBo({ limit: 200 });
    expect(reviews.all.mock.calls[0][0].since).toBeUndefined();
  });
});

describe("ghi kho SRS sau khi phản hồi đã vẽ", () => {
  it("gộp nhiều lần ghi trong một lượt thành một lần ghi localStorage, đọc lại vẫn thấy ngay", () => {
    const setItem = vi.spyOn(localStorage, "setItem");
    ghiNhanDungVaoSRS([CARD], OPTS);
    capNhatKetQuaOn(1, "correct");
    expect(layLevelSRS([1])).toEqual({ 1: 2 });
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("streak_drop_srs_v1:guest"))["1"].level).toBe(2);
  });

  it("đổi tài khoản khi còn chờ ghi: phần cũ ghi vào đúng kho cũ", () => {
    chonKhoHocTap(5);
    themVaoSRS([CARD], OPTS);
    chonKhoHocTap(6);
    themVaoSRS([{ id: 9, term_en: "kiwi" }], OPTS);
    ghiNgayKhoSRS();
    expect(Object.keys(JSON.parse(localStorage.getItem("streak_drop_srs_v1:user-5")))).toEqual(["1"]);
    expect(Object.keys(JSON.parse(localStorage.getItem("streak_drop_srs_v1:user-6")))).toEqual(["9"]);
    chonKhoHocTap(null);
  });
});
