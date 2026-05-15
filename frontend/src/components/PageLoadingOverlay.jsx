import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import LottieModule from "lottie-react";

const Lottie = LottieModule.default ?? LottieModule;

function PageLoadingOverlay({ hienThi }) {
  const [loadingAnimation, setLoadingAnimation] = useState(null);

  useEffect(() => {
    let daHuy = false;

    fetch("/animation/loading.json")
      .then((response) => response.json())
      .then((animation) => {
        if (!daHuy) {
          setLoadingAnimation(animation);
        }
      });

    return () => {
      daHuy = true;
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
            transition: { duration: 0.48, ease: [0.4, 0, 0.2, 1] },
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
