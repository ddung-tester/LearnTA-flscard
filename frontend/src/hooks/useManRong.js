import { useSyncExternalStore } from "react";

// Cùng mốc với TenseExamplesCard: từ 1100px các thì tách thành hai panel và nút Tiếp tục nổi giữa đáy
const TRUY_VAN = "(min-width: 1100px)";

function dangKy(baoThayDoi) {
  const mq = window.matchMedia(TRUY_VAN);
  mq.addEventListener("change", baoThayDoi);
  return () => mq.removeEventListener("change", baoThayDoi);
}

/** true khi màn đủ rộng (máy tính) — dưới mốc này phản hồi dùng thanh Tiếp tục dính đáy */
export default function useManRong() {
  return useSyncExternalStore(dangKy, () => window.matchMedia(TRUY_VAN).matches);
}
