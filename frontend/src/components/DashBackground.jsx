import { useEffect, useRef } from "react";
import _LottieModule from "lottie-react";
import animationData from "../../public/animation/background dashboard.json";

const Lottie = _LottieModule?.default ?? _LottieModule;

/**
 * DashBackground — Lottie animation dùng làm nền cho trang Dashboard.
 *
 * Render behind all dashboard content. The animation plays at reduced
 * opacity so it never competes with the readable surface above.
 * Respects prefers-reduced-motion: pauses when user prefers reduced motion.
 */
function DashBackground() {
  const lottieRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    function applyMotionPref() {
      if (!lottieRef.current) return;
      if (mq.matches) {
        lottieRef.current.pause();
      } else {
        lottieRef.current.play();
      }
    }

    applyMotionPref();
    mq.addEventListener("change", applyMotionPref);
    return () => mq.removeEventListener("change", applyMotionPref);
  }, []);

  return (
    <div className="dash-bg" aria-hidden="true">
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop
        autoplay
        className="dash-bg__lottie"
        rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
      />
      {/* Warm paper wash — dims the colorful animation to ~18% visibility */}
      <div className="dash-bg__wash" />
    </div>
  );
}

export default DashBackground;
