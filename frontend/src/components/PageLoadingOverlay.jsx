import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";

// Tải lottie-web khi overlay cần hiện lần đầu, không nằm trong bundle chính
const Lottie = lazy(() =>
  import("lottie-react").then((m) => ({ default: m.default?.default ?? m.default })),
);
const LOADING_REVEAL_DELAY_MS = 120;
// Trì hoãn nhỏ khi ẩn overlay: safety net cho double-rAF bridge,
// tránh flicker nếu data-loading key chưa kịp đăng ký trên thiết bị chậm.
const LOADING_HIDE_DELAY_MS = 50;
// Thời gian fade-out của motion animation (ms) — Lottie được unmount sau khi fade xong
const MOTION_HIDE_DURATION_MS = 140;

/**
 * PageLoadingOverlay — màn chờ khi chuyển trang (Lottie).
 * treHien: đang có tờ giấy TheMoRong phủ màn hình thì chờ lâu hơn, trang tải nhanh sẽ không chớp màn chờ.
 */
function PageLoadingOverlay({ hienThi, treHien = LOADING_REVEAL_DELAY_MS }) {
  const [loadingAnimation, setLoadingAnimation] = useState(null);
  const [dangHienThi, setDangHienThi] = useState(false);
  // Giữ Lottie mount đến sau khi animation fade-out hoàn tất, tránh bị cắt đứt giữa chừng
  const [giuLottie, setGiuLottie] = useState(false);
  const lottieTimerRef = useRef(null);
  const giamChuyenDong = useReducedMotion();

  useEffect(() => {
    if (giamChuyenDong) return undefined;
    const controller = new AbortController();

    fetch("/animation/loading.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Loading animation returned ${response.status}`);
        }
        return response.json();
      })
      .then(setLoadingAnimation)
      .catch((error) => {
        if (error.name !== "AbortError") {
          // The text fallback keeps navigation usable when the optional asset fails.
          setLoadingAnimation(null);
        }
      });

    return () => {
      controller.abort();
    };
  }, [giamChuyenDong]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDangHienThi(hienThi);
    }, hienThi ? treHien : LOADING_HIDE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hienThi, treHien]);

  // Mount Lottie khi cần hiện, unmount sau khi fade-out xong
  useEffect(() => {
    if (hienThi) {
      window.clearTimeout(lottieTimerRef.current);
      setGiuLottie(true);
    } else {
      lottieTimerRef.current = window.setTimeout(() => {
        setGiuLottie(false);
      }, LOADING_HIDE_DELAY_MS + MOTION_HIDE_DURATION_MS + 20);
    }

    return () => {
      window.clearTimeout(lottieTimerRef.current);
    };
  }, [hienThi]);

  const hienLottie = giuLottie && loadingAnimation && !giamChuyenDong;

  return (
    <m.div
      className={`page-loading-overlay${dangHienThi ? " page-loading-overlay--visible" : ""}`}
      initial={false}
      animate={{ opacity: dangHienThi ? 1 : 0 }}
      transition={{
        duration: dangHienThi ? 0.16 : 0.14,
        ease: dangHienThi ? [0.16, 1, 0.3, 1] : [0.4, 0, 1, 1],
      }}
      aria-hidden={!dangHienThi}
    >
      <div className="page-loading-overlay__content">
        {hienLottie && (
          <Suspense fallback={null}>
            <Lottie
              animationData={loadingAnimation}
              loop
              autoplay
              className="page-loading-overlay__animation"
            />
          </Suspense>
        )}
        <p className="page-loading-overlay__text">Đang tải...</p>
      </div>
    </m.div>
  );
}

export default PageLoadingOverlay;
