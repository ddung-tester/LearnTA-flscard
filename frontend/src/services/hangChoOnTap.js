import { capNhatReviewResultTheoCard } from "./reviewApi";
import { layPhienKhoHocTap, khoaKhoHocTap, laPhienKhoHienTai } from "../utils/khoHocTap";

/**
 * Hàng chờ kết quả ôn từ (PATCH /reviews/by-card/:id/result). Mất mạng / máy chủ lỗi tạm thời thì
 * giữ trên máy theo tài khoản và tự gửi lại (giãn 5 s → 2 phút, và ngay khi có mạng), để ôn trên 4G
 * chập chờn không mất kết quả. Mỗi thẻ chỉ giữ kết quả mới nhất. Lỗi 4xx (thẻ đã xoá...) thì bỏ.
 * Cùng cách làm với services/hangChoTraLoi.js (câu bài tập khoá học).
 */
const TEN_KHO = "hocTA.hangChoOnTap";
const NHIP_GUI_LAI_MS = [5000, 15000, 30000, 60000, 120000];

let dangGui = false;
let lanThu = 0;
let henGio = null;
const nguoiNghe = new Set();
let banGhiNho = { khoa: null, ds: [] };

function khoaHienTai() {
  return khoaKhoHocTap(TEN_KHO);
}

function docHangCho() {
  const khoa = khoaHienTai();
  if (banGhiNho.khoa === khoa) return banGhiNho.ds;
  let ds;
  try {
    const raw = JSON.parse(localStorage.getItem(khoa) || "[]");
    ds = Array.isArray(raw) ? raw.filter((muc) => Number(muc?.cardId) > 0 && muc.payload) : [];
  } catch {
    ds = [];
  }
  banGhiNho = { khoa, ds };
  return ds;
}

function ghiHangCho(ds) {
  const khoa = khoaHienTai();
  banGhiNho = { khoa, ds };
  try {
    if (ds.length) localStorage.setItem(khoa, JSON.stringify(ds));
    else localStorage.removeItem(khoa);
  } catch {
    // Bộ nhớ bị chặn: vẫn giữ trong phiên đang mở
  }
  nguoiNghe.forEach((baoDoi) => baoDoi());
}

// Không có phản hồi (mất mạng, hết giờ), máy chủ 5xx / 429, hoặc 401 (chờ đăng nhập lại cùng tài khoản)
export const nenGiuLai = (error) => !error?.status || error.status >= 500 || error.status === 429 || error.status === 401;

function henGuiLai() {
  if (henGio || docHangCho().length === 0) return;
  const cho = NHIP_GUI_LAI_MS[Math.min(lanThu, NHIP_GUI_LAI_MS.length - 1)];
  henGio = setTimeout(() => {
    henGio = null;
    guiLaiHangChoOnTap();
  }, cho);
}

export async function guiLaiHangChoOnTap() {
  if (dangGui || docHangCho().length === 0) return;
  const phien = layPhienKhoHocTap();
  if (phien.chuSoHuu === "guest") return;
  dangGui = true;
  try {
    for (const muc of [...docHangCho()]) {
      if (!laPhienKhoHienTai(phien)) return;
      if (!docHangCho().includes(muc)) continue;
      try {
        await capNhatReviewResultTheoCard(muc.cardId, muc.payload);
      } catch (error) {
        if (nenGiuLai(error)) {
          lanThu += 1;
          return;
        }
      }
      if (laPhienKhoHienTai(phien)) ghiHangCho(docHangCho().filter((cho) => cho !== muc));
    }
    lanThu = 0;
  } finally {
    dangGui = false;
    henGuiLai();
  }
}

/** Đưa một kết quả chưa gửi được vào hàng chờ (thay kết quả cũ của cùng thẻ) */
export function themVaoHangChoOnTap(cardId, payload) {
  const ds = docHangCho().filter((muc) => muc.cardId !== cardId);
  ghiHangCho([...ds, { cardId, payload, luc: Date.now() }]);
  henGuiLai();
}

/** Thẻ vừa gửi thành công: bỏ kết quả cũ còn chờ của nó (nếu có) */
export function boKhoiHangChoOnTap(cardId) {
  const ds = docHangCho();
  if (ds.some((muc) => muc.cardId === cardId)) ghiHangCho(ds.filter((muc) => muc.cardId !== cardId));
}

export function theoDoiHangChoOnTap(baoDoi) {
  nguoiNghe.add(baoDoi);
  return () => nguoiNghe.delete(baoDoi);
}

export function soTuDangCho() {
  return docHangCho().length;
}

if (typeof window !== "undefined") {
  window.addEventListener?.("online", () => {
    lanThu = 0;
    guiLaiHangChoOnTap();
  });
  // Đổi tài khoản: đọc lại hàng của tài khoản mới (hàng của tài khoản cũ vẫn giữ trên máy)
  window.addEventListener?.("auth:changed", () => {
    banGhiNho = { khoa: null, ds: [] };
    nguoiNghe.forEach((baoDoi) => baoDoi());
    setTimeout(guiLaiHangChoOnTap, 3000);
  });
  setTimeout(guiLaiHangChoOnTap, 3000);
}
