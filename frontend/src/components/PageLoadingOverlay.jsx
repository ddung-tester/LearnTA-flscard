import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";

// lottie-web ~300 KB (80 KB gzip): không nằm trong bundle chính, và không tải lúc mở app — khi đó
// nó tranh băng thông với chính dữ liệu trang. Tải nền lúc rảnh sau khi trang đầu xong; màn chờ
// đã hiện lâu mà chưa có thì mới tải ngay.
let lottieDaTai = false;
const taiLottie = () =>
  import("lottie-react").then((m) => {
    lottieDaTai = true;
    return { default: m.default?.default ?? m.default };
  });
const Lottie = lazy(taiLottie);
const CHO_LOTTIE_KHI_CHUA_TAI_MS = 700;
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
  const [choLauLottie, setChoLauLottie] = useState(false);
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

  // Trang đầu đã tải xong dữ liệu (màn chờ tắt): tải nền lottie lúc rảnh cho các lần chuyển trang sau
  useEffect(() => {
    if (giamChuyenDong || hienThi || lottieDaTai) return undefined;
    const henRanh = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 1500));
    const huyRanh = window.cancelIdleCallback ?? window.clearTimeout;
    let id = 0;
    // Chờ thêm 1 s: trang vừa tắt màn chờ thường còn tải ảnh / chunk phụ
    const timer = window.setTimeout(() => {
      id = henRanh(() => taiLottie().catch(() => {}), { timeout: 5000 });
    }, 1000);
    return () => {
      window.clearTimeout(timer);
      huyRanh(id);
    };
  }, [giamChuyenDong, hienThi]);

  // Màn chờ hiện lâu mà lottie chưa tải nền xong: tải luôn (mạng rất chậm)
  useEffect(() => {
    if (!dangHienThi || lottieDaTai) return undefined;
    const timer = window.setTimeout(() => setChoLauLottie(true), CHO_LOTTIE_KHI_CHUA_TAI_MS);
    return () => window.clearTimeout(timer);
  }, [dangHienThi]);

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

  const hienLottie = giuLottie && loadingAnimation && !giamChuyenDong && (lottieDaTai || choLauLottie);

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
