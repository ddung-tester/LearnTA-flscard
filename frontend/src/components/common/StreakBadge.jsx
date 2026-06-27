import _LottieModule from "lottie-react";

// lottie-react là CJS module; Vite đôi khi wrap thành { default: Fn }.
const Lottie = _LottieModule?.default ?? _LottieModule;

/**
 * StreakBadge — Thẻ hiển thị ngày học liên tục.
 *
 * Inline (sm/md/lg):
 *   Pill ngang, amber gradient, CHỈ hiện số — không có icon lửa.
 *   Dùng ở header, settings, v.v.
 *
 * Full-card (fullCard=true):
 *   Lửa Lottie phủ gần toàn thẻ (inset 8px — amber viền mỏng quanh).
 *   Label "STREAK" + số nổi trên lửa (z-index cao hơn).
 *   Dùng ở thẻ stat trên trang chi tiết bộ từ.
 *
 * Props:
 *   streak    number           – ngày học liên tục
 *   size      "sm"|"md"|"lg"  – kích thước inline
 *   showZero  boolean          – hiển thị khi streak = 0
 *   className string           – class bổ sung
 *   label     string           – nhãn nhỏ (full-card mode)
 *   fullCard  boolean          – true → lửa Lottie fill thẻ stat
 */
function StreakBadge({
  streak = 0,
  size = "md",
  showZero = false,
  className = "",
  label = "",
  fullCard = false,
}) {
  if (!showZero && streak === 0) return null;

  const isActive = streak > 0;
  const sizeCls =
    { sm: "streak-badge--sm", md: "streak-badge--md", lg: "streak-badge--lg" }[size] ??
    "streak-badge--md";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className={[
        "streak-badge",
        sizeCls,
        isActive ? "streak-badge--active" : "streak-badge--zero",
        fullCard ? "streak-badge--full-card" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={isActive ? `${streak} ngày học liên tục 🔥` : "Chưa có streak"}
    >
      {/* Glow chỉ cho inline pill */}
      {isActive && !fullCard && (
        <div className="streak-badge__glow" aria-hidden="true" />
      )}

      {/*
        FULL-CARD ONLY: lửa Lottie phủ gần toàn thẻ.
        inset: 8px → để lộ viền amber mỏng xung quanh.
        xMidYMid slice → fill chiều ngang thẻ, crop dọc.
      */}
      {isActive && fullCard && (
        <div className="streak-badge__fire--cover" aria-hidden="true">
          <Lottie
            path="/animation/Fire.json"
            loop={!prefersReducedMotion}
            autoplay={!prefersReducedMotion}
            style={{ width: "100%", height: "100%", display: "block" }}
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
          />
        </div>
      )}

      {/* Content: label (full-card) + số */}
      <div className="streak-badge__content">
        {label && (
          <span className="streak-badge__label" aria-hidden="true">
            {label}
          </span>
        )}

        {/* Số ngày — inline chỉ hiện số, fullCard có lửa phía sau */}
        <span className="streak-badge__number">
          {isActive ? streak : "0"}
        </span>
      </div>
    </div>
  );
}

export default StreakBadge;
