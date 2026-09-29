import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { layGiaoDien, theoDoiGiaoDien } from "../../utils/giaoDien";

/**
 * DenBan — gắn data-giao-dien lên <html> (trang chủ luôn giữ giao diện sáng vì hero 3D
 * tô sương theo nền mật ong) và khi ở chế độ đèn bàn thì:
 * - vũng sáng của đèn trên mặt bàn đi theo con trỏ (biến --den-x/--den-y, CSS vẽ ở nền body),
 * - lớp tối viền màn hình (.den-ban-bong) để phần xa đèn chìm xuống.
 * Màn cảm ứng / giảm chuyển động: đèn treo cố định giữa phía trên.
 */
function DenBan() {
  const { pathname } = useLocation();
  const giaoDien = useSyncExternalStore(theoDoiGiaoDien, layGiaoDien, () => "sang");
  const dangBat = giaoDien === "den-ban" && pathname !== "/";

  useEffect(() => {
    const goc = document.documentElement;
    if (dangBat) goc.dataset.giaoDien = "den-ban";
    else delete goc.dataset.giaoDien;
  }, [dangBat]);

  useEffect(() => {
    if (!dangBat) return undefined;
    const goc = document.documentElement;
    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chuotThat = window.matchMedia("(hover: hover) and (pointer: fine)");
    const viTriTreo = () => ({ x: window.innerWidth / 2, y: window.innerHeight * 0.08 });

    let hienTai = viTriTreo();
    let dich = { ...hienTai };
    let raf = 0;
    const dat = () => {
      goc.style.setProperty("--den-x", `${hienTai.x.toFixed(1)}px`);
      goc.style.setProperty("--den-y", `${hienTai.y.toFixed(1)}px`);
    };
    // Đèn trôi theo con trỏ có quán tính nhẹ, tới nơi thì ngừng vẽ
    const buoc = () => {
      hienTai = { x: hienTai.x + (dich.x - hienTai.x) * 0.14, y: hienTai.y + (dich.y - hienTai.y) * 0.14 };
      dat();
      raf = Math.hypot(dich.x - hienTai.x, dich.y - hienTai.y) > 0.5 ? requestAnimationFrame(buoc) : 0;
    };
    const diTheo = (e) => {
      if (e.pointerType !== "mouse" || !chuotThat.matches || giamChuyenDong.matches) return;
      dich = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(buoc);
    };
    const doiCo = () => {
      if (chuotThat.matches && !giamChuyenDong.matches) return;
      hienTai = dich = viTriTreo();
      dat();
    };

    dat();
    window.addEventListener("pointermove", diTheo, { passive: true });
    window.addEventListener("resize", doiCo);
    return () => {
      window.removeEventListener("pointermove", diTheo);
      window.removeEventListener("resize", doiCo);
      cancelAnimationFrame(raf);
      goc.style.removeProperty("--den-x");
      goc.style.removeProperty("--den-y");
    };
  }, [dangBat]);

  return dangBat ? <div className="den-ban-bong" aria-hidden="true" /> : null;
}

export default DenBan;
