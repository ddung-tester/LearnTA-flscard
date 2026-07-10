/**
 * srsReview.js — Lightweight SRS (Spaced Repetition) queue, localStorage-backed.
 *
 * Giữ một hàng đợi ôn tập client-side. Khi user ôn, gọi API backend
 * PATCH /cards/:cardId/progress với is_correct để backend cập nhật mastery_level
 * và next_review_at. SRS queue ở đây chứa metadata để render card
 * và tính due date client-side.
 *
 * Cấu trúc mỗi entry:
 * {
 *   id: string,             // card.id (key)
 *   deckId: number,
 *   deckTitle: string,
 *   word: string,           // card.term_en
 *   meaning: string,        // card.meaning_vi
 *   example: string|null,   // card.example_sentence
 *   source: "mistake"|"quiz"|"tuluan"|"manual",
 *   level: number,          // 0–5 (local mirror of mastery_level)
 *   reviewCount: number,
 *   lastReviewedAt: string|null,
 *   nextReviewAt: string,   // ISO — ngày cần ôn tiếp theo
 *   ease: "again"|"hard"|"good"|"easy"|null,
 *   status: "active"|"mastered",
 * }
 *
 * Interval mapping (simple, không phải SM-2):
 *   again → +0 ngày (ngay hôm nay / hôm sau)
 *   hard  → +1 ngày
 *   good  → +3 ngày
 *   easy  → +7 ngày
 *   level >= 5 (auto-mastered sau nhiều lần easy/good)
 */

import {
  capNhatReviewResult,
  capNhatReviewResultTheoCard,
  dongBoReviews,
  layReviews,
  layReviewsDenHan,
  xoaReview,
  xoaReviewTheoCard,
} from "../services/reviewApi";

const KHO_SRS = "streak_drop_srs_v1";

// ── Intervals theo level (ngày) ──────────────────────────────────────────────
// Wrong (ease=again/hard):
//   again → 4 giờ, hard → 1 ngày
// Correct (ease=good/easy) — tính theo current level SAU khi tăng:
//   level 0→1 correct  : +1 ngày
//   level 1→2 correct  : +3 ngày
//   level 2→3 correct  : +7 ngày
//   level 3→4 correct  : +14 ngày
//   level 4→5+ mastered: +30 ngày

const INTERVAL_AGAIN_HOURS = 4;
const MASTERED_THRESHOLD = 5;

// Interval theo level MỚI sau khi đúng
function intervalTheoLevel(newLevel) {
  if (newLevel <= 1) return 1;
  if (newLevel === 2) return 3;
  if (newLevel === 3) return 7;
  if (newLevel === 4) return 14;
  return 30; // mastered
}

// ── Private helpers ──────────────────────────────────────────────────────────

