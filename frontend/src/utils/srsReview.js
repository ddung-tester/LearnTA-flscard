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
  layReviewsDenHan,
  layReviewsKemMoc,
  xoaReviewTheoCard,
} from "../services/reviewApi";
import { khoaKhoHocTap, layPhienKhoHocTap, laPhienKhoHienTai } from "./khoHocTap";
import { taoKhoTrenMay } from "./khoTrenMay";
import { layStudySessionsLocal } from "./studySessionHistory";

const KHO_SRS = "streak_drop_srs_v1";
const MAX_LEVEL = 5;

export const KHOANG_ON_NGAY = [0, 1, 3, 7, 14, 30];

// ── Private helpers ──────────────────────────────────────────────────────────

// Đọc từ bộ nhớ, ghi xuống localStorage lúc rảnh (utils/khoTrenMay.js)
const khoSRS = taoKhoTrenMay(KHO_SRS);
const docTatCa = khoSRS.doc;

/** Ghi ngay phần đang chờ xuống localStorage (rời trang, ẩn tab, test). */
export const ghiNgayKhoSRS = khoSRS.ghiNgay;

// Phát mỗi lần bản SRS local đổi, để badge "Ôn tập" trên menu cập nhật ngay
export const SU_KIEN_SRS_DOI = "srs-thay-doi";

function ghiTatCa(data) {
  khoSRS.ghi(data);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SU_KIEN_SRS_DOI));
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
    exampleTranslation: item.example_translation ?? null,
    level,
    reviewCount: item.review_count ?? 0,
    lastReviewedAt: item.last_reviewed_at ?? null,
    nextReviewAt: item.next_review_at ?? new Date().toISOString(),
    status: trangThaiTheoLevel(level),
    updatedAt: item.updated_at ?? item.last_reviewed_at ?? new Date().toISOString(),
    // Đã có tiến độ trên server: không cần đẩy lên lại (dongBoSRSLenBackend)
    trenServer: true,
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
 * Level hiện tại trong SRS local của từng card (null nếu card chưa vào SRS).
 */
export function layLevelSRS(ids) {
  const tatCa = docTatCa();
  return Object.fromEntries(
    ids.map((id) => [String(id), tatCa[String(id)]?.level ?? null])
  );
}

/**
 * Level sau khi áp dụng một kết quả, theo đúng luật SRS (không ghi gì).
 */
