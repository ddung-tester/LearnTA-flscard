import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { usePageTransition } from "../../contexts/PageTransitionContext";
import { phatAm } from "../../utils/amThanh";

/**
 * TrangLatQua — một tờ giấy kẻ dòng phủ vùng nội dung rồi lật đi như lật sang trang sổ mới
 * (huong 1: lật tới, tờ bay sang trái; -1: lật lui, tờ bay sang phải). Chỉ trang trí:
 * không nhận bấm, tự gọi onXong khi lật xong. Giảm chuyển động: không hiện.
 * Vẽ qua portal ra <body> (trang mới còn ẩn trong lúc màn chờ hiện) và chỉ bắt đầu lật
 * khi màn chờ đã tắt, để người học thấy tờ giấy lật chứ không lật "sau rèm".
 */
function TrangLatQua({ huong, onXong }) {
  const giamChuyenDong = useReducedMotion();
  const { dangChuyenTrang } = usePageTransition();
  const dangLat = !giamChuyenDong && !dangChuyenTrang;

  useEffect(() => {
    if (giamChuyenDong) onXong();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ xét một lần khi hiện
  }, []);

  useEffect(() => {
    if (!dangLat) return undefined;
    phatAm("giay");
    // Dự phòng khi animationend không tới (tab ẩn)
    const hen = window.setTimeout(onXong, 1100);
    return () => window.clearTimeout(hen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi bắt đầu lật
  }, [dangLat]);

  if (giamChuyenDong) return null;

  return createPortal(
    <div className="trang-lat-qua" aria-hidden="true">
      <div
        className={`trang-lat-qua__to trang-lat-qua__to--${huong > 0 ? "toi" : "lui"}${dangLat ? " trang-lat-qua__to--chay" : ""}`}
        onAnimationEnd={onXong}
      />
    </div>,
    document.body
  );
}

export default TrangLatQua;
