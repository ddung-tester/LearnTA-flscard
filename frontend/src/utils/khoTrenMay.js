import { khoaKhoHocTap } from "./khoHocTap";

/**
 * Kho JSON lớn trên localStorage (theo tài khoản, khoaKhoHocTap) đọc/ghi nhanh khi đang học:
 * - đọc: giữ bản đã parse trong bộ nhớ; tab khác ghi (sự kiện "storage") thì đọc lại;
 * - ghi: cập nhật bộ nhớ ngay, ghi xuống localStorage lúc rảnh (tối đa 1 s), gộp nhiều lần ghi;
 *   rời trang / ẩn tab thì ghi ngay.
 * Lý do: kho SRS của tài khoản nhiều từ ~0,5 MB — parse ~6 ms, stringify + ghi ~35 ms mỗi lần trên
 * CPU điện thoại, mà mỗi lần trả lời đọc/ghi nhiều lần ngay trong lúc bấm.
 */
export function taoKhoTrenMay(tenKho) {
  let banDaDoc = null; // { kho, khoa, data }
  let choGhi = null; // { kho, khoa, data }
  let henGhi = null;

  function layKho() {
    try {
      return localStorage;
    } catch {
      return null;
    }
  }

  function ghiNgay() {
    if (henGhi) {
      henGhi.huy();
      henGhi = null;
    }
    const viec = choGhi;
    choGhi = null;
    if (!viec) return;
    try {
      viec.kho.setItem(viec.khoa, JSON.stringify(viec.data));
      banDaDoc = { kho: viec.kho, khoa: viec.khoa, data: viec.data };
    } catch {
      // localStorage đầy hoặc bị chặn — bỏ qua
    }
  }

  function henGhiKhiRanh() {
    if (henGhi) return;
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(ghiNgay, { timeout: 1000 });
      henGhi = { huy: () => window.cancelIdleCallback(id) };
    } else {
      const id = setTimeout(ghiNgay, 200);
      henGhi = { huy: () => clearTimeout(id) };
    }
  }

  function doc() {
    const kho = layKho();
    if (!kho) return {};
    const khoa = khoaKhoHocTap(tenKho);
    if (choGhi && choGhi.kho === kho && choGhi.khoa === khoa) return choGhi.data;
    if (banDaDoc && banDaDoc.kho === kho && banDaDoc.khoa === khoa) return banDaDoc.data;
    try {
      const raw = kho.getItem(khoa);
      const parsed = raw ? JSON.parse(raw) : {};
      const data = parsed && typeof parsed === "object" ? parsed : {};
      banDaDoc = { kho, khoa, data };
      return data;
    } catch {
      return {};
    }
  }

  function ghi(data) {
    const kho = layKho();
    if (!kho) return;
    const khoa = khoaKhoHocTap(tenKho);
    // Đổi tài khoản giữa chừng: ghi xong phần của tài khoản cũ vào đúng khoá cũ trước
    if (choGhi && (choGhi.kho !== kho || choGhi.khoa !== khoa)) ghiNgay();
    choGhi = { kho, khoa, data };
    henGhiKhiRanh();
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key === banDaDoc?.khoa) banDaDoc = null;
    });
    window.addEventListener("pagehide", ghiNgay);
    document.addEventListener?.("visibilitychange", () => {
      if (document.visibilityState === "hidden") ghiNgay();
    });
  }

  return { doc, ghi, ghiNgay };
}
