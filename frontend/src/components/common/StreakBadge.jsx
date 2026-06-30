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
 *   Lửa Lottie phủ gần toàn thẻ.
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
 *   frozen    boolean          – true → lửa đóng băng (chưa học hôm nay, hôm qua có học)
 *   broken    boolean          – true → streak bị vỡ (bỏ học ≥2 ngày liên tiếp)
 */
function StreakBadge({
  streak = 0,
  size = "md",
  showZero = false,
  className = "",
  label = "",
  fullCard = false,
  frozen = false,
  broken = false,
}) {
  if (!showZero && streak === 0 && !broken) return null;

  const isActive = streak > 0;
  const sizeCls =
    { sm: "streak-badge--sm", md: "streak-badge--md", lg: "streak-badge--lg" }[size] ??
    "streak-badge--md";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lửa đóng băng khi: chưa học hôm nay (frozen=true) hoặc reduced motion
  const firePaused = frozen || prefersReducedMotion;

  // Tooltip text
  const titleText = broken
    ? `Streak bị vỡ 💔 • Hãy học ngay hôm nay để bắt đầu lại!`
    : frozen
    ? `${streak} ngày streak • Hôm nay chưa học — đừng để vỡ!`
    : isActive
    ? `${streak} ngày học liên tục 🔥`
    : "Chưa có streak";

  return (
    <div
      className={[
        "streak-badge",
        sizeCls,
        broken ? "streak-badge--broken" : isActive ? "streak-badge--active" : "streak-badge--zero",
        fullCard ? "streak-badge--full-card" : "",
        fullCard && frozen && !broken ? "streak-badge--frozen" : "",
        fullCard && broken ? "streak-badge--broken-card" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={titleText}
    >
      {/* Glow chỉ cho inline pill active */}
      {isActive && !fullCard && !broken && (
        <div className="streak-badge__glow" aria-hidden="true" />
      )}

      {/*
        FULL-CARD: lửa Lottie phủ gần toàn thẻ — hoặc broken visual
        - Khi broken: hiển thị lửa tắt + overlay crack
        - Khi frozen: đóng băng ở frame đầu + CSS filter màu lạnh
        - Khi active + không frozen: cháy bình thường
      */}
      {fullCard && !broken && (isActive || frozen) && (
        <div
          className={`streak-badge__fire--cover${frozen ? " streak-badge__fire--cover--frozen" : ""}`}
          aria-hidden="true"
        >
          <Lottie
            path="/animation/Fire.json"
            loop={!firePaused}
            autoplay={!firePaused}
            style={{ width: "100%", height: "100%", display: "block" }}
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
          />
        </div>
      )}

      {/* FULL-CARD BROKEN: nền đỏ xám + tim vỡ + overlay crack */}
      {fullCard && broken && (
        <div className="streak-badge__broken-cover" aria-hidden="true">
          {/* Crack overlay SVG */}
          <svg
            className="streak-badge__crack"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points="50,10 42,38 58,42 38,90"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <polyline
              points="58,42 72,60 65,72"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Content: label + số/icon */}
      <div className="streak-badge__content">
        {label && (
          <span className="streak-badge__label" aria-hidden="true">
            {broken ? "STREAK VỠ" : label}
          </span>
        )}

        {broken && fullCard ? (
          /* Tim vỡ lớn cho full-card broken */
          <span className="streak-badge__broken-heart" aria-label="Streak bị vỡ">
            💔
          </span>
        ) : (
          <span className="streak-badge__number">
            {isActive ? streak : "0"}
          </span>
        )}
      </div>
    </div>
  );
}

export default StreakBadge;
