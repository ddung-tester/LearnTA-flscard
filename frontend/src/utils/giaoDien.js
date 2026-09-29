/**
 * giaoDien — chế độ "sang" (bàn mật ong, mặc định) hoặc "den-ban" (bàn gỗ tối, thẻ giấy dưới đèn).
 * Lưu ở localStorage; chưa chọn thì theo prefers-color-scheme của máy.
 * index.html có đoạn script nhỏ đặt sẵn data-giao-dien trước khi vẽ để không nháy sáng.
 */

const KHO = "learnta_giao_dien";
const SU_KIEN = "learnta:giao-dien-doi";

export function layGiaoDien() {
  try {
    const daChon = window.localStorage.getItem(KHO);
    if (daChon === "sang" || daChon === "den-ban") return daChon;
  } catch {
    // localStorage bị chặn — theo máy
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "den-ban" : "sang";
}

export function datGiaoDien(giaoDien) {
  try {
    window.localStorage.setItem(KHO, giaoDien);
  } catch {
    // Không lưu được — chỉ đổi trong phiên
  }
  window.dispatchEvent(new Event(SU_KIEN));
}

export function theoDoiGiaoDien(goiLai) {
  const may = window.matchMedia?.("(prefers-color-scheme: dark)");
  window.addEventListener(SU_KIEN, goiLai);
  window.addEventListener("storage", goiLai);
  may?.addEventListener?.("change", goiLai);
  return () => {
    window.removeEventListener(SU_KIEN, goiLai);
    window.removeEventListener("storage", goiLai);
    may?.removeEventListener?.("change", goiLai);
  };
}
