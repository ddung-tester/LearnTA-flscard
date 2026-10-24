/**
 * lichSuDieuHuong — nhớ các trang đã đi qua trong thẻ trình duyệt đang mở, theo vị trí lịch sử
 * (history.state.idx của React Router), để:
 * - nút quay lại lùi về đúng trang trước thay vì đẩy thêm một mục (bấm Back của trình duyệt không vòng lại);
 * - bấm Back của trình duyệt về đúng chỗ đang cuộn (danh sách 48 buổi, danh sách bộ từ...).
 * Lưu ở sessionStorage: tải lại trang vẫn nhớ, đóng thẻ thì mất.
 */
const KHOA_LUU = "hocTA.lichSu";
const SO_MUC_TOI_DA = 60;

function docLichSu() {
  try {
    return JSON.parse(sessionStorage.getItem(KHOA_LUU) || "{}") || {};
  } catch {
    return {};
  }
}

function ghiLichSu(lichSu) {
  try {
    const cacIdx = Object.keys(lichSu).map(Number).sort((a, b) => a - b);
    for (const idx of cacIdx.slice(0, Math.max(0, cacIdx.length - SO_MUC_TOI_DA))) delete lichSu[idx];
    sessionStorage.setItem(KHOA_LUU, JSON.stringify(lichSu));
  } catch {
    // Bộ nhớ trình duyệt bị chặn: quay lại theo đường dẫn cố định như cũ
  }
}

export function idxHienTai() {
  const idx = window.history.state?.idx;
  return Number.isInteger(idx) ? idx : null;
}

/** Ghi trang đang ở vào vị trí idx; mục phía sau idx là nhánh cũ (vừa đi trang mới từ giữa lịch sử) thì bỏ */
export function ghiTrang(idx, duongDan, { catNhanh = false } = {}) {
  if (idx == null) return;
  const lichSu = docLichSu();
  if (catNhanh) for (const k of Object.keys(lichSu)) if (Number(k) > idx) delete lichSu[k];
  lichSu[idx] = { ...(lichSu[idx]?.duongDan === duongDan ? lichSu[idx] : {}), duongDan };
  ghiLichSu(lichSu);
}

export function ghiViTriCuon(idx, y) {
  if (idx == null) return;
  const lichSu = docLichSu();
  if (!lichSu[idx]) return;
  lichSu[idx].y = Math.max(0, Math.round(y));
  ghiLichSu(lichSu);
}

export function layViTriCuon(idx) {
  return idx == null ? 0 : docLichSu()[idx]?.y ?? 0;
}

// So trang theo đường dẫn, bỏ query; bước của buổi học (/khoa-hoc/1/bai/3/tu-vung) vẫn là trang buổi đó
const chiDuongDan = (duongDan) =>
  (String(duongDan || "").split(/[?#]/)[0].replace(/\/+$/, "") || "/")
    .replace(/^(\/khoa-hoc\/[^/]+\/bai\/[^/]+)\/[^/]+$/, "$1");

/**
 * Số bước lùi để về trang trước, hoặc null nếu phải đi tới `dich` theo đường dẫn.
 * - kieu "len" (nút có nhãn "← Bộ từ", "← Buổi 1"...): chỉ lùi khi trang ngay trước đúng là `dich`.
 * - kieu "noi-truoc" (nút "Trở về" của trang học): lùi về trang gần nhất khác trang đang học
 *   (bỏ qua các lượt "Làm lại" của chính trang học), dù đó là Luyện tập, buổi học hay bộ từ.
 */
export function soBuocLui(kieu, dich, duongDanHienTai, idx = idxHienTai()) {
  if (idx == null || idx <= 0) return null;
  const lichSu = docLichSu();
  if (kieu === "len") {
    const truoc = lichSu[idx - 1]?.duongDan;
    return truoc && chiDuongDan(truoc) === chiDuongDan(dich) ? -1 : null;
  }
  const trangNay = chiDuongDan(duongDanHienTai);
  for (let j = idx - 1; j >= 0; j -= 1) {
    const muc = lichSu[j];
    if (!muc) return null;
    if (chiDuongDan(muc.duongDan) !== trangNay) return j - idx;
  }
  return null;
}
