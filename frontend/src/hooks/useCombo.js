import { useCallback, useEffect, useRef, useState } from "react";

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
  const comboRef = useRef(0);
  const phaseTimerRef = useRef(null);

  function clearPhaseTimer() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  const incrementCombo = useCallback(() => {
    clearPhaseTimer();
    const next = comboRef.current + 1;
    comboRef.current = next;
    setCombo(next);
    setMaxCombo((max) => Math.max(max, next));
    setComboPhase("increment");
    phaseTimerRef.current = setTimeout(() => {
      setComboPhase("idle");
      phaseTimerRef.current = null;
    }, 600);
  }, []);

  const resetCombo = useCallback(() => {
    if (comboRef.current === 0) return;

    comboRef.current = 0;
    setCombo(0);
    clearPhaseTimer();
    setComboPhase("break");
    phaseTimerRef.current = setTimeout(() => {
      setComboPhase("idle");
      phaseTimerRef.current = null;
    }, 700);
  }, []);

  const resetAll = useCallback(() => {
    clearPhaseTimer();
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setComboPhase("idle");
  }, []);

  useEffect(() => () => {
    clearPhaseTimer();
  }, []);

  return { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll };
}

export default useCombo;
