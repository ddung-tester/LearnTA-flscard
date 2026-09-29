import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { phatAm } from "../../utils/amThanh";

const THOI_GIAN_LAT_MS = 620;
// Kéo quá tỉ lệ này của bề ngang trang thì thả tay là lật qua
const NGUONG_KEO = 0.28;

/**
 * SoTayLatTrang — sổ tay gáy lò xo, mỗi lần hiện một trang; lật bằng nút, phím ←/→ hoặc kéo trang.
 * Tờ đang lật xoay 3D quanh gáy (trái): lật tới thì tờ hiện tại bay sang trái để lộ trang sau
 * nằm bên dưới; lật lui thì tờ trước quay về đè lên. Mọi trang chồng cùng một ô lưới nên
 * sổ cao bằng trang dài nhất — lật không làm nhảy bố cục.
 * Giảm chuyển động: đổi trang ngay, không xoay.
 *
 * trang: mảng node (mỗi phần tử một trang). nhan: tên sổ cho trình đọc màn hình.
 */
function SoTayLatTrang({ trang, nhan }) {
  const giamChuyenDong = useReducedMotion();
  const [chiSo, setChiSo] = useState(0);
  // lat: { huong: 1 | -1, goc (độ, 0 = nằm phải, -180 = đã sang trái), dangKeo }
  const [lat, setLat] = useState(null);
  const latRef = useRef(null);
  useLayoutEffect(() => {
    latRef.current = lat;
  });
  const soRef = useRef(null);
  const keoRef = useRef(null);
  const tong = trang.length;

  const coTheLat = (huong) => (huong > 0 ? chiSo < tong - 1 : chiSo > 0);

  function batDauLat(huong) {
    if (lat || !coTheLat(huong)) return;
    phatAm("giay");
    if (giamChuyenDong) {
      setChiSo((i) => i + huong);
      return;
    }
    // Đặt góc xuất phát, khung hình sau mới đặt góc đích để transition chạy
    setLat({ huong, goc: huong > 0 ? 0 : -180, dangKeo: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setLat((cu) => cu && { ...cu, goc: huong > 0 ? -180 : 0 }))
    );
  }

  function xongLat() {
    const cu = latRef.current;
    if (!cu || cu.dangKeo) return;
    const daQua = cu.huong > 0 ? cu.goc <= -179 : cu.goc >= -1;
    latRef.current = null;
    if (daQua) setChiSo((i) => i + cu.huong);
    setLat(null);
  }

  // Dự phòng khi transitionend không tới (tab ẩn, trình duyệt bỏ qua)
  const dangChay = Boolean(lat && !lat.dangKeo);
  const gocDich = lat?.goc;
  useEffect(() => {
    if (!dangChay) return undefined;
    const hen = window.setTimeout(xongLat, THOI_GIAN_LAT_MS + 150);
    return () => window.clearTimeout(hen);
  }, [dangChay, gocDich]);

  useEffect(() => {
    function phim(e) {
      if (e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (!soRef.current || soRef.current.getBoundingClientRect().bottom < 0) return;
      if (e.key === "ArrowRight") batDauLat(1);
      else if (e.key === "ArrowLeft") batDauLat(-1);
    }
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  });

  // Kéo trang: sang trái = lật tới, sang phải = lật lui
  function batDauKeo(e) {
    if (lat || giamChuyenDong || e.button !== 0) return;
    if (e.target.closest("button, a, input, textarea, select")) return;
    keoRef.current = { x: e.clientX, y: e.clientY, rong: soRef.current.offsetWidth, huong: 0, id: e.pointerId };
  }

  function keo(e) {
    const k = keoRef.current;
    if (!k || k.id !== e.pointerId) return;
    const dx = e.clientX - k.x;
    if (!k.huong) {
      // Chưa rõ hướng: chờ kéo ngang đủ xa (kéo dọc để cuộn trang thì bỏ)
      if (Math.abs(e.clientY - k.y) > 12 && Math.abs(dx) < 12) {
        keoRef.current = null;
        return;
      }
      if (Math.abs(dx) < 12) return;
      const huong = dx < 0 ? 1 : -1;
      if (!coTheLat(huong)) {
        keoRef.current = null;
        return;
      }
      k.huong = huong;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const tiLe = Math.min(1, Math.max(0, (k.huong > 0 ? -dx : dx) / k.rong));
    setLat({ huong: k.huong, goc: k.huong > 0 ? -180 * tiLe : -180 + 180 * tiLe, dangKeo: true });
  }

  function tha(e) {
    const k = keoRef.current;
    keoRef.current = null;
    if (!k || !k.huong) return;
    const dx = e.clientX - k.x;
    const tiLe = (k.huong > 0 ? -dx : dx) / k.rong;
    const qua = tiLe > NGUONG_KEO;
    if (qua) phatAm("giay");
    const dich = k.huong > 0 ? (qua ? -180 : 0) : qua ? 0 : -180;
    setLat((cu) => cu && { ...cu, goc: dich, dangKeo: false });
  }

  // Trang nằm dưới và tờ đang lật
  let chiSoDuoi = chiSo;
  let chiSoTo = null;
  if (lat) {
    chiSoDuoi = lat.huong > 0 ? chiSo + 1 : chiSo;
    chiSoTo = lat.huong > 0 ? chiSo : chiSo - 1;
  }
  const goc = lat?.goc ?? 0;
  // Bóng đổ: đậm nhất khi tờ dựng đứng (-90°)
  const doBong = lat ? Math.sin((Math.abs(goc) * Math.PI) / 180) : 0;

  return (
    <div className="so-tay" role="group" aria-roledescription="sổ tay" aria-label={nhan}>
      <div
        ref={soRef}
        className="so-tay__khung"
        onPointerDown={batDauKeo}
        onPointerMove={keo}
        onPointerUp={tha}
        onPointerCancel={tha}
      >
        <div className="so-tay__lo-xo" aria-hidden="true" />
        <div className="so-tay__mep" aria-hidden="true" />
        <div className="so-tay__chong">
          {trang.map((noiDung, i) => {
            const laDuoi = i === chiSoDuoi;
            const laTo = i === chiSoTo;
            return (
              <div
                key={i}
                className={`so-tay__trang${laTo ? " so-tay__trang--to" : ""}${laTo && !lat.dangKeo ? " so-tay__trang--chay" : ""}${!laDuoi && !laTo ? " so-tay__trang--an" : ""}`}
                aria-hidden={laDuoi && !lat ? undefined : true}
                inert={laDuoi && !lat ? undefined : true}
                style={laTo ? { transform: `rotateY(${goc}deg)` } : undefined}
                onTransitionEnd={laTo ? (e) => e.propertyName === "transform" && xongLat() : undefined}
              >
                <div className="so-tay__mat so-tay__mat--truoc">
                  {noiDung}
                  <p className="so-tay__so-trang" aria-hidden="true">
                    {i + 1} / {tong}
                  </p>
                  {laTo && <span className="so-tay__bong-to" style={{ opacity: doBong * 0.5 }} aria-hidden="true" />}
                </div>
                {laTo && <div className="so-tay__mat so-tay__mat--sau" aria-hidden="true" />}
                {laDuoi && lat && (
                  <span className="so-tay__bong-duoi" style={{ opacity: doBong * 0.55 }} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="so-tay__dieu-khien">
        <button type="button" className="so-tay__nut" onClick={() => batDauLat(-1)} disabled={chiSo === 0}>
          ‹ Trang trước
        </button>
        <span className="so-tay__cham" aria-live="polite">
          <span className="sr-only">
            Trang {chiSo + 1} trên {tong}
          </span>
          {trang.map((_, i) => (
            <span key={i} className={`so-tay__cham-o${i === chiSo ? " so-tay__cham-o--dang" : ""}`} aria-hidden="true" />
          ))}
        </span>
        <button type="button" className="so-tay__nut" onClick={() => batDauLat(1)} disabled={chiSo === tong - 1}>
          Trang sau ›
        </button>
      </div>
    </div>
  );
}

export default SoTayLatTrang;
