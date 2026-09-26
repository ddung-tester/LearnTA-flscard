/**
 * srsReview.js — Bản SRS phía client (localStorage), đồng bộ với backend.
 *
 * Một luật SRS duy nhất cho mọi chế độ học (giống backend/src/utils/srs.js):
 *   Đúng → lên 1 cấp, ôn lại sau khoảng của cấp mới.
 *   Sai  → xuống 1 cấp (tối thiểu Lv0), ôn lại ngay.
 *   Tự chọn cấp (sau khi lật thẻ) → ôn lại sau khoảng của cấp đó.
 *   Khoảng ôn: Lv0 ngay · Lv1 1 ngày · Lv2 3 ngày · Lv3 7 ngày · Lv4 14 ngày · Lv5 30 ngày.
 *
 * Khi đã đăng nhập, backend (card_progress) là nguồn đúng: dữ liệu tải về luôn
 * ghi đè bản local. Bản local để hiển thị ngay và giữ tiến độ khi chưa đăng nhập.
 *
 * Cấu trúc mỗi entry:
 * {
 *   id: string,             // card.id (key)
 *   deckId: number,
 *   deckTitle: string,
 *   word: string,           // card.term_en
 *   meaning: string,        // card.meaning_vi
 *   example: string|null,   // card.example_sentence
 *   source: string,         // nơi từ vào SRS lần đầu (chỉ có ở bản local)
 *   level: number,          // 0–5
 *   reviewCount: number,
 *   lastReviewedAt: string|null,
 *   nextReviewAt: string,   // ISO — lúc cần ôn tiếp theo
 *   status: "active"|"mastered", // mastered = Lv5, vẫn quay lại khi đến hạn
 *   updatedAt: string,
 * }
 */

import {
  capNhatReviewResultTheoCard,
  dongBoReviews,
  layReviews,
  layReviewsDenHan,
  xoaReviewTheoCard,
} from "../services/reviewApi";

const KHO_SRS = "streak_drop_srs_v1";
const MAX_LEVEL = 5;

export const KHOANG_ON_NGAY = [0, 1, 3, 7, 14, 30];

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

function chuanHoaLevel(level) {
  const so = Math.trunc(Number(level));
  if (!Number.isFinite(so)) return 0;
  return Math.min(MAX_LEVEL, Math.max(0, so));
}

function trangThaiTheoLevel(level) {
  return level >= MAX_LEVEL ? "mastered" : "active";
}

/**
 * Lv0 đến hạn ngay; Lv≥1 đến hạn lúc 00:00 của ngày thứ N.
 */
