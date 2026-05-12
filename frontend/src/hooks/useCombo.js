import { useCallback, useRef, useState } from "react";

/**
 * useCombo — quản lý combo state cho learning modes.
 *
 * Returns:
 *   combo        - số combo hiện tại
 *   maxCombo     - combo cao nhất trong session
 *   comboPhase   - "idle" | "increment" | "break"
 *   incrementCombo() - gọi khi trả lời đúng
 *   resetCombo()     - gọi khi trả lời sai / bỏ qua
 *   resetAll()       - gọi khi làm lại / đổi chế độ
 */
function useCombo() {
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboPhase, setComboPhase] = useState("idle");
  const phaseTimerRef = useRef(null);

  function clearPhaseTimer() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  const incrementCombo = useCallback(() => {
    clearPhaseTimer();
    setCombo((prev) => {
      const next = prev + 1;
      setMaxCombo((max) => Math.max(max, next));
      return next;
    });
    setComboPhase("increment");
    phaseTimerRef.current = setTimeout(() => {
      setComboPhase("idle");
      phaseTimerRef.current = null;
    }, 600);
  }, []);

  const resetCombo = useCallback(() => {
    setCombo((prev) => {
      if (prev === 0) return 0; // đã 0 rồi, không cần break
      clearPhaseTimer();
      setComboPhase("break");
      phaseTimerRef.current = setTimeout(() => {
        setComboPhase("idle");
        phaseTimerRef.current = null;
      }, 700);
      return 0;
    });
  }, []);

  const resetAll = useCallback(() => {
    clearPhaseTimer();
    setCombo(0);
    setMaxCombo(0);
    setComboPhase("idle");
  }, []);

  return { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll };
}

export default useCombo;
