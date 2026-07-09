/**
 * StreakCelebration — Overlay thông báo streak tăng kiểu Duolingo.
 * Hiện khi người dùng học xong và streak tăng lên.
 *
 * Props:
 *   streak   (number) — streak mới (sau khi tăng)
 *   onClose  (fn)     — callback sau khi animation xong
 */
import { useEffect, useRef, useState } from "react";

function FireParticle({ delay, x, size, drift, color }) {
  return (
    <span
      className="streak-cel__particle"
      style={{
        "--p-delay": `${delay}s`,
        "--p-x": `${x}%`,
        "--p-size": `${size}px`,
        "--p-drift": `${drift}px`,
        "--p-color": color,
      }}
    />
  );
}

const COLORS = [
  "oklch(88% 0.18 68)",
  "oklch(78% 0.22 45)",
  "oklch(85% 0.2 55)",
  "oklch(72% 0.25 32)",
  "oklch(90% 0.15 75)",
];

function StreakCelebration({ streak, onClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    // Tự đóng sau 3.5s
    timerRef.current = setTimeout(() => {
      onClose?.();
    }, 3500);

    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      delay: Math.random() * 0.8,
      x: 5 + Math.random() * 90,
      size: 4 + Math.random() * 8,
      drift: -30 + Math.random() * 60,
      color: COLORS[i % COLORS.length],
    }))
  );

  return (
    <div
      className="streak-cel__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Streak ${streak} ngày!`}
      onClick={() => onClose?.()}
    >
      {/* Backdrop */}
      <div className="streak-cel__backdrop" />

      {/* Card chính */}
      <div className="streak-cel__card" onClick={(e) => e.stopPropagation()}>
        {/* Particles bay lên */}
        <div className="streak-cel__particles" aria-hidden="true">
          {particles.map((p, i) => (
            <FireParticle key={i} {...p} />
          ))}
        </div>

        {/* Icon lửa lớn */}
        <div className="streak-cel__fire" aria-hidden="true">
          🔥
        </div>

        {/* Số streak */}
        <div className="streak-cel__number-wrap">
          <span className="streak-cel__number">{streak}</span>
          <span className="streak-cel__unit">ngày</span>
        </div>

        {/* Text */}
        <p className="streak-cel__title">Streak tiếp tục!</p>
        <p className="streak-cel__subtitle">
          Học liên tục <strong>{streak} ngày</strong> rồi đó — đừng dừng lại!
        </p>

        {/* Nút đóng */}
        <button
          type="button"
          className="streak-cel__btn"
          onClick={() => onClose?.()}
          autoFocus
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

export default StreakCelebration;
