import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { layTrangThaiDoc, theoDoiDoc } from "../../services/ttsService";
import { chiSoDangDoc, tachAmTiet } from "../../utils/amTiet";

/**
 * ChuTheoGiong — chữ tiếng Anh nảy lần lượt theo âm tiết khi máy đang đọc đúng đoạn chữ này
 * (âm tiết đã đọc đổi màu mực). Không đọc / giảm chuyển động: hiện chữ bình thường.
 */
function ChuTheoGiong({ text }) {
  const giamChuyenDong = useReducedMotion();
  const trangThai = useSyncExternalStore(theoDoiDoc, layTrangThaiDoc, layTrangThaiDoc);
  const laChuAnh = typeof text === "string" && /^[ -~]+$/.test(text);
  const manh = useMemo(() => (laChuAnh ? tachAmTiet(text) : []), [laChuAnh, text]);
  // Chỉ chữ tiếng Anh (ASCII): tiếng Việt có dấu không tách âm tiết theo cách này
  const dangDocChuNay =
    laChuAnh && !giamChuyenDong && trangThai.dangDoc && trangThai.text.trim() === text.trim();
  const [chiSo, setChiSo] = useState(-1);

  useEffect(() => {
    if (!dangDocChuNay) return undefined;
    let raf = 0;
    const chay = (bayGio) => {
      setChiSo(chiSoDangDoc(manh, layTrangThaiDoc(), bayGio));
      raf = requestAnimationFrame(chay);
    };
    raf = requestAnimationFrame(chay);
    return () => {
      cancelAnimationFrame(raf);
      setChiSo(-1);
    };
  }, [dangDocChuNay, manh]);

  if (!dangDocChuNay || chiSo < 0) return text ?? null;

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {manh.map((p, i) =>
          p.laAmTiet ? (
            <span
              key={i}
              className={`ui-am-tiet${i === chiSo ? " ui-am-tiet--dang" : i < chiSo ? " ui-am-tiet--qua" : ""}`}
            >
              {p.text}
            </span>
          ) : (
            p.text
          )
        )}
      </span>
    </>
  );
}

export default ChuTheoGiong;
