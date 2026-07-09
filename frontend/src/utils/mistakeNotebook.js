/**
 * mistakeNotebook.js — localStorage-based Mistake Notebook utility.
 *
 * Lưu trữ từ sai từ các phiên Quiz và Tự luận.
 * Mỗi entry là một "từ sai" với đếm số lần sai, ngày sai gần nhất, v.v.
 *
 * Cấu trúc mỗi entry:
 * {
 *   id: string,           // card.id (dùng làm key)
 *   deckId: number,
 *   deckTitle: string,
 *   word: string,         // card.term_en
 *   meaning: string,      // card.meaning_vi
 *   example: string|null, // card.example_sentence
 *   mistakeCount: number, // tổng số lần sai (tăng khi sai thêm)
 *   lastWrongAt: string,  // ISO date của lần sai gần nhất
 *   lastReviewedAt: string|null, // ISO date của lần đánh dấu reviewed gần nhất
 *   source: "quiz"|"tuluan",
 *   status: "active"|"reviewed",
 * }
 */

import {
  capNhatMistake,
  dongBoMistakes,
  layMistakes,
  xoaMistake,
  xoaMistakes,
} from "../services/mistakeApi";
import { themVaoSRS } from "./srsReview";

const KHO_TU_SAI = "streak_drop_mistake_notebook_v1";

// ── Private helpers ──────────────────────────────────────────────────────────