function tinhNgayOnTheoLevel(level) {
  const soNgay = KHOANG_ON_NGAY[chuanHoaLevel(level)];
  const d = new Date();
  if (soNgay === 0) return d.toISOString();
  d.setDate(d.getDate() + soNgay);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * @param {number} levelHienTai
 * @param {"correct"|"wrong"|number} ketQua - đúng/sai, hoặc level người học tự chọn
 */
function apDungKetQua(levelHienTai, ketQua) {
  const level = chuanHoaLevel(levelHienTai);

  if (typeof ketQua === "number") {
    const levelMoi = chuanHoaLevel(ketQua);
    return { level: levelMoi, nextReviewAt: tinhNgayOnTheoLevel(levelMoi) };
  }

  if (ketQua === "wrong") {
    return { level: Math.max(0, level - 1), nextReviewAt: new Date().toISOString() };
  }

  const levelMoi = Math.min(MAX_LEVEL, level + 1);
  return { level: levelMoi, nextReviewAt: tinhNgayOnTheoLevel(levelMoi) };
}

function chuanHoaSRSTuBackend(item) {
  const level = chuanHoaLevel(item.level);

  return {
    id: String(item.card_id),
    deckId: item.deck_id ?? null,
    deckTitle: item.deck_title ?? "",
    word: item.term_en ?? "",
    meaning: item.meaning_vi ?? "",
    example: item.example_sentence ?? null,
    level,
    reviewCount: item.review_count ?? 0,
    lastReviewedAt: item.last_reviewed_at ?? null,
    nextReviewAt: item.next_review_at ?? new Date().toISOString(),
    status: trangThaiTheoLevel(level),
    updatedAt: item.updated_at ?? item.last_reviewed_at ?? new Date().toISOString(),
  };
}

function chuanHoaSRSChoBackend(entry) {
  return {
    card_id: Number(entry.id),
    level: entry.level ?? 0,
    review_count: entry.reviewCount ?? 0,
    last_reviewed_at: entry.lastReviewedAt ?? undefined,
    next_review_at: entry.nextReviewAt ?? undefined,
  };
}

function laCardIdHopLe(id) {
  const cardId = Number(id);
  return Number.isInteger(cardId) && cardId > 0;
}

/**
 * Backend là nguồn đúng: ghi đè bản local, chỉ giữ trường backend không có (source).
 */
export function hopNhatSRSTuBackend(items = []) {
  const tatCa = docTatCa();

  for (const item of items) {
    const incoming = chuanHoaSRSTuBackend(item);
    tatCa[incoming.id] = { ...tatCa[incoming.id], ...incoming };
  }

  ghiTatCa(tatCa);
  return layTatCaSRS();
}

/**
 * Kiểm tra card có đến hạn ôn không (kể cả Lv5).
 */
function laDenHanHomNay(entry) {
  if (!entry.nextReviewAt) return true;
  return new Date(entry.nextReviewAt) <= new Date();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function moTaKhoangOn(level) {
  const soNgay = KHOANG_ON_NGAY[chuanHoaLevel(level)];
  return soNgay === 0 ? "Ôn ngay" : `${soNgay} ngày`;
}

/**
 * Thêm card vào SRS queue nếu chưa có (Lv0, đến hạn ngay).
 * Nếu đã có → chỉ cập nhật nội dung, giữ nguyên level và nextReviewAt.
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
        status: "active",
        updatedAt: now,
      };
    } else {
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
 * Lấy các card đến hạn ôn.
 */
export function layCardsDenHan() {
  return layTatCaSRS().filter(laDenHanHomNay);
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
 * Áp dụng một kết quả ôn cho card đã có trong SRS (chỉ local).
 *
 * @param {string|number} id - card id
 * @param {"correct"|"wrong"|number} ketQua - đúng/sai, hoặc level tự chọn (0–5)
 * @returns {Object|null} entry đã cập nhật
 */
export function capNhatKetQuaOn(id, ketQua) {
  const tatCa = docTatCa();
  const key = String(id);
  const cu = tatCa[key];
  if (!cu) return null;

  const now = new Date().toISOString();
  const tiepTheo = apDungKetQua(cu.level ?? 0, ketQua);
  const updated = {
    ...cu,
    level: tiepTheo.level,
    reviewCount: (cu.reviewCount ?? 0) + 1,
    lastReviewedAt: now,
    nextReviewAt: tiepTheo.nextReviewAt,
    status: trangThaiTheoLevel(tiepTheo.level),
    updatedAt: now,
  };

  tatCa[key] = updated;
  ghiTatCa(tatCa);
  return updated;
}

/**
 * Áp dụng kết quả local rồi gửi lên backend; bản backend trả về sẽ ghi đè local.
 */
export async function capNhatKetQuaOnDongBo(id, ketQua) {
  const updatedLocal = capNhatKetQuaOn(id, ketQua);
  if (!updatedLocal || !laCardIdHopLe(id)) return updatedLocal;

  try {
    const payload = typeof ketQua === "number" ? { level: ketQua } : { result: ketQua };
    const backendResult = await capNhatReviewResultTheoCard(Number(id), payload);
    if (backendResult) {
      return (
        hopNhatSRSTuBackend([backendResult]).find((entry) => entry.id === String(id)) ??
        updatedLocal
      );
    }
  } catch {
    // Backend best-effort (vd: chưa đăng nhập). Local state đã được cập nhật.
  }

  return updatedLocal;
}

/**
 * Ghi kết quả một thẻ ở chế độ không tự lưu đáp án lên server (vd: flashcard).
 */
export async function ghiNhanKetQuaDongBo(card, ketQua, opts) {
  themVaoSRS([card], opts);
  return capNhatKetQuaOnDongBo(card.id, ketQua);
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
  xoaKhoiSRS(id);

  if (!laCardIdHopLe(id)) return;

  try {
    await xoaReviewTheoCard(Number(id));
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
  const duHomNay = ds.filter(laDenHanHomNay).length;
  const active = ds.filter((e) => e.status === "active").length;
  const mastered = ds.filter((e) => e.status === "mastered").length;
  // khoHoc = chưa đến hạn ôn
  const khoHoc = ds.length - duHomNay;
  return { total: ds.length, duHomNay, active, mastered, khoHoc };
}

function ghiNhanKetQuaLocal(cards, ketQua, opts) {
  if (!Array.isArray(cards) || cards.length === 0) return;

  themVaoSRS(cards, opts);
  for (const card of cards) {
    capNhatKetQuaOn(card.id, ketQua);
  }
}

/**
 * Ghi nhận các card TRẢ LỜI ĐÚNG vào SRS local (lên 1 cấp).
 * Dùng cho chế độ đã lưu đáp án lên server qua study session (Quiz, Tự luận):
 * server tự áp dụng cùng luật, nên ở đây không gửi thêm để tránh cộng 2 lần.
 *
 * @param {Object[]} cards
 * @param {Object} opts - { deckId, deckTitle, source }
 */
export function ghiNhanDungVaoSRS(cards, opts) {
  ghiNhanKetQuaLocal(cards, "correct", opts);
}

/**
 * Ghi nhận các card TRẢ LỜI SAI vào SRS local (xuống 1 cấp, ôn lại ngay).
 */
export function ghiNhanSaiVaoSRS(cards, opts) {
  ghiNhanKetQuaLocal(cards, "wrong", opts);
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
    return hopNhatSRSTuBackend(items).filter(laDenHanHomNay);
  } catch {
    return layCardsDenHan();
  }
}

/**
 * Đẩy các từ học lúc chưa đăng nhập lên backend. Từ đã có tiến độ trên server
 * được giữ nguyên phía server, rồi ghi đè lại bản local.
 */
export async function dongBoSRSLenBackend() {
  const items = layTatCaSRS()
    .filter((entry) => laCardIdHopLe(entry.id))
    .map(chuanHoaSRSChoBackend);
  if (items.length === 0) return layTatCaSRS();

  try {
    const result = await dongBoReviews(items);
    return hopNhatSRSTuBackend(result.reviews || []);
  } catch {
    return layTatCaSRS();
  }
}
