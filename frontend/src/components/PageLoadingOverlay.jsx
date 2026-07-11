import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import LottieModule from "lottie-react";

const Lottie = LottieModule.default ?? LottieModule;

function PageLoadingOverlay({ hienThi }) {
  const [loadingAnimation, setLoadingAnimation] = useState(null);

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

  return (
    <AnimatePresence>
      {hienThi && (
        <motion.div
          className="page-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={{
            opacity: 0,
            transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          <div className="page-loading-overlay__content">
            {loadingAnimation && (
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
      )}
    </AnimatePresence>
  );
}

export default PageLoadingOverlay;
