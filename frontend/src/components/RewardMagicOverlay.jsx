import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { phatAm } from "../utils/amThanh";
import { clipTuDiem, diemMepChay, em, taoDongCo, taoDuongBay } from "./reward/dongCoPhepThuat";
import "./RewardMagicOverlay.css";

/*
 * Hiệu ứng thưởng "mực vàng bốc lửa":
 *  tụ phép ở đầu thanh tiến độ (chờ video sẵn sàng) → sao chổi bay cong → nổ → cổng video bị đốt thủng
 *  từ giữa ra → phát video trong khung viền vàng xoay. Đóng: lỗ cháy khép lại, đốm lửa bay về thanh tiến độ.
 */

const THOI_GIAN = { tu: 420, bay: 720, mo: 640, dong: 360, ve: 380 };
const BAN_KINH_CONG = 22;

const TENSE_LABEL = {
  present_simple: "Hiện tại đơn",
  present_continuous: "Hiện tại tiếp diễn",
  past_simple: "Quá khứ đơn",
};

function layDiemNguon(originRect) {
  if (!originRect) return { x: window.innerWidth / 2, y: window.innerHeight * 0.18 };

  const laMarkerNho = originRect.width <= 16 && originRect.height <= 16;
  const xNguon = laMarkerNho ? originRect.left + originRect.width / 2 : originRect.right;

  return {
    x: Math.min(Math.max(xNguon, 24), window.innerWidth - 24),
    y: Math.min(Math.max(originRect.top + originRect.height / 2, 24), window.innerHeight - 24),
  };
}