function docTatCa() {
  try {
    const raw = localStorage.getItem(KHO_SRS);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function ghiTatCa(data) {
  try {
    localStorage.setItem(KHO_SRS, JSON.stringify(data));
  } catch {
    // localStorage full — bỏ qua
  }
}

function toDateValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function chuanHoaSRSTuBackend(item) {
  const localId = item.card_id ? String(item.card_id) : `review-${item.id}`;

  return {
    id: localId,
    backendId: item.id,
    deckId: item.deck_id ?? null,
    deckTitle: item.deck_title ?? "",
    word: item.term_en ?? "",
    meaning: item.meaning_vi ?? "",
    example: item.example_sentence ?? null,
    source: item.source ?? "quiz",
    level: item.level ?? 0,
    reviewCount: item.review_count ?? 0,
    lastReviewedAt: item.last_reviewed_at ?? null,
    nextReviewAt: item.next_review_at ?? new Date().toISOString(),
    ease: item.ease ?? null,
    status: item.status ?? "active",
    updatedAt: item.updated_at ?? item.last_reviewed_at ?? new Date().toISOString(),
  };
}

function chuanHoaSRSChoBackend(entry) {
  const cardId = Number(entry.id);

  return {
    card_id: Number.isFinite(cardId) && cardId > 0 ? cardId : undefined,
    deck_id: entry.deckId ?? undefined,
    term_en: entry.word ?? "",
    meaning_vi: entry.meaning ?? "",
    example_sentence: entry.example ?? null,
    source: entry.source ?? "quiz",
    level: entry.level ?? 0,
    ease: entry.ease ?? null,
    review_count: entry.reviewCount ?? 0,
    last_reviewed_at: entry.lastReviewedAt ?? undefined,
    next_review_at: entry.nextReviewAt ?? undefined,
    status: entry.status ?? "active",
  };
}

function hopNhatEntry(localEntry, incomingEntry) {
  if (!localEntry) return incomingEntry;

  const dungIncoming =
    toDateValue(incomingEntry.updatedAt || incomingEntry.lastReviewedAt) >=
    toDateValue(localEntry.updatedAt || localEntry.lastReviewedAt);

  return {
    ...localEntry,
    ...(dungIncoming ? incomingEntry : {}),
    backendId: incomingEntry.backendId ?? localEntry.backendId,
    level: Math.max(localEntry.level ?? 0, incomingEntry.level ?? 0),
    reviewCount: Math.max(localEntry.reviewCount ?? 0, incomingEntry.reviewCount ?? 0),
    updatedAt:
      toDateValue(incomingEntry.updatedAt) >= toDateValue(localEntry.updatedAt)
        ? incomingEntry.updatedAt
        : localEntry.updatedAt,
  };
}

export function hopNhatSRSTuBackend(items = []) {
  const tatCa = docTatCa();

  for (const item of items) {
    const incoming = chuanHoaSRSTuBackend(item);
    tatCa[incoming.id] = hopNhatEntry(tatCa[incoming.id], incoming);
  }

  ghiTatCa(tatCa);
  return layTatCaSRS();
}

/**
 * Tính ngày ôn tiếp theo từ ease rating (dùng trong Daily Review).
 */
function tinhNgayOnTiep(ease) {
  const now = new Date();
  if (ease === "again") {
    return new Date(now.getTime() + INTERVAL_AGAIN_HOURS * 60 * 60 * 1000).toISOString();
  }
  const days =
    ease === "hard" ? 1 :
    ease === "good" ? 3 :
    ease === "easy" ? 7 :
    3;
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Tính ngày ôn tiếp theo theo level mới (dùng cho correct answers từ quiz).
 */
function tinhNgayOnTheoLevel(newLevel) {
  const d = new Date();
  d.setDate(d.getDate() + intervalTheoLevel(newLevel));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Kiểm tra card có đến hạn ôn hôm nay không.
 */
function laDenHanHomNay(entry) {
  if (!entry.nextReviewAt) return true;
  return new Date(entry.nextReviewAt) <= new Date();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Thêm hoặc cập nhật card vào SRS queue.
 * Nếu đã tồn tại → không ghi đè nextReviewAt.
 * Nếu chưa có → tạo với nextReviewAt = hôm nay (due ngay).
 *
 * @param {Object[]} cards - mảng card objects
 * @param {Object} opts - { deckId, deckTitle, source }
 */
export function themVaoSRS(cards, { deckId, deckTitle, source = "mistake" }) {
  if (!Array.isArray(cards) || cards.length === 0) return;

  const tatCa = docTatCa();
  const now = new Date().toISOString();

  for (const card of cards) {
    const key = String(card.id);
    const cu = tatCa[key];

    if (!cu) {
      // Mới: tạo entry, due ngay hôm nay
      tatCa[key] = {
        id: key,
        deckId: Number(deckId),
        deckTitle: deckTitle ?? "",
        word: card.term_en ?? card.word ?? "",
        meaning: card.meaning_vi ?? card.meaning ?? "",
        example: card.example_sentence ?? card.example ?? null,
        source: source,
        level: 0,
        reviewCount: 0,
        lastReviewedAt: null,
        nextReviewAt: now, // due ngay lập tức
        ease: null,
        status: "active",
        updatedAt: now,
      };
    } else {
      // Đã có: chỉ cập nhật content, giữ nguyên nextReviewAt
      tatCa[key] = {
        ...cu,
        word: card.term_en ?? card.word ?? cu.word,
        meaning: card.meaning_vi ?? card.meaning ?? cu.meaning,
        example: card.example_sentence ?? card.example ?? cu.example,
        deckTitle: deckTitle ?? cu.deckTitle,
        updatedAt: now,
      };
    }
  }

  ghiTatCa(tatCa);
}

export async function themVaoSRSDongBo(cards, opts) {
  themVaoSRS(cards, opts);

  try {
    const tatCa = docTatCa();
    const items = cards
      .map((card) => tatCa[String(card.id)])
      .filter(Boolean)
      .map(chuanHoaSRSChoBackend);
    const result = await dongBoReviews(items);
    hopNhatSRSTuBackend(result.reviews || []);
  } catch {
    // Local SRS vẫn đã được cập nhật.
  }
}

/**
 * Lấy tất cả SRS entries dưới dạng mảng, sắp xếp theo nextReviewAt.
 */
export function layTatCaSRS() {
  const tatCa = docTatCa();
  return Object.values(tatCa).sort(
    (a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt)
  );
}

/**
 * Lấy các card đến hạn ôn hôm nay.
 */
export function layCardsDenHan() {
  return layTatCaSRS().filter(
    (e) => e.status === "active" && laDenHanHomNay(e)
  );
}

/**
 * Lấy card theo deck.
 */
export function layCardsDenHanTheoDeck(deckId) {
  return layCardsDenHan().filter(
    (e) => String(e.deckId) === String(deckId)
  );
}

/**
 * Cập nhật kết quả ôn tập cho một card.
 * Tăng level, tính nextReviewAt mới, cập nhật status nếu mastered.
 *
 * @param {string} id - card id
 * @param {"again"|"hard"|"good"|"easy"} ease
 * @returns {Object|null} entry đã cập nhật
 */
export function capNhatKetQuaOn(id, ease) {
  const tatCa = docTatCa();
  const key = String(id);
  const cu = tatCa[key];
  if (!cu) return null;

  const levelChange = ease === "easy" ? 2 : ease === "good" ? 1 : ease === "hard" ? 0 : -1;
  const newLevel = Math.max(0, Math.min(5, (cu.level ?? 0) + levelChange));
  const isMastered = newLevel >= MASTERED_THRESHOLD;

  const updated = {
    ...cu,
    level: newLevel,
    ease,
    reviewCount: (cu.reviewCount ?? 0) + 1,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: tinhNgayOnTiep(ease),
    status: isMastered ? "mastered" : "active",
    updatedAt: new Date().toISOString(),
  };

  tatCa[key] = updated;
  ghiTatCa(tatCa);
  return updated;
}

export async function capNhatKetQuaOnDongBo(id, ease) {
  const updatedLocal = capNhatKetQuaOn(id, ease);
  if (!updatedLocal) return null;

  try {
    const backendResult = updatedLocal.backendId
      ? await capNhatReviewResult(updatedLocal.backendId, ease)
      : await capNhatReviewResultTheoCard(id, ease);
    hopNhatSRSTuBackend([backendResult]);
  } catch {
    // Backend best-effort. Local state đã được cập nhật.
  }

  return updatedLocal;
}

/**
 * Xoá một entry khỏi SRS queue.
 */
export function xoaKhoiSRS(id) {
  const tatCa = docTatCa();
  delete tatCa[String(id)];
  ghiTatCa(tatCa);
}

export async function xoaKhoiSRSDongBo(id) {
  const entry = docTatCa()[String(id)];
  xoaKhoiSRS(id);

  try {
    if (entry?.backendId) {
      await xoaReview(entry.backendId);
      return;
    }

    const cardId = Number(id);
    if (Number.isInteger(cardId) && cardId > 0) {
      await xoaReviewTheoCard(cardId);
    }
  } catch {
    // Local removal remains available while offline. A later explicit sync may
    // restore the server item, which is safer than claiming a remote delete.
  }
}

/**
 * Đặt lại một card về active (un-master).
 */
export function datLaiSRS(id) {
  const tatCa = docTatCa();
  const key = String(id);
  if (!tatCa[key]) return;
  tatCa[key] = {
    ...tatCa[key],
    status: "active",
    level: Math.max(0, (tatCa[key].level ?? 0) - 1),
    nextReviewAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ghiTatCa(tatCa);
}

/**
 * Thống kê SRS queue.
 * @returns {{ total, duHomNay, active, mastered, khoHoc }}
 */
export function layThongKeSRS() {
  const ds = layTatCaSRS();
  const duHomNay = ds.filter((e) => e.status === "active" && laDenHanHomNay(e)).length;
  const active = ds.filter((e) => e.status === "active").length;
  const mastered = ds.filter((e) => e.status === "mastered").length;
  // khoHoc = active nhưng chưa đến hạn hôm nay
  const khoHoc = active - duHomNay;
  return { total: ds.length, duHomNay, active, mastered, khoHoc };
}

/**
 * Ghi nhận kết quả TRẢ LỜI ĐÚNG từ quiz/written vào SRS.
 *
 * Logic:
 * - Card chưa có trong SRS: tạo mới với level=1, nextReview = +1 ngày
 * - Card đã có trong SRS: tăng level +1, tính nextReview theo level mới
 * - Level >= MASTERED_THRESHOLD → status = "mastered", interval = 30 ngày
 * - Không ghi đè nextReviewAt nếu card đã được mastered (tránh giảm interval)
 *
 * @param {Object[]} cards - mảng card đúng (danhSachCardDung)
 * @param {Object} opts - { deckId, deckTitle, source }
 */
export function ghiNhanDungVaoSRS(cards, { deckId, deckTitle, source = "quiz" }) {
  if (!Array.isArray(cards) || cards.length === 0) return;

  const tatCa = docTatCa();
  const now = new Date().toISOString();

  for (const card of cards) {
    const key = String(card.id);
    const cu = tatCa[key];

    if (!cu) {
      // Card chưa có trong SRS → tạo mới ở level 1
      const newLevel = 1;
      tatCa[key] = {
        id: key,
        deckId: Number(deckId),
        deckTitle: deckTitle ?? "",
        word: card.term_en ?? card.word ?? "",
        meaning: card.meaning_vi ?? card.meaning ?? "",
        example: card.example_sentence ?? card.example ?? null,
        source,
        level: newLevel,
        reviewCount: 1,
        lastReviewedAt: now,
        nextReviewAt: tinhNgayOnTheoLevel(newLevel),
        ease: "good",
        status: "active",
        updatedAt: now,
      };
    } else {
      // Đã có → tăng level, không giảm xuống dưới hiện tại
      const currentLevel = cu.level ?? 0;
      const newLevel = Math.min(MASTERED_THRESHOLD, currentLevel + 1);
      const isMastered = newLevel >= MASTERED_THRESHOLD;

      // Nếu đã mastered thì không đẩy nextReviewAt gần hơn
      const newNextReview = isMastered || newLevel > currentLevel
        ? tinhNgayOnTheoLevel(newLevel)
        : cu.nextReviewAt;

      tatCa[key] = {
        ...cu,
        // Cập nhật content nếu thay đổi
        word: card.term_en ?? card.word ?? cu.word,
        meaning: card.meaning_vi ?? card.meaning ?? cu.meaning,
        example: card.example_sentence ?? card.example ?? cu.example,
        deckTitle: deckTitle ?? cu.deckTitle,
        level: newLevel,
        reviewCount: (cu.reviewCount ?? 0) + 1,
        lastReviewedAt: now,
        nextReviewAt: newNextReview,
        ease: "good",
        status: isMastered ? "mastered" : "active",
        updatedAt: now,
      };
    }
  }

  ghiTatCa(tatCa);
}

export async function ghiNhanDungVaoSRSDongBo(cards, opts) {
  ghiNhanDungVaoSRS(cards, opts);

  try {
    const tatCa = docTatCa();
    const items = cards
      .map((card) => tatCa[String(card.id)])
      .filter(Boolean)
      .map(chuanHoaSRSChoBackend);
    const result = await dongBoReviews(items);
    hopNhatSRSTuBackend(result.reviews || []);
  } catch {
    // Local SRS vẫn đã được cập nhật.
  }
}

/**
 * Ghi nhận kết quả TRẢ LỜI SAI vào SRS (reset level, due sớm).
 * Dùng thay cho themVaoSRS khi muốn explicit "wrong".
 *
 * @param {Object[]} cards - mảng card sai
 * @param {Object} opts - { deckId, deckTitle, source }
 */
export function ghiNhanSaiVaoSRS(cards, { deckId, deckTitle, source = "quiz" }) {
  // Reuse themVaoSRS — đã set due = now với level giữ nguyên
  themVaoSRS(cards, { deckId, deckTitle, source });
}

export async function ghiNhanSaiVaoSRSDongBo(cards, opts) {
  await themVaoSRSDongBo(cards, opts);
}

export async function taiSRSDongBo(params = {}) {
  try {
    const items = await layReviews(params);
    return hopNhatSRSTuBackend(items);
  } catch {
    return layTatCaSRS();
  }
}

export async function taiCardsDenHanDongBo(params = {}) {
  try {
    const items = await layReviewsDenHan(params);
    return hopNhatSRSTuBackend(items).filter(
      (entry) => entry.status === "active" && laDenHanHomNay(entry)
    );
  } catch {
    return layCardsDenHan();
  }
}

export async function dongBoSRSLenBackend() {
  const items = layTatCaSRS().map(chuanHoaSRSChoBackend);
  if (items.length === 0) return layTatCaSRS();

  try {
    const result = await dongBoReviews(items);
    return hopNhatSRSTuBackend(result.reviews || []);
  } catch {
    return layTatCaSRS();
  }
}
