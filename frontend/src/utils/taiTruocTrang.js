import { matchPath } from "react-router-dom";
import { taiTrangAnToan } from "./baoLoi";

/**
 * taiTruocTrang — tải trước JS của trang trước khi người học tới đó.
 * - Chạm / rê chuột vào link: tải ngay chunk của trang đích (chạy song song với hiệu ứng tờ giấy
 *   chuyển trang ~420 ms nên trang mới không phải chờ tải JS). Chạm/bấm (không phải rê) còn tải trước
 *   dữ liệu của trang nếu trang có đăng ký `taiDuLieu` (vào bộ nhớ đệm GET của services/api).
 * - Lúc trình duyệt rảnh sau khi mở app: tải dần các trang hay vào (bỏ qua khi bật tiết kiệm dữ liệu / mạng 2G).
 * Tải trùng không tốn gì: import() trả lại module đã có.
 */

const tuyen = [];
const daTai = new Set();

// Trả về hàm import() cho lazy(): gặp file JS của bản cũ (vừa deploy) thì tải lại trang một lần.
// Tải trước chạy nền dùng hàm gốc — lỗi ở đó không được làm tải lại trang khi người học đang học.
export function dangKyTrang(duongDan, tai, taiDuLieu = null) {
  tuyen.push({ duongDan, tai, taiDuLieu });
  return taiTrangAnToan(tai);
}

function taiMot(tai) {
  if (daTai.has(tai)) return;
  daTai.add(tai);
  tai().catch(() => daTai.delete(tai));
}

export function taiTruocTheoDuongDan(pathname, { kemDuLieu = false } = {}) {
  for (const { duongDan, tai, taiDuLieu } of tuyen) {
    const khop = matchPath(duongDan, pathname);
    if (!khop) continue;
    taiMot(tai);
    if (kemDuLieu && taiDuLieu) Promise.resolve(taiDuLieu(khop.params)).catch(() => {});
    return;
  }
}

function duongDanCuaLink(target) {
  const link = target instanceof Element ? target.closest("a[href]") : null;
  if (!link || link.target === "_blank") return null;
  const url = new URL(link.href, window.location.href);
  return url.origin === window.location.origin ? url.pathname : null;
}

function mangCham() {
  const ketNoi = navigator.connection;
  return Boolean(ketNoi?.saveData || /(^|-)2g$/.test(ketNoi?.effectiveType || ""));
}

export function batTaiTruocTrang(cacTrangHayVao = []) {
  const khiCham = (event) => {
    const duongDan = duongDanCuaLink(event.target);
    if (duongDan) taiTruocTheoDuongDan(duongDan, { kemDuLieu: true });
  };
  const khiRe = (event) => {
    const duongDan = duongDanCuaLink(event.target);
    if (duongDan) taiTruocTheoDuongDan(duongDan);
  };
  document.addEventListener("pointerdown", khiCham, { capture: true, passive: true });
  document.addEventListener("mouseover", khiRe, { passive: true });

  let huy = false;
  let hen = 0;
  const henRanh = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 1200));
  const huyRanh = window.cancelIdleCallback ?? window.clearTimeout;
  const tiepTheo = (conLai) => {
    if (huy || conLai.length === 0 || mangCham()) return;
    hen = henRanh(() => {
      taiTruocTheoDuongDan(conLai[0]);
      tiepTheo(conLai.slice(1));
    }, { timeout: 5000 });
  };
  // Đợi trang đầu tải xong hẳn rồi mới tải dần, không tranh băng thông với nó
  const batDau = () => window.setTimeout(() => tiepTheo(cacTrangHayVao), 2500);
  if (document.readyState === "complete") batDau();
  else window.addEventListener("load", batDau, { once: true });

  return () => {
    huy = true;
    huyRanh(hen);
    document.removeEventListener("pointerdown", khiCham, { capture: true });
    document.removeEventListener("mouseover", khiRe);
  };
}
