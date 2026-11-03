import { useSyncExternalStore } from "react";

// Cùng mốc với TenseExamplesCard: từ 1100px các thì tách thành hai panel và nút Tiếp tục nổi giữa đáy
const TRUY_VAN = "(min-width: 1100px)";

/** true khi màn đủ rộng (máy tính) — dưới mốc này phản hồi dùng thanh Tiếp tục dính đáy.
 *  truyVan: mốc riêng của trang (vd. bài tập khoá học chia hai cột từ 800px) */
export default function useManRong(truyVan = TRUY_VAN) {
  return useSyncExternalStore(
    (baoThayDoi) => {
      const mq = window.matchMedia(truyVan);
      mq.addEventListener("change", baoThayDoi);
      return () => mq.removeEventListener("change", baoThayDoi);
    },
    () => window.matchMedia(truyVan).matches
  );
}
