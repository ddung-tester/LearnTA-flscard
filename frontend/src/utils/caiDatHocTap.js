import { getUserSettings, updateUserSettings } from "../services/userApi";

const KHO_CAI_DAT = "learnta_user_study_settings";

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
    const raw = window.localStorage.getItem(KHO_CAI_DAT);
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

    window.localStorage.setItem(KHO_CAI_DAT, JSON.stringify(tatCa));

    // Đồng bộ lên CSDL Backend (MySQL) nếu người dùng đã đăng nhập
    const payloadBackend = {};
    if (caiDatCanLuu.cheDo === "en-vi" || caiDatCanLuu.cheDo === "vi-en") {
      payloadBackend.default_direction = caiDatCanLuu.cheDo;
    }
    if (caiDatCanLuu.chiHocTuYeuThich !== undefined) payloadBackend.only_favorite = caiDatCanLuu.chiHocTuYeuThich;
    if (caiDatCanLuu.batRandom !== undefined) payloadBackend.random_order = caiDatCanLuu.batRandom;
    if (caiDatCanLuu.soCauDungNhanThuong !== undefined) payloadBackend.reward_trigger_count = caiDatCanLuu.soCauDungNhanThuong;
    if (caiDatCanLuu.batReward !== undefined) payloadBackend.reward_enabled = caiDatCanLuu.batReward;

    if (Object.keys(payloadBackend).length > 0) {
      updateUserSettings(payloadBackend).catch(() => {
        // Silent error nếu offline hoặc chưa đăng nhập
      });
    }
  } catch {
    // Bỏ qua nếu localStorage bị đầy hoặc lỗi
  }
}

/**
 * Tải cài đặt từ CSDL về và đồng bộ vào localStorage khi người dùng đăng nhập.
 */
export async function dongBoCaiDatTuDatabase() {
  try {
    const dbSettings = await getUserSettings();
    if (!dbSettings) return;

    const tatCa = docTatCaCaiDat();
    const capNhat = {
      cheDo: dbSettings.default_direction || "vi-en",
      chiHocTuYeuThich: Boolean(dbSettings.only_favorite),
      batRandom: Boolean(dbSettings.random_order),
      batReward: Boolean(dbSettings.reward_enabled),
    };

    const capNhatVoimoc = {
      ...capNhat,
      soCauDungNhanThuong: dbSettings.reward_trigger_count || 10,
    };

    tatCa.flashcard = { ...tatCa.flashcard, ...capNhat };
    tatCa.quiz = { ...tatCa.quiz, ...capNhatVoimoc };
    tatCa.tuluan = { ...tatCa.tuluan, ...capNhatVoimoc };
    for (const mode of ["ngheviet", "nguCanh", "noiTu", "honHop"]) {
      tatCa[mode] = { ...tatCa[mode], ...capNhatVoimoc, cheDo: undefined };
    }

    if (coTheDungLocalStorage()) {
      window.localStorage.setItem(KHO_CAI_DAT, JSON.stringify(tatCa));
    }
  } catch {
    // Silent fail nếu chưa đăng nhập hoặc lỗi mạng
  }
}

export function xoaCaiDatHocTap() {
  if (!coTheDungLocalStorage()) return;

  try {
    window.localStorage.removeItem(KHO_CAI_DAT);
  } catch {
    // Bỏ qua lỗi
  }
}
