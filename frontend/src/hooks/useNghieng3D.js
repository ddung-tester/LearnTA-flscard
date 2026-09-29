import { useCallback, useEffect, useRef } from "react";

/**
 * useNghieng3D — thẻ nghiêng 3D theo con trỏ + vệt sáng chạy theo.
 * Ghi biến CSS (--nghieng-x, --nghieng-y, --sang-x, --sang-y) thẳng lên phần tử,
 * không gây render lại. Dùng kèm class `ui-nghieng-3d` (styles/hieu-ung.css).
 * Tắt trên màn cảm ứng và khi người dùng bật giảm chuyển động.
 *
 * const { nghiengRef, onPointerMove, onPointerLeave } = useNghieng3D({ doNghieng: 8 });
 * <div ref={nghiengRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="ui-nghieng-3d">…</div>
 */
export default function useNghieng3D({ doNghieng = 8, tat = false } = {}) {
  const ref = useRef(null);
  const khungRef = useRef(0);
  const choPhepRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const capNhat = () => {
      choPhepRef.current = mq.matches;
    };
    capNhat();
    mq.addEventListener?.("change", capNhat);
    return () => {
      mq.removeEventListener?.("change", capNhat);
      cancelAnimationFrame(khungRef.current);
    };
  }, []);

  const datLai = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(khungRef.current);
    el.style.setProperty("--nghieng-x", "0deg");
    el.style.setProperty("--nghieng-y", "0deg");
    el.style.setProperty("--sang-o", "0");
    el.removeAttribute("data-dang-nghieng");
  }, []);

  const onPointerMove = useCallback(
    (event) => {
      const el = ref.current;
      if (!el || tat || !choPhepRef.current || event.pointerType !== "mouse") return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(khungRef.current);
      khungRef.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;
        el.setAttribute("data-dang-nghieng", "");
        el.style.setProperty("--nghieng-x", `${((0.5 - py) * doNghieng * 2).toFixed(2)}deg`);
        el.style.setProperty("--nghieng-y", `${((px - 0.5) * doNghieng * 2).toFixed(2)}deg`);
        el.style.setProperty("--sang-x", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--sang-y", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--sang-o", "1");
      });
    },
    [doNghieng, tat],
  );

  useEffect(() => {
    if (tat) datLai();
  }, [tat, datLai]);

  return { nghiengRef: ref, onPointerMove, onPointerLeave: datLai };
}
