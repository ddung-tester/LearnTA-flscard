/**
 * Quét lỗi mọi trang: lỗi JS, console error/warning, request lỗi (HTTP ≥ 400, mất kết nối).
 *
 *   node scripts/quet-loi.mjs <url-frontend> [token]
 *
 * Có token (localStorage "hocTA.authToken") thì quét thêm các trang cần đăng nhập.
 * Chrome: dùng biến CHROME_PATH, mặc định Chromium Playwright cài sẵn của máy cloud.
 * Chỉ đọc giao diện — nhưng trang học có thể ghi phiên học: KHÔNG chạy vào production bằng tài khoản thật.
 */
import { chromium } from "playwright-core";

const [base, token] = process.argv.slice(2);
if (!base) {
  console.error("Dùng: node scripts/quet-loi.mjs <url-frontend> [token]");
  process.exit(1);
}

const TRANG_KHACH = ["/", "/login", "/register", "/khoa-hoc", "/decks", "/practice", "/khong-ton-tai"];
const TRANG_TAI_KHOAN = [
  "/dashboard", "/decks", "/decks?tab=buoi", "/decks?tab=lo-trinh", "/practice", "/khoa-hoc",
  "/khoa-hoc/on-tap", "/review", "/stats", "/tu-sai", "/cai-dat",
];
// Cảnh báo của chính Chromium headless (WebGL phần mềm), không phải lỗi app
const BO_QUA = /Download the React DevTools|AudioContext was not allowed|GroupMarkerNotSet|swiftshader/i;

const trinhDuyet = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
let tongLoi = 0;
for (const [nhom, dsTrang, coToken] of [["khách", TRANG_KHACH, false], ["tài khoản", token ? TRANG_TAI_KHOAN : [], true]]) {
  for (const duongDan of dsTrang) {
    const ctx = await trinhDuyet.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    if (coToken) await ctx.addInitScript((t) => localStorage.setItem("hocTA.authToken", t), token);
    const trang = await ctx.newPage();
    const loi = new Set();
    trang.on("pageerror", (e) => loi.add(`JS: ${e.message}`));
    trang.on("console", (m) => {
      if (["error", "warning"].includes(m.type()) && !BO_QUA.test(m.text())) loi.add(`${m.type()}: ${m.text().slice(0, 200)}`);
    });
    trang.on("response", (r) => {
      if (r.status() >= 400) loi.add(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`);
    });
    trang.on("requestfailed", (r) => {
      if (!/ERR_ABORTED/.test(r.failure()?.errorText || "")) loi.add(`Lỗi mạng ${r.failure()?.errorText} ${r.url()}`);
    });
    await trang.goto(base + duongDan).catch((e) => loi.add(`Không mở được: ${e.message}`));
    await trang.waitForTimeout(4000);
    tongLoi += loi.size;
    console.log(`[${nhom}] ${duongDan} ${loi.size ? `\n  - ${[...loi].join("\n  - ")}` : "OK"}`);
    await ctx.close();
  }
}
await trinhDuyet.close();
console.log(tongLoi ? `\n${tongLoi} lỗi` : "\nKhông có lỗi");
process.exit(tongLoi ? 1 : 0);
