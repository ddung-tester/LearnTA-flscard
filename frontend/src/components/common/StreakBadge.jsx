/**
 * StreakBadge — Thẻ streak với hiệu ứng lửa cháy toàn bộ thẻ.
 *
 * Khi streak > 0: thẻ sáng lên với gradient amber/orange, viền lửa nhấp nháy,
 * các hạt lửa bay lên từ đáy, text glow. Toàn bộ thẻ "cháy".
 *
 * Props:
 *   streak   (number)  — số ngày học liên tục
 *   size     ("sm"|"md"|"lg") — kích thước
 *   showZero (boolean) — hiển thị khi streak = 0
 */
function StreakBadge({ streak = 0, size = "md", showZero = false }) {
  if (!showZero && streak === 0) return null;

  const isActive = streak > 0;

  const sizeConfig = {
    sm: {
      wrapper: "streak-badge--sm",
      particles: 4,
    },
    md: {
      wrapper: "streak-badge--md",
      particles: 6,
    },
    lg: {
      wrapper: "streak-badge--lg",
      particles: 8,
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      className={[
        "streak-badge",
        config.wrapper,
        isActive ? "streak-badge--active" : "streak-badge--zero",
      ].join(" ")}
      title={isActive ? `${streak} ngày học liên tục 🔥` : "Chưa có streak"}
    >
      {/* Lớp glow nền phía sau */}
      {isActive && <div className="streak-badge__glow" aria-hidden="true" />}

      {/* Các hạt lửa bay lên */}
      {isActive && (
        <div className="streak-badge__particles" aria-hidden="true">
          {Array.from({ length: config.particles }).map((_, i) => (
            <span
              key={i}
              className="streak-particle"
              style={{
                "--p-delay": `${i * (1.8 / config.particles)}s`,
                "--p-x": `${15 + Math.random() * 70}%`,
                "--p-size": `${3 + Math.random() * 4}px`,
                "--p-drift": `${-12 + Math.random() * 24}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Nội dung chính */}
      <div className="streak-badge__content">
        <span className="streak-badge__icon" aria-hidden="true">
          🔥
        </span>
        <span className="streak-badge__number">
          {isActive ? streak : "0"}
        </span>
      </div>
    </div>
  );
}

export default StreakBadge;
