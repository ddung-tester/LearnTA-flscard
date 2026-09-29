import { useLayoutEffect, useRef } from "react";

const THOI_GIAN_MO_MS = 420;
const THOI_GIAN_TAN_MS = 220;
const DUONG_CONG = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * TheMoRong — tờ giấy nở từ thẻ vừa bấm ra kín màn hình (container transform),
 * rồi tan dần để lộ trang mới (hoặc màn chờ cùng màu nền nếu dữ liệu chưa tải xong).
 * khung: { top, left, right, bottom, bo } đo từ getBoundingClientRect của thẻ.
 */
function TheMoRong({ khung, onMoXong, onXong }) {
  const ref = useRef(null);
  const goiLaiRef = useRef({ onMoXong, onXong });

  useLayoutEffect(() => {
    goiLaiRef.current = { onMoXong, onXong };
  });

  useLayoutEffect(() => {
    const el = ref.current;
    const phai = window.innerWidth - khung.right;
    const duoi = window.innerHeight - khung.bottom;
    const tu = `inset(${khung.top}px ${phai}px ${duoi}px ${khung.left}px round ${khung.bo}px)`;

    const mo = el.animate(
      [
        { clipPath: tu, backgroundColor: "var(--mau-giay)", boxShadow: "inset 0 0 0 1px var(--mau-vien-manh)" },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", backgroundColor: "var(--mau-nen)", boxShadow: "inset 0 0 0 0 transparent" },
      ],
      { duration: THOI_GIAN_MO_MS, easing: DUONG_CONG, fill: "forwards" }
    );

    // Dự phòng: animation có thể bị dừng (tab ẩn) — không để trang kẹt sau tờ giấy
    let daMoXong = false;
    const moXong = () => {
      if (daMoXong) return;
      daMoXong = true;
      goiLaiRef.current.onMoXong();
    };
    const henGio = window.setTimeout(() => {
      moXong();
      goiLaiRef.current.onXong();
    }, THOI_GIAN_MO_MS + THOI_GIAN_TAN_MS + 400);

    let tan = null;
    mo.finished
      .then(() => {
        moXong();
        tan = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: THOI_GIAN_TAN_MS,
          easing: "ease-out",
          fill: "forwards",
        });
        return tan.finished;
      })
      .then(() => goiLaiRef.current.onXong())
      .catch(() => {});

    return () => {
      window.clearTimeout(henGio);
      mo.cancel();
      tan?.cancel();
    };
  }, [khung]);

  return <div ref={ref} className="ui-the-mo-rong" aria-hidden="true" />;
}

export default TheMoRong;