export function levelSauKetQua(level, ketQua) {
  return apDungKetQua(level ?? 0, ketQua).level;
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
        exampleTranslation: card.example_translation ?? card.exampleTranslation ?? null,
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
        exampleTranslation: card.example_translation !== undefined ? card.example_translation
          : card.exampleTranslation !== undefined ? card.exampleTranslation
          : (card.example_sentence ?? card.example ?? cu.example) === cu.example ? cu.exampleTranslation : null,
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
  // Đổi ngày giờ ra số một lần cho mỗi mục rồi mới sắp xếp (không tạo Date trong hàm so sánh — ~30.000 lần với 1.400 từ)
  return Object.values(docTatCa())
    .map((entry) => [new Date(entry.nextReviewAt).getTime(), entry])
    .sort((a, b) => a[0] - b[0])
    .map(([, entry]) => entry);
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
  const phienKho = layPhienKhoHocTap();
  const updatedLocal = capNhatKetQuaOn(id, ketQua);
  if (!updatedLocal || !laCardIdHopLe(id)) return updatedLocal;

  try {
    const payload = typeof ketQua === "number" ? { level: ketQua } : { result: ketQua };
    const backendResult = await capNhatReviewResultTheoCard(Number(id), payload);
    if (!laPhienKhoHienTai(phienKho)) return null;
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
 * Luyện câu đạt (nghe chép ≥ 80%, đặt câu đúng): tính như một lần ôn đúng (+1 level), nhưng chỉ khi
 * từ chưa có lịch ôn hoặc đã đến hạn — luyện thêm lúc chưa đến hạn thì không leo level.
 * @returns {Promise<Object|null>} null nếu chưa đến hạn (không ghi gì)
 */
export async function ghiNhanLuyenCauDat(card, opts) {
  const cu = docTatCa()[String(card.id)];
  if (cu?.nextReviewAt && new Date(cu.nextReviewAt) > new Date()) return null;
  return ghiNhanKetQuaDongBo(card, "correct", opts);
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
  // Badge "Ôn tập" gọi hàm này mỗi lần SRS đổi: đếm một lượt, không cần sắp xếp
  const ds = Object.values(docTatCa());
  const now = Date.now();
  let duHomNay = 0;
  let active = 0;
  let mastered = 0;
  for (const e of ds) {
    if (!e.nextReviewAt || new Date(e.nextReviewAt).getTime() <= now) duHomNay += 1;
    if (e.status === "active") active += 1;
    else if (e.status === "mastered") mastered += 1;
  }
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

const SO_DONG_MOI_TRANG = 200;
// Lượt tải đang chạy theo (loại, tham số, kho): các trang mở cùng lúc (Dashboard, badge menu...) dùng chung
const dangTai = new Map();

// Tải đủ mọi trang. Số trang ước theo kho local (lần trước tải về bao nhiêu) để gọi song song
// một lượt thay vì nối tiếp từng trang — trên 4G mỗi vòng mạng ~150–300 ms. Hụt thì tải tiếp từng trang.
// Một trang lỗi → bỏ cả lượt (không gộp dữ liệu thiếu).
async function taiTatCaTrangReviews(load, params, phienKho, uocLuong = 0) {
  const limit = SO_DONG_MOI_TRANG;
  const items = [];
  let offset = 0;
  let soTrang = Math.max(1, Math.ceil((uocLuong + 1) / limit));
  for (;;) {
    const pages = await Promise.all(
      Array.from({ length: soTrang }, (_, i) => load({ ...params, limit, offset: offset + i * limit }))
    );
    if (!laPhienKhoHienTai(phienKho)) return [];
    for (const page of pages) items.push(...page);
    if (pages[pages.length - 1].length < limit) return items;
    offset += soTrang * limit;
    soTrang = 1;
  }
}

function taiChung(loai, params, phienKho, tai) {
  const khoa = `${loai}|${phienKho}|${JSON.stringify(params)}`;
  if (!dangTai.has(khoa)) {
    dangTai.set(khoa, tai().finally(() => dangTai.delete(khoa)));
  }
  return dangTai.get(khoa);
}

// Mốc đồng bộ cả kho với server: { moc: giờ server lần tải trước, dayDuLuc: lần tải đủ gần nhất (giờ máy) }
const KHO_MOC_SRS = "streak_drop_srs_moc_v1";
// Thỉnh thoảng tải đủ: thẻ bị xoá khỏi lịch ôn ở máy khác không hiện trong phần thay đổi
const TAI_DAY_DU_SAU_MS = 24 * 60 * 60 * 1000;

function docMocDongBo(phienKho) {
  try {
    return JSON.parse(localStorage.getItem(khoaKhoHocTap(KHO_MOC_SRS, phienKho))) || null;
  } catch {
    return null;
  }
}

function ghiMocDongBo(phienKho, giaTri) {
  try {
    localStorage.setItem(khoaKhoHocTap(KHO_MOC_SRS, phienKho), JSON.stringify(giaTri));
  } catch {
    // localStorage bị chặn: lần sau tải đủ như cũ
  }
}

// Đồng bộ cả kho (không lọc theo bộ / level...): chỉ khi đó mốc mới đúng cho cả kho
function laDongBoCaKho(params) {
  return Object.keys(params).every((khoa) => khoa === "limit");
}

// Chỉ hỏi phần thay đổi (?since) khi đồng bộ cả kho, máy đã có kho và lần tải đủ chưa quá 24 giờ
function layMocDungDuoc(params, phienKho) {
  const daLuu = docMocDongBo(phienKho);
  if (!laDongBoCaKho(params) || !daLuu?.moc || Object.keys(docTatCa()).length === 0) return null;
  return Date.now() - daLuu.dayDuLuc < TAI_DAY_DU_SAU_MS ? daLuu : null;
}

async function taiPhanThayDoi(daLuu, params, phienKho) {
  const limit = params.limit || SO_DONG_MOI_TRANG;
  const items = [];
  let mocMoi = null;
  for (let offset = 0; ; offset += limit) {
    const trang = await layReviewsKemMoc({ ...params, limit, offset, since: daLuu.moc });
    if (!laPhienKhoHienTai(phienKho)) return null;
    mocMoi ??= trang.moc;
    items.push(...trang.items);
    if (trang.items.length < limit) return { items, moc: mocMoi };
  }
}

export async function taiSRSDongBo(params = {}) {
  const phienKho = layPhienKhoHocTap();
  return taiChung("tat-ca", params, phienKho, async () => {
    try {
      const daLuu = layMocDungDuoc(params, phienKho);
      if (daLuu) {
        // Thường chỉ vài dòng thay vì cả kho (~1.300 từ ≈ 600 KB JSON, 7 request)
        const thayDoi = await taiPhanThayDoi(daLuu, params, phienKho);
        if (!thayDoi) return [];
        const ketQua = hopNhatSRSTuBackend(thayDoi.items);
        if (thayDoi.moc) ghiMocDongBo(phienKho, { ...daLuu, moc: thayDoi.moc });
        return ketQua;
      }

      const uocLuong = Object.keys(docTatCa()).length;
      // Mốc lấy ở trang đầu (trước khi đọc), các trang sau đọc muộn hơn → không sót thay đổi
      let mocDayDu = null;
      const taiTrang = async (p) => {
        const trang = await layReviewsKemMoc(p);
        if (p.offset === 0) mocDayDu = trang.moc;
        return trang.items;
      };
      const items = await taiTatCaTrangReviews(taiTrang, params, phienKho, uocLuong);
      if (!laPhienKhoHienTai(phienKho)) return [];
      const ketQua = hopNhatSRSTuBackend(items);
      if (laDongBoCaKho(params) && mocDayDu) ghiMocDongBo(phienKho, { moc: mocDayDu, dayDuLuc: Date.now() });
      return ketQua;
    } catch {
      return laPhienKhoHienTai(phienKho) ? layTatCaSRS() : [];
    }
  });
}

export async function taiCardsDenHanDongBo(params = {}) {
  const phienKho = layPhienKhoHocTap();
  return taiChung("den-han", params, phienKho, async () => {
    try {
      const uocLuong = layCardsDenHan().length;
      const items = await taiTatCaTrangReviews(layReviewsDenHan, params, phienKho, uocLuong);
      if (!laPhienKhoHienTai(phienKho)) return [];
      return hopNhatSRSTuBackend(items).filter(laDenHanHomNay);
    } catch {
      return laPhienKhoHienTai(phienKho) ? layCardsDenHan() : [];
    }
  });
}

// Server nhận tối đa 200 mục mỗi lần (reviewController.bulkUpsertReviews)
const SO_MUC_MOI_LO_DONG_BO = 200;

/**
 * Đẩy các từ học lúc chưa đăng nhập lên backend. Từ đã có tiến độ trên server
 * được giữ nguyên phía server, rồi ghi đè lại bản local.
 * Chỉ gửi từ chưa từng nhận về từ server (trước đây gửi cả kho mỗi lần mở app: tài khoản
 * trên 200 từ luôn bị từ chối, và tốn ~100–200 KB tải lên trên điện thoại). Chia lô 200.
 */
export async function dongBoSRSLenBackend() {
  const phienKho = layPhienKhoHocTap();
  const cardsChoDapAn = new Set(layStudySessionsLocal()
    .filter((session) => session.sync?.pending)
    .flatMap((session) => session.answers.map((answer) => String(answer.card_id))));
  const items = layTatCaSRS()
    .filter((entry) => !entry.trenServer)
    .filter((entry) => laCardIdHopLe(entry.id))
    .filter((entry) => !cardsChoDapAn.has(String(entry.id)))
    .map(chuanHoaSRSChoBackend);
  if (items.length === 0) return layTatCaSRS();

  try {
    for (let i = 0; i < items.length; i += SO_MUC_MOI_LO_DONG_BO) {
      const result = await dongBoReviews(items.slice(i, i + SO_MUC_MOI_LO_DONG_BO));
      if (!laPhienKhoHienTai(phienKho)) return [];
      hopNhatSRSTuBackend(result.reviews || []);
    }
    return layTatCaSRS();
  } catch {
    return layTatCaSRS();
  }
}
