import { useEffect, useState } from "react";
import { motion } from "motion/react";
import LottieModule from "lottie-react";

const Lottie = LottieModule.default ?? LottieModule;
const LOADING_REVEAL_DELAY_MS = 120;

function PageLoadingOverlay({ hienThi }) {
  const [loadingAnimation, setLoadingAnimation] = useState(null);
  const [dangHienThi, setDangHienThi] = useState(false);

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
    }, hienThi ? LOADING_REVEAL_DELAY_MS : 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hienThi]);

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
        {dangHienThi && loadingAnimation && (
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
