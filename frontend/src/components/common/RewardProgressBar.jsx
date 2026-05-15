import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  clampProgressPercent,
  getProgressColor,
} from "../../utils/progressColor";

function RewardProgressBar({
  currentValue,
  totalValue,
  progressPercent,
  phase = "idle",
  endpointRef,
  label = "Tiến độ",
  combo = 0,
}) {
  // Clamp combo intensity 0–8 for CSS scaling
  const comboLevel = Math.min(combo, 8);
  const safeProgressPercent = clampProgressPercent(progressPercent);
  const progressScale = safeProgressPercent / 100;
  const progressColor = getProgressColor(safeProgressPercent);
  const trackControls = useAnimationControls();
  const fillControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const shimmerControls = useAnimationControls();
  const waveControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const previousProgressRef = useRef(null);

  useEffect(() => {
    const previousProgress = previousProgressRef.current;

    if (
      previousProgress !== null &&
      safeProgressPercent > previousProgress &&
      !reduceMotion
    ) {
      trackControls.start({
        scale: [1, 1.035, 0.992, 1],
        y: [0, -1, 0.5, 0],
        boxShadow: [
          "inset 0 1px 0 oklch(99% 0.012 94 / 0.78), inset 0 -1px 0 rgb(76 29 149 / 0.1), 0 2px 8px oklch(23% 0.03 220 / 0.07)",
          "inset 0 1px 0 oklch(99% 0.012 94 / 0.86), inset 0 -1px 0 rgb(76 29 149 / 0.16), 0 0 1rem rgb(125 211 252 / 0.26), 0 8px 18px oklch(23% 0.03 220 / 0.12)",
          "inset 0 1px 0 oklch(99% 0.012 94 / 0.8), inset 0 -1px 0 rgb(76 29 149 / 0.12), 0 0 0.42rem rgb(125 211 252 / 0.12), 0 2px 8px oklch(23% 0.03 220 / 0.08)",
          "inset 0 1px 0 oklch(99% 0.012 94 / 0.78), inset 0 -1px 0 rgb(76 29 149 / 0.1), 0 2px 8px oklch(23% 0.03 220 / 0.07)",
        ],
        transition: {
          duration: 0.42,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      fillControls.start({
        scaleY: [1, 1.48, 0.9, 1.12, 1],
        y: [0, -1.5, 0, -0.5, 0],
        filter: [
          "saturate(1) brightness(1)",
          "saturate(1.55) brightness(1.28)",
          "saturate(1.24) brightness(1.12)",
          "saturate(1.12) brightness(1.06)",
          "saturate(1) brightness(1)",
        ],
        boxShadow: [
          "0 0 0 rgb(125 211 252 / 0), inset 0 1px 0 oklch(99% 0.012 94 / 0.4)",
          "0 0 1.1rem rgb(125 211 252 / 0.62), 0 0 1.55rem rgb(109 40 217 / 0.32), inset 0 1px 0 oklch(99% 0.012 94 / 0.62)",
          "0 0 0.68rem rgb(125 211 252 / 0.38), 0 0 0.9rem rgb(109 40 217 / 0.18), inset 0 1px 0 oklch(99% 0.012 94 / 0.5)",
          "0 0 0 rgb(125 211 252 / 0), inset 0 1px 0 oklch(99% 0.012 94 / 0.4)",
        ],
        transition: {
          duration: 0.46,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      glowControls.start({
        opacity: [0, 0.95, 0.5, 0],
        scaleY: [1, 1.75, 1.22, 1],
        transition: {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      shimmerControls.start({
        opacity: [0, 1, 0.72, 0],
        x: ["-120%", "35%", "210%", "330%"],
        skewX: [-16, -12, -10, -10],
        transition: {
          duration: 0.56,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      waveControls.start({
        opacity: [0, 0.72, 0.28, 0],
        scaleX: [0.2, 1.08, 1.35, 1.5],
        transition: {
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        },
      });
    }

    previousProgressRef.current = safeProgressPercent;
  }, [
    safeProgressPercent,
    reduceMotion,
    trackControls,
    fillControls,
    glowControls,
    shimmerControls,
    waveControls,
  ]);

  return (
    <div
      className="ui-reward-progress"
      style={{ "--progress-current-color": progressColor }}
    >
      <div className="ui-reward-progress__meta">
        <span className="ui-reward-progress__label">{label}</span>
        <span className="ui-reward-progress__value">
          {currentValue}/{totalValue}
        </span>
      </div>
      <motion.div
        className={`ui-reward-progress__track ui-reward-progress--${phase}`}
        animate={trackControls}
        initial={false}
        style={{ "--combo-level": comboLevel, transformOrigin: "center" }}
      >
        <motion.div
          className="ui-progress-fill ui-reward-progress__fill"
          animate={fillControls}
          initial={false}
          style={{
            "--progress-scale": progressScale,
            "--progress-gradient-scale": Math.max(progressScale, 0.01),
            transformOrigin: "center",
          }}
        >
          <span className="ui-reward-progress__fill-core" />
          <motion.span
            className="ui-reward-progress__glow"
            animate={glowControls}
            initial={false}
          />
          <motion.span
            className="ui-reward-progress__shimmer"
            animate={shimmerControls}
            initial={false}
          />
          <motion.span
            className="ui-reward-progress__wave"
            animate={waveControls}
            initial={false}
          />
        </motion.div>
        <span
          ref={endpointRef}
          className="ui-reward-progress__endpoint"
          style={{
            "--progress-scale": progressScale,
            opacity: safeProgressPercent > 0 ? 1 : 0,
          }}
        />
      </motion.div>
    </div>
  );
}

export default RewardProgressBar;
