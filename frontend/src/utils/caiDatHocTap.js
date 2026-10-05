import { khoaKhoHocTap, layPhienKhoHocTap, laPhienKhoHienTai } from "./khoHocTap";
import { getUserSettings } from "../services/userApi";
import { luuLenTaiKhoan } from "./caiDatTaiKhoan";
import { apDungGiaoDien, layGiaoDienDaChon } from "./giaoDien";
import { apDungAmThanh, layAmThanhDaChon } from "./amThanh";

const KHO_CAI_DAT = "learnta_user_study_settings";
const KHO_CACH_XEM_LY_THUYET = "learnta_ly_thuyet_cach_xem";

const MAC_DINH_CAI_DAT = {
  flashcard: {
    cheDo: "vi-en",
    chiHocTuYeuThich: false,
    batRandom: false,
    batReward: false,
  },
  quiz: {
    cheDo: "vi-en",
    chiHocTuYeuThich: false,
    batRandom: false,
    batReward: false,
    soCauDungNhanThuong: 10,
  },
  tuluan: {
    cheDo: "vi-en",
    chiHocTuYeuThich: false,
    batRandom: false,
    batReward: false,
    soCauDungNhanThuong: 10,
  },
};

// Các chế độ không có chiều hỏi (không lưu cheDo)
const CAI_DAT_KHONG_CHIEU = {
  chiHocTuYeuThich: false,
  batRandom: false,
  batReward: false,
  soCauDungNhanThuong: 10,
};
MAC_DINH_CAI_DAT.ngheviet = { ...CAI_DAT_KHONG_CHIEU };
MAC_DINH_CAI_DAT.nguCanh = { ...CAI_DAT_KHONG_CHIEU };
MAC_DINH_CAI_DAT.noiTu = { ...CAI_DAT_KHONG_CHIEU };
MAC_DINH_CAI_DAT.honHop = { ...CAI_DAT_KHONG_CHIEU };

// Trang Luyện tập: bộ từ, bộ lọc, thứ tự, số lượng đã chọn lần trước
MAC_DINH_CAI_DAT.luyenTap = { boId: null, filter: "tat-ca", ngauNhien: true, soLuong: 20 };

// Ôn tập SRS: chế độ cho từng level Lv0–Lv5 ("the" | "chon" | "go")
export const CHE_DO_THEO_LEVEL_MAC_DINH = ["the", "chon", "chon", "go", "go", "go"];
MAC_DINH_CAI_DAT.onTap = { cheDoTheoLevel: CHE_DO_THEO_LEVEL_MAC_DINH };

function coTheDungLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function ghepVoiMacDinh(parsed = {}) {
  return Object.fromEntries(
    Object.entries(MAC_DINH_CAI_DAT).map(([mode, macDinh]) => [
      mode,
      { ...macDinh, ...(parsed?.[mode] || {}) },
    ])
  );
}

export function docTatCaCaiDat() {
  if (!coTheDungLocalStorage()) return ghepVoiMacDinh();

  try {
    const raw = window.localStorage.getItem(khoaKhoHocTap(KHO_CAI_DAT));
    if (!raw) return ghepVoiMacDinh();

    return ghepVoiMacDinh(JSON.parse(raw));
  } catch {
    return ghepVoiMacDinh();
  }
}

export function docCaiDatHocTap(mode) {
  const tatCa = docTatCaCaiDat();
  const caiDatMode = tatCa[mode] || MAC_DINH_CAI_DAT[mode] || {};

  return { ...caiDatMode };
}

export function luuCaiDatHocTap(mode, caiDatMoi) {
  if (!coTheDungLocalStorage()) return;

  try {
    const tatCa = docTatCaCaiDat();
    const caiDatCanLuu = caiDatMoi || {};

    tatCa[mode] = {
      ...tatCa[mode],
      ...caiDatCanLuu,
    };

    window.localStorage.setItem(khoaKhoHocTap(KHO_CAI_DAT), JSON.stringify(tatCa));

    // Lưu nguyên cài đặt từng chế độ vào tài khoản (không gộp về một chiều hỏi chung như cột cũ)
    luuLenTaiKhoan({ hocTap: tatCa });
  } catch {
    // Bỏ qua nếu localStorage bị đầy hoặc lỗi
  }
}