function docTatCa() {
  try {
    const raw = localStorage.getItem(KHO_TU_SAI);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function ghiTatCa(data) {
  try {
    localStorage.setItem(KHO_TU_SAI, JSON.stringify(data));
  } catch {
    // localStorage full hoặc bị chặn — bỏ qua
  }
}

function toDateValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function chonNgayMoiHon(a, b) {
  return toDateValue(a) >= toDateValue(b) ? a : b;
}

function chuanHoaTuSaiTuBackend(item) {
  const localId = item.card_id ? String(item.card_id) : `mistake-${item.id}`;

  return {
    id: localId,
    backendId: item.id,
    deckId: item.deck_id ?? null,
    deckTitle: item.deck_title ?? "",
    word: item.term_en ?? "",
    meaning: item.meaning_vi ?? "",
    example: item.example_sentence ?? null,
    mistakeCount: item.mistake_count ?? 1,
    lastWrongAt: item.last_wrong_at ?? item.updated_at ?? new Date().toISOString(),
    lastReviewedAt: item.last_reviewed_at ?? null,
    source: item.source ?? "quiz",
    status: item.status ?? "active",
    updatedAt: item.updated_at ?? item.last_wrong_at ?? new Date().toISOString(),
  };
}

function chuanHoaTuSaiChoBackend(entry) {
  const cardId = Number(entry.id);

  return {
    card_id: Number.isFinite(cardId) && cardId > 0 ? cardId : undefined,
    deck_id: entry.deckId ?? undefined,
    term_en: entry.word ?? "",
    meaning_vi: entry.meaning ?? "",
    example_sentence: entry.example ?? null,
    source: entry.source ?? "quiz",
    mistake_count: entry.mistakeCount ?? 1,
    status: entry.status ?? "active",
    last_wrong_at: entry.lastWrongAt ?? undefined,
    last_reviewed_at: entry.lastReviewedAt ?? undefined,
  };
}

function hopNhatEntry(localEntry, incomingEntry) {
  if (!localEntry) return incomingEntry;

  const dungIncoming = toDateValue(incomingEntry.updatedAt) >= toDateValue(localEntry.updatedAt);

  return {
    ...localEntry,
    ...(dungIncoming ? incomingEntry : {}),
    backendId: incomingEntry.backendId ?? localEntry.backendId,
    mistakeCount: Math.max(localEntry.mistakeCount ?? 0, incomingEntry.mistakeCount ?? 0),
    lastWrongAt: chonNgayMoiHon(localEntry.lastWrongAt, incomingEntry.lastWrongAt),
    lastReviewedAt: chonNgayMoiHon(localEntry.lastReviewedAt, incomingEntry.lastReviewedAt),
    updatedAt: chonNgayMoiHon(localEntry.updatedAt, incomingEntry.updatedAt),
  };
}

export function hopNhatTuSaiTuBackend(items = []) {
  const tatCa = docTatCa();

  for (const item of items) {
    const incoming = chuanHoaTuSaiTuBackend(item);
    tatCa[incoming.id] = hopNhatEntry(tatCa[incoming.id], incoming);
  }

  ghiTatCa(tatCa);
  return layTatCaTuSai();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Lưu một danh sách card sai vào Mistake Notebook.
 * Nếu card đã tồn tại → tăng mistakeCount, cập nhật lastWrongAt.
 * Nếu chưa tồn tại → tạo mới.
 *
 * @param {Object[]} cards - danhSachCardSai từ StudyResult
 * @param {Object} opts - { deckId, deckTitle, source }
 */
export function luuTuSai(cards, { deckId, deckTitle, source }) {
  if (!Array.isArray(cards) || cards.length === 0) return;

  const tatCa = docTatCa();
  const now = new Date().toISOString();

  for (const card of cards) {
    const key = String(card.id);
    const cu = tatCa[key];

    if (cu) {
      // Đã có: tăng số lần sai, cập nhật ngày, reset status về active
      tatCa[key] = {
        ...cu,
        mistakeCount: (cu.mistakeCount ?? 0) + 1,
        lastWrongAt: now,
        status: "active",
        // Cập nhật content nếu card đã thay đổi
        word: card.term_en ?? cu.word,
        meaning: card.meaning_vi ?? cu.meaning,
        example: card.example_sentence ?? cu.example,
        deckTitle: deckTitle ?? cu.deckTitle,
        updatedAt: now,
      };
    } else {
      // Mới: tạo entry
      tatCa[key] = {
        id: key,
        deckId: Number(deckId),
        deckTitle: deckTitle ?? "",
        word: card.term_en ?? "",
        meaning: card.meaning_vi ?? "",
        example: card.example_sentence ?? null,
        mistakeCount: 1,
        lastWrongAt: now,
        lastReviewedAt: null,
        source: source ?? "quiz",
        status: "active",
        updatedAt: now,
      };
    }
  }

  ghiTatCa(tatCa);

  // Đồng thời queue từ sai vào SRS để ôn tập hàng ngày
  themVaoSRS(cards, { deckId, deckTitle, source });
}

export async function luuTuSaiDongBo(cards, opts) {
  luuTuSai(cards, opts);

  try {
    const tatCa = docTatCa();
    const items = cards
      .map((card) => tatCa[String(card.id)])
      .filter(Boolean)
      .map(chuanHoaTuSaiChoBackend);
    const result = await dongBoMistakes(items);
    hopNhatTuSaiTuBackend(result.mistakes || []);
  } catch {
    // Backend sync la best-effort. localStorage van la cache/fallback chinh.
  }
}

/**
 * Lấy tất cả từ sai dưới dạng mảng, sắp xếp theo lastWrongAt mới nhất.
 * @returns {Object[]}
 */
export function layTatCaTuSai() {
  const tatCa = docTatCa();
  return Object.values(tatCa).sort(
    (a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt)
  );
}

/**
 * Lấy từ sai của một deck cụ thể.
 * @param {number|string} deckId
 * @returns {Object[]}
 */
export function layTuSaiTheoDeck(deckId) {
  return layTatCaTuSai().filter((e) => String(e.deckId) === String(deckId));
}

/**
 * Đánh dấu một từ sai là "đã ôn" (reviewed).
 * @param {string} id - card id
 */
export function danhDauDaOn(id) {
  const tatCa = docTatCa();
  const key = String(id);
  if (!tatCa[key]) return;
  tatCa[key] = {
    ...tatCa[key],
    status: "reviewed",
    lastReviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ghiTatCa(tatCa);
}

export async function danhDauDaOnDongBo(id) {
  const tatCa = docTatCa();
  const entry = tatCa[String(id)];
  danhDauDaOn(id);

  if (!entry?.backendId) return;

  try {
    const updated = await capNhatMistake(entry.backendId, { status: "reviewed" });
    hopNhatTuSaiTuBackend([updated]);
  } catch {
    // Local update da thanh cong.
  }
}

/**
 * Xoá một từ sai khỏi notebook.
 * @param {string} id - card id
 */
export function xoaTuSai(id) {
  const tatCa = docTatCa();
  delete tatCa[String(id)];
  ghiTatCa(tatCa);
}

export async function xoaTuSaiDongBo(id) {
  const tatCa = docTatCa();
  const entry = tatCa[String(id)];
  xoaTuSai(id);

  if (!entry?.backendId) return;

  try {
    await xoaMistake(entry.backendId);
  } catch {
    // Local delete van duoc giu. Lan sync sau se khong xoa backend de tranh destructive sync.
  }
}

/**
 * Xoá tất cả từ sai của một deck.
 * @param {number|string} deckId
 */
export function xoaTuSaiTheoDeck(deckId) {
  const tatCa = docTatCa();
  for (const key of Object.keys(tatCa)) {
    if (String(tatCa[key].deckId) === String(deckId)) {
      delete tatCa[key];
    }
  }
  ghiTatCa(tatCa);
}

/**
 * Xoá tất cả từ sai (reset toàn bộ notebook).
 */
export function xoaTatCaTuSai() {
  try {
    localStorage.removeItem(KHO_TU_SAI);
  } catch {
    //
  }
}

export async function xoaTatCaTuSaiDongBo(params = {}) {
  xoaTatCaTuSai();

  try {
    await xoaMistakes(params);
  } catch {
    // Local clear da thanh cong.
  }
}

/**
 * Lấy thống kê tổng hợp.
 * @returns {{ total: number, active: number, reviewed: number, hardest: Object|null }}
 */
export function layThongKeTuSai() {
  const ds = layTatCaTuSai();
  const active = ds.filter((e) => e.status === "active").length;
  const reviewed = ds.filter((e) => e.status === "reviewed").length;
  const hardest = ds.reduce(
    (max, e) => (e.mistakeCount > (max?.mistakeCount ?? 0) ? e : max),
    null
  );
  return { total: ds.length, active, reviewed, hardest };
}

export async function taiTuSaiDongBo(params = {}) {
  try {
    const items = await layMistakes(params);
    return hopNhatTuSaiTuBackend(items);
  } catch {
    return layTatCaTuSai();
  }
}

export async function dongBoTuSaiLenBackend() {
  const items = layTatCaTuSai().map(chuanHoaTuSaiChoBackend);
  if (items.length === 0) return layTatCaTuSai();

  try {
    const result = await dongBoMistakes(items);
    return hopNhatTuSaiTuBackend(result.mistakes || []);
  } catch {
    return layTatCaTuSai();
  }
}
