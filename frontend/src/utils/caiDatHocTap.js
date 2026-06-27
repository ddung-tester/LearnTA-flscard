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

function coTheDungLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function docTatCaCaiDat() {
  if (!coTheDungLocalStorage()) return MAC_DINH_CAI_DAT;

  try {
    const raw = window.localStorage.getItem(KHO_CAI_DAT);
    if (!raw) return MAC_DINH_CAI_DAT;

    const parsed = JSON.parse(raw);
    return {
      flashcard: { ...MAC_DINH_CAI_DAT.flashcard, ...(parsed?.flashcard || {}) },
      quiz: { ...MAC_DINH_CAI_DAT.quiz, ...(parsed?.quiz || {}) },
      tuluan: { ...MAC_DINH_CAI_DAT.tuluan, ...(parsed?.tuluan || {}) },
    };
  } catch {
    return MAC_DINH_CAI_DAT;
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
    if (caiDatCanLuu.cheDo !== undefined) payloadBackend.default_direction = caiDatCanLuu.cheDo;
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
