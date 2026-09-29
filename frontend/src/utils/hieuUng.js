/**
 * hieuUng — hiệu ứng phản hồi dùng chung: pháo giấy bắn từ một phần tử, rung máy.
 * Mọi hiệu ứng tự tắt khi người dùng bật "giảm chuyển động".
 */

// Bảng màu pháo giấy theo tông mật ong của app
const MAU_PHAO_GIAY = ["#823a0d", "#e0a526", "#f5c451", "#3f9b5b", "#fff4d6"];

export function nguoiDungGiamChuyenDong() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

let taiConfetti = null;
function layConfetti() {
  // Chỉ tải thư viện khi cần bắn lần đầu
  taiConfetti ??= import("canvas-confetti").then((m) => m.default);
  return taiConfetti;
}

/**
 * Bắn pháo giấy từ tâm phần tử `el` (hoặc giữa màn hình nếu không có).
 * manh: "nho" (trả lời đúng) | "lon" (hoàn thành phiên)
 */
export async function banPhaoGiay(el, manh = "nho") {
  if (nguoiDungGiamChuyenDong()) return;

  let origin = { x: 0.5, y: 0.45 };
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    origin = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    };
  }

  const confetti = await layConfetti();
  const chung = { origin, colors: MAU_PHAO_GIAY, disableForReducedMotion: true, zIndex: 9999 };

  if (manh === "lon") {
    confetti({ ...chung, particleCount: 90, spread: 100, startVelocity: 48, scalar: 1.05 });
    setTimeout(() => confetti({ ...chung, origin: { x: 0.15, y: 0.7 }, angle: 60, particleCount: 60, spread: 70 }), 180);
    setTimeout(() => confetti({ ...chung, origin: { x: 0.85, y: 0.7 }, angle: 120, particleCount: 60, spread: 70 }), 320);
    return;
  }

  confetti({ ...chung, particleCount: 28, spread: 62, startVelocity: 26, gravity: 1.1, ticks: 110, scalar: 0.8 });
}

const KIEU_RUNG = {
  dung: [14],
  sai: [30, 50, 30],
  xong: [20, 40, 20, 40, 60],
};

/** Rung máy nhẹ trên điện thoại (bỏ qua nếu trình duyệt không hỗ trợ). */
export function rungMay(kieu = "dung") {
  if (nguoiDungGiamChuyenDong()) return;
  try {
    navigator.vibrate?.(KIEU_RUNG[kieu] ?? KIEU_RUNG.dung);
  } catch {
    // Một số trình duyệt chặn vibrate khi chưa có tương tác — bỏ qua
  }
}
