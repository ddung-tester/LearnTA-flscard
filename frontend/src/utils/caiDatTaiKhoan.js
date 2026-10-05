import { getStoredAuthToken } from "../services/api";
import { updateUserSettings } from "../services/userApi";
import { layPhienKhoHocTap, laPhienKhoHienTai } from "./khoHocTap";

/**
 * caiDatTaiKhoan — lưu cài đặt (giao diện, âm thanh, cài đặt học...) vào tài khoản đang đăng nhập.
 * Chỉ gửi phần vừa đổi; nhiều lần đổi liên tiếp gộp thành một PATCH, server gộp tiếp vào bản đã lưu.
 * Khách: không gửi gì, cài đặt chỉ nằm trên máy.
 */

const CHO_GUI_MS = 600;

let choGui = {};
let phienChoGui = null;
let henGio = 0;

export function luuLenTaiKhoan(phan) {
  if (!getStoredAuthToken()) return;

  const phien = layPhienKhoHocTap();
  // Đổi tài khoản giữa chừng: bỏ phần của tài khoản cũ
  if (phienChoGui !== phien) choGui = {};
  phienChoGui = phien;
  choGui = { ...choGui, ...phan };

  clearTimeout(henGio);
  henGio = setTimeout(guiNgay, CHO_GUI_MS);
}

function guiNgay() {
  const preferences = choGui;
  const phien = phienChoGui;
  choGui = {};
  if (!getStoredAuthToken() || !laPhienKhoHienTai(phien) || Object.keys(preferences).length === 0) return;

  updateUserSettings({ preferences }).catch(() => {
    // Mất mạng: máy vẫn giữ bản local, lần đổi sau sẽ gửi lại
  });
}
