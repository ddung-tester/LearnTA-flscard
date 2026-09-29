import { timEmoji } from "./timEmoji";

// lottie-react là CJS module; Vite đôi khi wrap thành { default: Fn } (xem StreakBadge)
export const taiThuVienLottie = () => import("lottie-react").then((m) => ({ default: m.default?.default ?? m.default }));

const DIA_CHI = (ma) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${ma}/lottie.json`;
const boNho = new Map();

export function taiLottie(ma) {
  if (!boNho.has(ma)) {
    const hua = fetch(DIA_CHI(ma))
      .then((r) => {
        if (!r.ok) throw new Error(`Không tải được emoji ${ma}`);
        return r.json();
      })
      .catch((loi) => {
        boNho.delete(ma);
        throw loi;
      });
    boNho.set(ma, hua);
  }
  return boNho.get(ma);
}

/** Tải sẵn hình động của một từ (gọi khi thẻ vừa hiện, để lật ra là có ngay). */
export function taiTruocEmoji(tu) {
  const ma = timEmoji(tu);
  if (!ma) return;
  taiThuVienLottie().catch(() => {});
  taiLottie(ma).catch(() => {});
}
