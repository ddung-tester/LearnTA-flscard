import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import LottieModule from "lottie-react";

const Lottie = LottieModule.default ?? LottieModule;
const LOADING_REVEAL_DELAY_MS = 120;
// Trì hoãn nhỏ khi ẩn overlay: safety net cho double-rAF bridge,
// tránh flicker nếu data-loading key chưa kịp đăng ký trên thiết bị chậm.
const LOADING_HIDE_DELAY_MS = 50;
// Thời gian fade-out của motion animation (ms) — Lottie được unmount sau khi fade xong
const MOTION_HIDE_DURATION_MS = 140;

function PageLoadingOverlay({ hienThi }) {
  const [loadingAnimation, setLoadingAnimation] = useState(null);
  const [dangHienThi, setDangHienThi] = useState(false);
  // Giữ Lottie mount đến sau khi animation fade-out hoàn tất, tránh bị cắt đứt giữa chướng
  const [giuLottie, setGiuLottie] = useState(false);
  const lottieTimerRef = useRef(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDangHienThi(hienThi);
    }, hienThi ? LOADING_REVEAL_DELAY_MS : LOADING_HIDE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hienThi]);

  // Quản lý vòng đời Lottie độc lập: mount khi cần hiện, unmount
  // sau khi motion fade-out hoàn tất (không bị cắt đứt giữa animation)
  useEffect(() => {
    if (hienThi) {
      // Hiện thị: mount Lottie ngay, hủy bất kỳ timer unmount nào đang chờ
      window.clearTimeout(lottieTimerRef.current);
      setGiuLottie(true);
    } else {
      // Ẩn: đợi animation fade-out xong mới unmount Lottie
      lottieTimerRef.current = window.setTimeout(() => {
        setGiuLottie(false);
      }, LOADING_HIDE_DELAY_MS + MOTION_HIDE_DURATION_MS + 20); // buffer nhỏ
    }

    return () => {
      window.clearTimeout(lottieTimerRef.current);
    };
  }, [hienThi]);

  const hienLottie = giuLottie && loadingAnimation;

  return (
    <motion.div
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
          <Lottie
            animationData={loadingAnimation}
            loop
            autoplay
            className="page-loading-overlay__animation"
          />
        )}
        <p className="page-loading-overlay__text">Đang tải...</p>
      </div>
    </motion.div>
  );
}

export default PageLoadingOverlay;

