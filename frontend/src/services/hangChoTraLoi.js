import { luuTraLoiCauHoi } from "./courseApi";

/**
 * Hàng chờ lưu câu trả lời bài tập khoá học. Lưu lỗi vì mất mạng, hết giờ hay máy chủ lỗi tạm thời
 * thì giữ lại trên máy và tự gửi lại (giãn dần 5 s → 2 phút, và ngay khi có mạng trở lại),
 * để tiến độ và câu sai cần ôn không mất khi học trên 4G chập chờn.
 * Mỗi câu chỉ giữ lần trả lời mới nhất. Lỗi 4xx (câu không còn, câu trả lời không hợp lệ) thì bỏ.
 */
const KHOA_LUU = "hocTA.hangChoTraLoi";
const NHIP_GUI_LAI_MS = [5000, 15000, 30000, 60000, 120000];

let hangCho = docHangCho();
let dangGui = false;
let lanThu = 0;
let henGio = null;
const nguoiNghe = new Set();

function docHangCho() {
  try {
    const raw = JSON.parse(localStorage.getItem(KHOA_LUU) || "[]");
    return Array.isArray(raw) ? raw.filter((muc) => Number(muc?.questionId) > 0 && muc.answer) : [];
  } catch {
    return [];
  }
}

function ghiHangCho(moi) {
  hangCho = moi;
  try {
    if (moi.length) localStorage.setItem(KHOA_LUU, JSON.stringify(moi));
    else localStorage.removeItem(KHOA_LUU);
  } catch {
    // Bộ nhớ trình duyệt bị chặn: vẫn giữ hàng chờ trong phiên đang mở
  }
  nguoiNghe.forEach((baoDoi) => baoDoi());
}

// Lỗi đáng gửi lại: không có phản hồi (mất mạng, hết giờ) hoặc máy chủ lỗi 5xx / quá tải 429
const nenGuiLai = (error) => !error?.status || error.status >= 500 || error.status === 429;

function henGuiLai() {
  if (henGio || hangCho.length === 0) return;
  const cho = NHIP_GUI_LAI_MS[Math.min(lanThu, NHIP_GUI_LAI_MS.length - 1)];
  henGio = setTimeout(() => {
    henGio = null;
    guiLaiHangCho();
  }, cho);
}

/** Gửi lần lượt các câu đang chờ; dừng ở lỗi mạng đầu tiên và hẹn lần sau. */
export async function guiLaiHangCho() {
  if (dangGui || hangCho.length === 0) return;
  dangGui = true;
  try {
    for (const muc of [...hangCho]) {
      if (!hangCho.includes(muc)) continue; // đã có câu trả lời mới hơn thay chỗ
      try {
        await luuTraLoiCauHoi(muc.questionId, muc.answer);
      } catch (error) {
        if (nenGuiLai(error)) {
          lanThu += 1;
          return;
        }
      }
      // Đã lưu hoặc lỗi không gửi lại được: bỏ khỏi hàng (trừ khi vừa có câu trả lời mới hơn)
      ghiHangCho(hangCho.filter((cho) => cho !== muc));
    }
    lanThu = 0;
  } finally {
    dangGui = false;
    henGuiLai();
  }
}

/**
 * Lưu câu trả lời; lỗi mạng thì vào hàng chờ. Không bao giờ ném lỗi.
 * @returns {Promise<boolean>} true = đã lưu lên máy chủ
 */
export async function luuTraLoiCoHangCho(questionId, answer) {
  // Câu trả lời mới thay cho lần cũ còn đang chờ của cùng câu
  if (hangCho.some((muc) => muc.questionId === questionId)) {
    ghiHangCho(hangCho.filter((muc) => muc.questionId !== questionId));
  }
  try {
    await luuTraLoiCauHoi(questionId, answer);
    if (hangCho.length) guiLaiHangCho();
    return true;
  } catch (error) {
    if (!nenGuiLai(error)) return false;
    ghiHangCho([...hangCho, { questionId, answer, luc: Date.now() }]);
    henGuiLai();
    return false;
  }
}

export function theoDoiHangCho(baoDoi) {
  nguoiNghe.add(baoDoi);
  return () => nguoiNghe.delete(baoDoi);
}

export function soCauDangCho() {
  return hangCho.length;
}

/** Đăng xuất / đổi tài khoản: bỏ các câu đang chờ của tài khoản trước */
export function xoaHangCho() {
  clearTimeout(henGio);
  henGio = null;
  lanThu = 0;
  ghiHangCho([]);
}

if (typeof window !== "undefined") {
  window.addEventListener?.("online", () => {
    lanThu = 0;
    guiLaiHangCho();
  });
  window.addEventListener?.("auth:changed", xoaHangCho);
  // Còn câu chờ từ lần mở trước: gửi khi app vừa chạy
  if (hangCho.length) setTimeout(guiLaiHangCho, 3000);
}
