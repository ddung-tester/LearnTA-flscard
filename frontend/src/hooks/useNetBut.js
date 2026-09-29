import { useEffect } from "react";
import { annotate } from "rough-notation";

/**
 * useNetBut — vẽ nét bút tay (khoanh, gạch ngang, gạch chân...) lên phần tử bằng rough-notation.
 * hien: true thì vẽ (sau treMs, chờ animation lắc/bật của phần tử xong để nét không lệch).
 * Giảm chuyển động: nét hiện ngay, không vẽ dần.
 */
export default function useNetBut(ref, hien, { type, color, treMs = 0, strokeWidth = 2, padding = 4 }) {
  useEffect(() => {
    const el = ref.current;
    if (!hien || !el) return undefined;

    const giamChuyenDong = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const net = annotate(el, {
      type,
      color,
      strokeWidth,
      padding,
      animate: !giamChuyenDong,
      animationDuration: 550,
    });
    const henGio = window.setTimeout(() => net.show(), giamChuyenDong ? 0 : treMs);

    return () => {
      window.clearTimeout(henGio);
      net.remove();
    };
  }, [ref, hien, type, color, treMs, strokeWidth, padding]);
}
