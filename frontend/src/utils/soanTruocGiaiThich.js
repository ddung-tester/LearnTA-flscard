import { chuanBiGiaiThich } from "../services/courseApi";

/**
 * Hàng đợi soạn trước lời giải thích AI của câu bài tập khoá học (phía máy người học).
 * - Kho lời dùng chung: { [questionId]: { answer_norm: lời } }, nạp từ dữ liệu bài + kết quả soạn.
 * - Ưu tiên: câu đang hiện + 2 câu kế (gọi ngay, lần lượt).
 * - Nền: các câu còn lại của buổi, mỗi câu cách nhau GIAN_CACH_NEN_MS (≤ 15 lượt/phút — hạn mức
 *   Gemini gói miễn phí dùng chung với cả website); 3 lỗi liên tiếp thì dừng phần nền.
 * Đặt ở máy vì Cloud Run không chạy tiếp việc nền sau khi đã trả lời request.
 */

export const GIAN_CACH_NEN_MS = 4000;
const LOI_LIEN_TIEP_TOI_DA = 3;

const kho = new Map();
const daDu = new Set(); // câu đã đủ lời (không cần soạn nữa)
let hangUuTien = [];
let hangNen = [];
let dangChay = false;
let loiLienTiep = 0;
let henNen = null;

/** Nạp lời có sẵn trong dữ liệu bài / câu ôn (server gửi kèm) */
export function napCauHoi(dsCau) {
  for (const cau of dsCau) {
    const daCo = kho.get(cau.id) ?? {};
    kho.set(cau.id, { ...(cau.explanations || {}), ...daCo });
    if (cau.explanations_ready) daDu.add(cau.id);
  }
}

/** Lời đã soạn của một câu (đối tượng sống, cập nhật khi soạn xong) */
export function khoGiaiThichCua(cau) {
  if (!kho.has(cau.id)) kho.set(cau.id, { ...(cau.explanations || {}) });
  return kho.get(cau.id);
}

/** Ghi đè một lời (vd. sau khi người học bấm "Viết lại") */
export function capNhatGiaiThich(questionId, answerNorm, loi) {
  if (!kho.has(questionId)) kho.set(questionId, {});
  kho.get(questionId)[answerNorm] = loi;
}

function canSoan(id) {
  return id && !daDu.has(id);
}

export function uuTienSoan(ids) {
  const moi = ids.filter(canSoan);
  hangUuTien = [...moi, ...hangUuTien.filter((id) => !moi.includes(id))];
  hangNen = hangNen.filter((id) => !moi.includes(id));
  // Đang nghỉ giữa hai lượt nền: dừng nghỉ để làm câu ưu tiên ngay
  if (moi.length > 0 && henNen) henNen.huy();
  chay();
}

/** Soạn dần cả buổi trong nền (thay hàng nền cũ — vd. khi chuyển sang buổi khác) */
export function soanNen(ids) {
  hangNen = ids.filter(canSoan).filter((id) => !hangUuTien.includes(id));
  loiLienTiep = 0;
  chay();
}

export function dungSoanNen() {
  hangNen = [];
  if (henNen) {
    henNen.huy();
    henNen = null;
  }
}

function cho(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      henNen = null;
      resolve(true);
    }, ms);
    henNen = {
      huy: () => {
        clearTimeout(id);
        resolve(false);
      },
    };
  });
}

async function soanMot(id) {
  try {
    const ketQua = await chuanBiGiaiThich(id);
    Object.assign(khoGiaiThichCua({ id }), ketQua?.explanations || {});
    if (ketQua?.ready) {
      daDu.add(id);
      loiLienTiep = 0;
    } else {
      loiLienTiep += 1;
    }
  } catch {
    loiLienTiep += 1;
  }
}

async function chay() {
  if (dangChay) return;
  dangChay = true;
  try {
    for (;;) {
      if (hangUuTien.length > 0) {
        const id = hangUuTien.shift();
        if (canSoan(id)) await soanMot(id);
        continue;
      }
      if (hangNen.length === 0 || loiLienTiep >= LOI_LIEN_TIEP_TOI_DA) break;
      // Nghỉ giữa các lượt nền; câu ưu tiên đến giữa chừng thì làm câu đó trước
      if (!(await cho(GIAN_CACH_NEN_MS))) {
        if (hangUuTien.length > 0) continue;
        break;
      }
      if (hangUuTien.length > 0) continue;
      const id = hangNen.shift();
      if (canSoan(id)) await soanMot(id);
    }
  } finally {
    dangChay = false;
  }
}

/** Chỉ dùng trong test */
export function _datLai() {
  kho.clear();
  daDu.clear();
  hangUuTien = [];
  hangNen = [];
  loiLienTiep = 0;
  dangChay = false;
  if (henNen) henNen.huy();
  henNen = null;
}
