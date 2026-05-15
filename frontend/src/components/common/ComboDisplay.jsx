import { useEffect } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import {
  clampProgressPercent,
  getProgressColor,
} from "../../utils/progressColor";

function ComboDisplay({ combo, phase, progressPercent = 0 }) {
  const visible = combo >= 2;
  const safeProgressPercent = clampProgressPercent(progressPercent);
  const comboColor = getProgressColor(safeProgressPercent);
  const comboControls = useAnimationControls();
  const countControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const shimmerControls = useAnimationControls();
  const waveControls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!visible || phase !== "increment" || reduceMotion) return;

    comboControls.start({
      scale: [1, 1.16, 0.97, 1.06, 1],
      y: [0, -5, 1, -1, 0],
      filter: [
        "saturate(1) brightness(1)",
        "saturate(1.45) brightness(1.18)",
        "saturate(1.18) brightness(1.08)",
        "saturate(1) brightness(1)",
      ],
      boxShadow: [
        "0 2px 8px oklch(23% 0.03 220 / 0.09), inset 0 1px 0 oklch(99% 0.012 94 / 0.72)",
        "0 0 1rem rgb(125 211 252 / 0.44), 0 0 1.35rem rgb(109 40 217 / 0.24), 0 8px 18px oklch(23% 0.03 220 / 0.14), inset 0 1px 0 oklch(99% 0.012 94 / 0.86)",
        "0 0 0.5rem rgb(125 211 252 / 0.2), 0 2px 8px oklch(23% 0.03 220 / 0.1), inset 0 1px 0 oklch(99% 0.012 94 / 0.78)",
        "0 2px 8px oklch(23% 0.03 220 / 0.09), inset 0 1px 0 oklch(99% 0.012 94 / 0.72)",
      ],
      transition: {
        duration: 0.46,
        ease: [0.16, 1, 0.3, 1],
      },
    });

    countControls.start({
      scale: [1, 1.18, 1],
      transition: {
        type: "spring",
        stiffness: 460,
        damping: 15,
        mass: 0.65,
      },
    });
    glowControls.start({
      opacity: [0, 0.85, 0.44, 0],
      scale: [0.92, 1.18, 1.05, 1],
      transition: {
        duration: 0.52,
        ease: [0.16, 1, 0.3, 1],
      },
    });
    shimmerControls.start({
      opacity: [0, 1, 0.62, 0],
      x: ["-130%", "20%", "185%", "290%"],
      transition: {
        duration: 0.56,
        ease: [0.16, 1, 0.3, 1],
      },
    });
    waveControls.start({
      opacity: [0, 0.58, 0.18, 0],
      scaleX: [0.25, 1.05, 1.28, 1.42],
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    });
  }, [
    combo,
    phase,
    visible,
    reduceMotion,
    comboControls,
    countControls,
    glowControls,
    shimmerControls,
    waveControls,
  ]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="combo-badge"
          aria-live="polite"
          aria-atomic="true"
          className={`ui-combo ui-combo--${phase}`}
          animate={comboControls}
          initial={false}
          style={{ "--combo-current-color": comboColor }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        >
          <motion.span
            className="ui-combo__glow"
            animate={glowControls}
            initial={false}
          />
          <motion.span
            className="ui-combo__shimmer"
            animate={shimmerControls}
            initial={false}
          />
          <motion.span
            className="ui-combo__wave"
            animate={waveControls}
            initial={false}
          />
          <span className="ui-combo__icon" aria-hidden="true">
            {"\u26A1"}
          </span>
          <span className="ui-combo__label">
            Combo{" "}
            <motion.span
              className="ui-combo__count"
              animate={countControls}
              initial={false}
            >
              x{combo}
            </motion.span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ComboDisplay;
