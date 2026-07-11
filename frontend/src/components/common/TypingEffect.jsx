import { useEffect, useMemo, useRef, useState } from "react";

// Timing config — dễ chỉnh sau
const CONFIG = {
  typeMinMs: 65,
  typeMaxMs: 135,
  deleteMinMs: 32,
  deleteMaxMs: 58,
  pauseAfterMs: 1400,
  pauseBeforeMs: 180,
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function useTypingEffect(words) {
  const [displayText, setDisplayText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState("typing");
  const timerRef = useRef(null);
  const normalizedWords = useMemo(
    () => (Array.isArray(words) ? words.map((word) => String(word ?? "")).filter(Boolean) : []),
    [words]
  );

  useEffect(() => {
    if (normalizedWords.length === 0) return undefined;

    const currentWord = normalizedWords[wordIndex % normalizedWords.length];

    function scheduleNext(fn, delay) {
      timerRef.current = setTimeout(fn, delay);
    }

    if (phase === "typing") {
      if (displayText.length < currentWord.length) {
        scheduleNext(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, rand(CONFIG.typeMinMs, CONFIG.typeMaxMs));
      } else {
        scheduleNext(() => setPhase("deleting"), CONFIG.pauseAfterMs);
      }
    }

    if (phase === "deleting") {
      if (displayText.length > 0) {
        scheduleNext(() => {
          setDisplayText((t) => t.slice(0, -1));
        }, rand(CONFIG.deleteMinMs, CONFIG.deleteMaxMs));
      } else {
        scheduleNext(() => {
          setWordIndex((i) => (i + 1) % normalizedWords.length);
          setPhase("typing");
        }, CONFIG.pauseBeforeMs);
      }
    }

    return () => clearTimeout(timerRef.current);
  }, [displayText, normalizedWords, phase, wordIndex]);

  return { displayText: normalizedWords.length > 0 ? displayText : "" };
}

/**
 * TypingEffect — component hiển thị chữ gõ với cursor nhấp nháy.
 * Màu sắc dùng CSS variable của brand để luôn nhất quán với theme.
 */
function TypingEffect({ words, className = "" }) {
  const { displayText } = useTypingEffect(words);

  return (
    <span className={`typing-effect__root ${className}`}>
      <span className="typing-effect__text">{displayText || "\u00A0"}</span>
      <span className="typing-effect__cursor" aria-hidden="true">|</span>
    </span>
  );
}

export default TypingEffect;