/**
 * Đăng nhập: tải cài đặt của tài khoản về máy và áp dụng ngay (giao diện, âm thanh, cách xem, cài đặt học).
 * Tài khoản chưa lưu mục nào thì đẩy lựa chọn đang có trên máy lên làm bản đầu tiên.
 */
export async function dongBoCaiDatTuDatabase() {
  const phien = layPhienKhoHocTap();
  try {
    const dbSettings = await getUserSettings();
    if (!dbSettings || !laPhienKhoHienTai(phien)) return;

    const prefs = dbSettings.preferences || {};
    const canDayLen = {};

    if (prefs.giaoDien) apDungGiaoDien(prefs.giaoDien);
    else if (layGiaoDienDaChon()) canDayLen.giaoDien = layGiaoDienDaChon();

    if (typeof prefs.amThanh === "boolean") apDungAmThanh(prefs.amThanh);
    else if (layAmThanhDaChon() !== null) canDayLen.amThanh = layAmThanhDaChon();

    if (prefs.lyThuyetCachXem) ghiCachXemLyThuyet(prefs.lyThuyetCachXem);
    else if (docCachXemLyThuyetDaChon()) canDayLen.lyThuyetCachXem = docCachXemLyThuyetDaChon();

    let tatCa;
    if (prefs.hocTap) {
      tatCa = ghepVoiMacDinh(prefs.hocTap);
    } else {
      // Tài khoản cũ chỉ có các cột chung: áp chúng lên bản trên máy rồi lưu bản đầy đủ
      tatCa = docTatCaCaiDat();
      const capNhat = {
        cheDo: dbSettings.default_direction || "vi-en",
        chiHocTuYeuThich: Boolean(dbSettings.only_favorite),
        batRandom: Boolean(dbSettings.random_order),
        batReward: Boolean(dbSettings.reward_enabled),
      };
      const capNhatVoiMoc = { ...capNhat, soCauDungNhanThuong: dbSettings.reward_trigger_count || 10 };

      tatCa.flashcard = { ...tatCa.flashcard, ...capNhat };
      tatCa.quiz = { ...tatCa.quiz, ...capNhatVoiMoc };
      tatCa.tuluan = { ...tatCa.tuluan, ...capNhatVoiMoc };
      for (const mode of ["ngheviet", "nguCanh", "noiTu", "honHop"]) {
        tatCa[mode] = { ...tatCa[mode], ...capNhatVoiMoc, cheDo: undefined };
      }
      canDayLen.hocTap = tatCa;
    }

    if (coTheDungLocalStorage()) {
      window.localStorage.setItem(khoaKhoHocTap(KHO_CAI_DAT), JSON.stringify(tatCa));
    }
    if (Object.keys(canDayLen).length > 0) luuLenTaiKhoan(canDayLen);
  } catch {
    // Silent fail nếu chưa đăng nhập hoặc lỗi mạng
  }
}

/** Trang Bài học → Lý thuyết: "so-tay" (lật trang, mặc định) hoặc "cuon" */
function docCachXemLyThuyetDaChon() {
  try {
    const daChon = window.localStorage.getItem(KHO_CACH_XEM_LY_THUYET);
    return daChon === "cuon" || daChon === "so-tay" ? daChon : null;
  } catch {
    return null;
  }
}

function ghiCachXemLyThuyet(cachXem) {
  if (cachXem !== "cuon" && cachXem !== "so-tay") return;
  try {
    window.localStorage.setItem(KHO_CACH_XEM_LY_THUYET, cachXem);
  } catch {
    // Không lưu được thì chỉ đổi trong lần xem này
  }
}

export function docCachXemLyThuyet() {
  return docCachXemLyThuyetDaChon() ?? "so-tay";
}

export function luuCachXemLyThuyet(cachXem) {
  ghiCachXemLyThuyet(cachXem);
  luuLenTaiKhoan({ lyThuyetCachXem: cachXem });
}

export function xoaCaiDatHocTap() {
  if (!coTheDungLocalStorage()) return;

  try {
    window.localStorage.removeItem(khoaKhoHocTap(KHO_CAI_DAT));
  } catch {
    // Bỏ qua lỗi
  }
}
