import { buildApiUrl } from "../config/api";

/**
 * baoLoi — gửi lỗi xảy ra trên máy người dùng về server (log Cloud Run, xem clientErrorRoutes.js),
 * để lỗi ở điện thoại thật không bị âm thầm bỏ qua. Chỉ bản build production; gộp lại gửi sau 3 s,
 * mỗi lỗi giống nhau gửi một lần, tối đa 20 lỗi mỗi lần mở app.
 */

const TOI_DA_MOI_PHIEN = 20;
const BO_QUA = /ResizeObserver loop|^Script error\.?$|AbortError|CanceledError|chrome-extension:|moz-extension:/;

let hang = [];
let henGui = 0;
let daGui = 0;
const daThay = new Set();

function banBuild() {
  const script = document.querySelector('script[type="module"][src*="/assets/index-"]');
  return script?.getAttribute("src")?.split("/").pop() || "dev";
}

function gui() {
  henGui = 0;
  const loiGui = hang;
  hang = [];
  if (loiGui.length === 0) return;
  fetch(buildApiUrl("/api/client-errors"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ errors: loiGui }),
    keepalive: true,
  }).catch(() => {});
}

export function baoLoi(kieu, loi, chiTiet = "") {
  if (!import.meta.env.PROD || typeof window === "undefined") return;
  const noiDung = String(loi?.message || loi || "").slice(0, 500);
  const stack = `${loi?.stack || ""}${chiTiet ? `\n${chiTiet}` : ""}`.slice(0, 2000);
  if (!noiDung || BO_QUA.test(noiDung) || BO_QUA.test(stack)) return;
  const khoa = `${kieu}|${noiDung}`;
  if (daThay.has(khoa) || daGui >= TOI_DA_MOI_PHIEN) return;
  daThay.add(khoa);
  daGui += 1;
  hang.push({ kieu, noiDung, stack, trang: window.location.pathname, banBuild: banBuild() });
  if (!henGui) henGui = window.setTimeout(gui, 3000);
}

export function batBaoLoi() {
  window.addEventListener("error", (event) => baoLoi("js", event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => baoLoi("promise", event.reason));
  // Rời trang trước khi kịp gửi
  window.addEventListener("pagehide", gui);
}

// ── File JS của bản cũ đã bị xoá sau khi deploy ──────────────────────────────
// Tab mở từ trước khi deploy bấm sang trang khác → tải chunk cũ → 404 → trang trắng. Tải lại trang
// (lấy bản mới) một lần; trong 30 s đã tải lại rồi mà vẫn lỗi thì để màn báo lỗi hiện.
const KHOA_TAI_LAI = "learnta_tai_lai_vi_ban_moi";

export function laLoiTaiFileJs(loi) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    String(loi?.message || loi || "")
  );
}

export function taiLaiTrangMotLan() {
  try {
    const lanTruoc = Number(sessionStorage.getItem(KHOA_TAI_LAI) || 0);
    if (Date.now() - lanTruoc < 30000) return false;
    sessionStorage.setItem(KHOA_TAI_LAI, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Bọc hàm import() của trang: gặp file JS cũ thì tải lại trang một lần thay vì trắng trang */
export function taiTrangAnToan(tai) {
  return () =>
    tai().catch((loi) => {
      if (laLoiTaiFileJs(loi) && taiLaiTrangMotLan()) return new Promise(() => {});
      throw loi;
    });
}
