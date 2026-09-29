import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { layTrangThaiDoc, theoDoiDoc } from "../../services/ttsService";

const RONG = 160;
const CAO = 36;
const SO_DIEM = 48;
// Ba lớp sóng chồng nhau: tần số, pha, độ mờ khác nhau cho cảm giác giọng nói
const LOP = [
  { tanSo: 2.2, toc: 5.2, cao: 1, mo: 0.9, mau: "var(--mau-chinh)" },
  { tanSo: 3.4, toc: -3.6, cao: 0.7, mo: 0.55, mau: "var(--mau-le-do)" },
  { tanSo: 1.3, toc: 2.4, cao: 0.5, mo: 0.35, mau: "var(--mau-chinh)" },
];

function veDuong(t, bienDo, lop) {
  let d = "";
  for (let i = 0; i <= SO_DIEM; i += 1) {
    const x = i / SO_DIEM;
    // Hai đầu thuôn về 0 để sóng nằm gọn giữa khung
    const thuon = Math.sin(Math.PI * x) ** 1.6;
    const y =
      CAO / 2 +
      Math.sin(x * Math.PI * 2 * lop.tanSo + t * lop.toc) *
        Math.cos(x * Math.PI * 1.3 - t * 1.7) *
        thuon *
        bienDo *
        lop.cao *
        (CAO / 2 - 2);
    d += `${i ? "L" : "M"}${(x * RONG).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/**
 * SongAm — dải sóng âm chạy khi máy đang đọc (Web Speech không cho lấy âm thật, nên biên độ
 * mô phỏng nhịp âm tiết ~4 lần/giây và nảy lên mỗi khi trình duyệt báo sang từ mới).
 * Chỉ hiện khi đang đọc; tắt khi giảm chuyển động.
 */
function SongAm({ className = "" }) {
  const giamChuyenDong = useReducedMotion();
  const trangThai = useSyncExternalStore(theoDoiDoc, layTrangThaiDoc, layTrangThaiDoc);
  const duongRef = useRef([]);
  const svgRef = useRef(null);

  // Biên độ giữ qua các lần effect chạy lại, để đọc xong thì sóng lặng dần chứ không tắt phụt
  const bienDoRef = useRef(0);

  useEffect(() => {
    if (giamChuyenDong) return undefined;
    let raf = 0;
    const ve = (bayGio) => {
      const tt = layTrangThaiDoc();
      const t = bayGio / 1000;
      let dich = 0;
      if (tt.dangDoc) {
        const nhip = Math.abs(Math.sin((bayGio - tt.batDauLuc) / 1000 * Math.PI * 4)) ** 0.7;
        const nay = Math.max(0, 1 - (bayGio - tt.kyTuLuc) / 260);
        dich = Math.min(1, 0.3 + 0.55 * nhip + 0.35 * nay);
      }
      bienDoRef.current += (dich - bienDoRef.current) * 0.18;
      const bienDo = bienDoRef.current;
      LOP.forEach((lop, i) => duongRef.current[i]?.setAttribute("d", veDuong(t, bienDo, lop)));
      if (svgRef.current) svgRef.current.style.opacity = String(Math.min(1, bienDo * 3));
      // Đọc xong và sóng đã lặng thì ngừng vẽ
      if (tt.dangDoc || bienDo > 0.01) raf = requestAnimationFrame(ve);
      else if (svgRef.current) svgRef.current.style.opacity = "0";
    };
    // Chạy cả khi vừa đọc xong: vòng vẽ tự dừng khi sóng đã lặng
    if (trangThai.dangDoc || bienDoRef.current > 0.01) raf = requestAnimationFrame(ve);
    return () => cancelAnimationFrame(raf);
  }, [trangThai.dangDoc, giamChuyenDong]);

  if (giamChuyenDong) return null;

  return (
    <svg
      ref={svgRef}
      className={`ui-song-am ${className}`}
      viewBox={`0 0 ${RONG} ${CAO}`}
      aria-hidden="true"
      style={{ opacity: 0 }}
    >
      {LOP.map((lop, i) => (
        <path
          key={i}
          ref={(el) => {
            duongRef.current[i] = el;
          }}
          d={veDuong(0, 0, lop)}
          fill="none"
          stroke={lop.mau}
          strokeOpacity={lop.mo}
          strokeWidth={i === 0 ? 2.2 : 1.6}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export default SongAm;