function RewardMagicOverlay({
  active,
  sequenceKey = 0,
  fadeOut = false,
  hasError = false,
  videoSrc = "",
  videoReady = false,
  originRect = null,
  canvasRefs,
  videoNode = null,
  onPortalOpen,
  onComplete,
  compact = false,
  combo = 0,
  tenseExamples = null,
}) {
  const rootRef = useRef(null);
  const manRef = useRef(null);
  const fxRef = useRef(null);
  const congRefs = useRef({});
  const longRefs = useRef({});
  const dongCoRef = useRef(null);
  const vongRef = useRef(0);
  const daMoRef = useRef(false);
  const moiNhatRef = useRef({});
  const [portalDaMo, setPortalDaMo] = useState(false);
  const [prevSeqKey, setPrevSeqKey] = useState(sequenceKey);

  if (sequenceKey !== prevSeqKey) {
    setPrevSeqKey(sequenceKey);
    setPortalDaMo(false);
  }

  // Vòng vẽ đọc giá trị mới nhất mà không phải dựng lại kịch bản mỗi lần props đổi
  useLayoutEffect(() => {
    moiNhatRef.current = { videoReady, hasError, onPortalOpen, onComplete, originRect, combo };
  });

  const viTris = compact ? ["center"] : ["left", "right"];

  function layCacCong() {
    return viTris
      .map((vt) => ({ vt, wrap: congRefs.current[vt], long: longRefs.current[vt] }))
      .filter((c) => c.wrap && c.long)
      .map((c) => {
        const r = c.wrap.getBoundingClientRect();
        return { ...c, rect: r, tam: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, rMax: Math.hypot(r.width, r.height) / 2 };
      });
  }

  function catVong() {
    window.cancelAnimationFrame(vongRef.current);
    vongRef.current = 0;
  }

  /** Chạy một kịch bản theo từng khung; tắt canvas khi kịch bản xong và hạt đã tàn */
  function chay(buoc) {
    const canvas = fxRef.current;
    if (!canvas) return;
    dongCoRef.current ??= taoDongCo(canvas);
    const dongCo = dongCoRef.current;
    catVong();
    dongCo.doKichThuoc();
    canvas.style.display = "block";

    let truoc = performance.now();
    const batDau = truoc;
    const khung = (now) => {
      const dt = Math.min(40, now - truoc);
      truoc = now;
      dongCo.capNhat(dt);
      dongCo.ve();
      const conChay = buoc(now - batDau, dt, dongCo);
      if (conChay || dongCo.conHat()) {
        vongRef.current = window.requestAnimationFrame(khung);
      } else {
        dongCo.xoaHet();
        canvas.style.display = "none";
        vongRef.current = 0;
      }
    };
    vongRef.current = window.requestAnimationFrame(khung);
  }

  function veLoChay(cacCong, R, bienDo, pha, dongCo) {
    for (const c of cacCong) {
      const ds = diemMepChay(c.tam, R, bienDo, pha);
      c.long.style.clipPath = clipTuDiem(ds, c.rect);
      dongCo.veMepChay(ds, c.rect, c.tam, BAN_KINH_CONG);
    }
  }

  // Mở thưởng
  useEffect(() => {
    if (!active || !rootRef.current) return undefined;

    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const man = manRef.current;
    const cacCong = layCacCong();
    daMoRef.current = false;
    rootRef.current.style.opacity = "";
    man.style.opacity = "0";
    for (const c of cacCong) {
      c.wrap.classList.remove("reward-magic__cong--mo");
      c.long.style.clipPath = "";
    }

    const moCong = () => {
      if (daMoRef.current) return;
      daMoRef.current = true;
      for (const c of cacCong) {
        c.long.style.clipPath = "none";
        c.wrap.classList.add("reward-magic__cong--mo");
      }
      moiNhatRef.current.onPortalOpen?.();
      setPortalDaMo(true);
    };

    if (giamChuyenDong) {
      man.style.opacity = "1";
      const id = window.setTimeout(moCong, 160);
      return () => window.clearTimeout(id);
    }

    const nguon = layDiemNguon(moiNhatRef.current.originRect);
    const k = 1 + Math.min(moiNhatRef.current.combo || 0, 10) * 0.06;
    const phaMep = Math.random() * 10;
    let pha = "tu";
    let moc = 0;

    chay((t, dt, dongCo) => {
      if (pha === "tu") {
        man.style.opacity = String(Math.min(1, t / 320));
        dongCo.tuNangLuong(nguon, t, dt, k);
        const { videoReady: sanSang, hasError: loi } = moiNhatRef.current;
        if (t >= THOI_GIAN.tu && (sanSang || loi)) {
          pha = "bay";
          moc = t;
          phatAm("phepBay");
          for (const c of cacCong) {
            c.duong = taoDuongBay(nguon, c.tam, compact ? "s" : "cung");
            c.truoc = nguon;
            c.vet = [];
          }
        }
        return true;
      }

      if (pha === "bay") {
        man.style.opacity = "1";
        const u = Math.min(1, (t - moc) / THOI_GIAN.bay);
        for (const c of cacCong) {
          const p = c.duong(em.vaoRa(u));
          dongCo.veSaoChoi(c.truoc, p, c.vet, t, k);
          c.truoc = p;
        }
        if (u >= 1) {
          for (const c of cacCong) dongCo.no(c.tam, k);
          phatAm("phepNo");
          pha = "mo";
          moc = t;
        }
        return true;
      }

      if (pha === "mo") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.mo);
        const bienDo = 18 * (1 - v) + 3;
        const rMax = Math.max(...cacCong.map((c) => c.rMax));
        veLoChay(cacCong, em.raLapPhuong(v) * (rMax + bienDo + 4), bienDo, t * 0.005 + phaMep, dongCo);
        if (v >= 1) {
          moCong();
          pha = "xong";
        }
        return true;
      }

      return false;
    });

    return catVong;
    // Kịch bản chỉ dựng lại khi có lượt thưởng mới; giá trị khác đọc qua moiNhatRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sequenceKey, compact]);

  // Đóng thưởng (RewardTikTokEffect gỡ overlay sau fadeOutMs = 1 s, nên cả chuỗi gói trong ~0,95 s)
  useEffect(() => {
    if (!fadeOut || !rootRef.current) return undefined;

    const root = rootRef.current;
    const man = manRef.current;
    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (giamChuyenDong) {
      catVong();
      root.style.transition = "opacity 180ms ease";
      root.style.opacity = "0";
      const id = window.setTimeout(() => moiNhatRef.current.onComplete?.(), 200);
      return () => window.clearTimeout(id);
    }

    const cacCong = layCacCong();
    const nguon = layDiemNguon(moiNhatRef.current.originRect);
    const k = 1 + Math.min(moiNhatRef.current.combo || 0, 10) * 0.06;
    const rMax = Math.max(0, ...cacCong.map((c) => c.rMax));
    const phaMep = Math.random() * 10;
    // Cổng chưa kịp mở (đóng sớm) thì không có gì để khép — chỉ tắt đèn
    let pha = daMoRef.current ? "dong" : "het";
    let moc = 0;
    for (const c of cacCong) c.wrap.classList.remove("reward-magic__cong--mo");

    chay((t, dt, dongCo) => {
      if (pha === "dong") {
        const v = Math.min(1, t / THOI_GIAN.dong);
        const bienDo = 3 + 15 * v;
        veLoChay(cacCong, (1 - em.vaoLapPhuong(v)) * (rMax + bienDo + 4), bienDo, t * 0.005 + phaMep, dongCo);
        if (v >= 1) {
          for (const c of cacCong) {
            c.long.style.clipPath = "";
            dongCo.chop(c.tam, k);
            c.duong = taoDuongBay(c.tam, nguon, compact ? "s" : "cung");
            c.truoc = c.tam;
            c.vet = [];
          }
          pha = "ve";
          moc = t;
        }
        return true;
      }

      if (pha === "ve") {
        const u = Math.min(1, (t - moc) / THOI_GIAN.ve);
        for (const c of cacCong) {
          const p = c.duong(em.vaoLapPhuong(u) * 0.35 + u * 0.65);
          dongCo.veSaoChoi(c.truoc, p, c.vet, t, k * 0.62);
          c.truoc = p;
        }
        if (u >= 1) {
          dongCo.chamVe(nguon, k);
          pha = "het";
          moc = t;
        }
      }

      man.style.opacity = String(Math.min(1, Math.max(0, 1 - (t - 640) / 300)));
      if (pha === "het" && t - moc > 200 && t > 940) {
        moiNhatRef.current.onComplete?.();
        return false;
      }
      return true;
    });

    return catVong;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeOut]);

  useEffect(() => catVong, []);

  function luuCanvas(viTri, node) {
    if (!canvasRefs?.current) return;

    if (node) {
      // eslint-disable-next-line react-hooks/immutability -- callback ref populating a ref map (correct pattern)
      canvasRefs.current[viTri] = node;
    } else {
      delete canvasRefs.current[viTri];
    }
  }

  if (!active) return null;

  return (
    <div ref={rootRef} className={`reward-magic ${compact ? "reward-magic--compact" : ""}`} aria-hidden="true">
      <div ref={manRef} className="reward-magic__man" />

      {viTris.map((viTri) => (
        <div
          key={viTri}
          className={`reward-magic__cong reward-magic__cong--${viTri}`}
          ref={(node) => {
            congRefs.current[viTri] = node;
          }}
        >
          <div className="reward-magic__hao-quang" />
          <div
            className="reward-magic__long"
            ref={(node) => {
              longRefs.current[viTri] = node;
            }}
          >
            <div className="reward-magic__vien" />
            <div className="reward-magic__media">
              {hasError || !videoSrc ? (
                <div className="reward-magic__fallback" />
              ) : (
                videoNode ?? <canvas ref={(node) => luuCanvas(viTri, node)} className="reward-magic__canvas" />
              )}
            </div>
          </div>
        </div>
      ))}

      <canvas ref={fxRef} className="reward-magic__fx" />

      {/* Câu gợi ý 3 thì (máy tính) — trượt vào phần dưới mỗi cổng sau khi cổng mở */}
      {!compact &&
        ["left", "right"].map((viTri) => {
          const cauList =
            viTri === "left" ? [tenseExamples?.[0]].filter(Boolean) : [tenseExamples?.[1], tenseExamples?.[2]].filter(Boolean);
          const hienThi = portalDaMo && cauList.length > 0;
          const xFrom = viTri === "left" ? "-110%" : "110%";

          return (
            <div key={viTri} className={`reward-magic__tense-panel reward-magic__tense-panel--${viTri}`}>
              <AnimatePresence>
                {hienThi &&
                  cauList.map((item, i) => (
                    <motion.div
                      key={`${item.tense}-${viTri}`}
                      className="reward-magic__tense-item"
                      initial={{ opacity: 0, x: xFrom }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: xFrom }}
                      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.8, delay: i * 0.12 }}
                    >
                      <span className="reward-magic__tense-badge">{TENSE_LABEL[item.tense] || item.tense}</span>
                      {item.formula && <span className="reward-magic__tense-formula">{item.formula}</span>}
                      <p className="reward-magic__tense-sentence">{item.sentence}</p>
                      {item.translation && <p className="reward-magic__tense-translation">{item.translation}</p>}
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          );
        })}
    </div>
  );
}

export default RewardMagicOverlay;
