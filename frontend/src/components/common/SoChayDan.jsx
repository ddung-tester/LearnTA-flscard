import { useEffect, useRef, useState } from "react";
import { nguoiDungGiamChuyenDong } from "../../utils/hieuUng";

/**
 * SoChayDan — số đếm dần từ giá trị cũ lên giá trị mới (ease-out).
 * Giá trị không phải số (vd "…", "10g") hiện nguyên văn.
 * Giảm chuyển động: hiện ngay giá trị cuối.
 */
export default function SoChayDan({ value, duration = 900 }) {
  const laSo = typeof value === "number" && Number.isFinite(value);
  const [hienThi, setHienThi] = useState(laSo ? 0 : value);
  const tuRef = useRef(0);

  useEffect(() => {
    if (!laSo) return undefined;
    const tu = tuRef.current;
    tuRef.current = value;
    if (nguoiDungGiamChuyenDong() || tu === value) {
      setHienThi(value);
      return undefined;
    }

    let batDau = null;
    let khung;
    function buoc(t) {
      batDau ??= t;
      const tienDo = Math.min((t - batDau) / duration, 1);
      const eased = 1 - Math.pow(1 - tienDo, 3);
      setHienThi(Math.round(tu + (value - tu) * eased));
      if (tienDo < 1) khung = requestAnimationFrame(buoc);
    }
    khung = requestAnimationFrame(buoc);
    return () => cancelAnimationFrame(khung);
  }, [laSo, value, duration]);

  return <>{laSo ? hienThi : value}</>;
}
