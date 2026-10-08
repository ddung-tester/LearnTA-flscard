import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { phatAm } from "../utils/amThanh";
import { em, taoDongCo, taoDuongBay } from "./reward/dongCoPhepThuat";
import "./RewardMagicOverlay.css";

/*
 * Hiệu ứng thưởng "rạch sáng":
 *  tụ năng lượng ở đầu thanh tiến độ (chờ video sẵn sàng) → tia năng lượng lụa bay cong → chạm đích bùng tia thần
 *  → một đường sáng dọc rạch đôi cổng, từ vừa làm đúng hiện giữa đường rạch → hai mép sáng tách sang hai bên lộ video.
 *  Đóng: hai mép khép về giữa, đường rạch thu thành đốm, đốm sáng bay về thanh tiến độ.
 */

const THOI_GIAN = { tu: 420, bay: 640, rach: 520, mo: 560, dong: 300, thu: 120, ve: 360 };
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
  // Thẻ <video> gốc cho từng cổng ({ center } hoặc { left, right }): phần cứng giải mã + vẽ, nét đúng độ phân giải gốc
  videoNodes = null,
  onPortalOpen,
  onComplete,
  compact = false,
  combo = 0,
  tenseExamples = null,
  tuVung = "",
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
    moiNhatRef.current = { videoReady, hasError, onPortalOpen, onComplete, originRect, combo, tuVung };
  });

  const viTris = compact ? ["center"] : ["left", "right"];

  function layCacCong() {
    return viTris
      .map((vt) => ({ vt, wrap: congRefs.current[vt], long: longRefs.current[vt] }))
      .filter((c) => c.wrap && c.long)
      .map((c) => {
        const r = c.wrap.getBoundingClientRect();
        return {
          ...c,
          rect: r,
          tam: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        };
      });
  }

  function catVong() {
    window.cancelAnimationFrame(vongRef.current);
    vongRef.current = 0;
  }

  /**
   * Chạy một kịch bản theo từng khung; tắt canvas khi kịch bản xong và hạt đã tàn.
   * tatSauMs: kịch bản xong thì hạt còn lại chỉ được sống thêm chừng này (mờ dần) — nhường GPU cho video vừa phát.
   */
  function chay(buoc, { tatSauMs = Infinity } = {}) {
    const canvas = fxRef.current;
    if (!canvas) return;
    dongCoRef.current ??= taoDongCo(canvas);
    const dongCo = dongCoRef.current;
    catVong();
    dongCo.doKichThuoc();
    canvas.style.display = "block";
    canvas.style.opacity = "";

    let truoc = performance.now();
    const batDau = truoc;
    let xongLuc = null;
    const khung = (now) => {
      const dt = Math.min(40, now - truoc);
      truoc = now;
      dongCo.capNhat(dt);
      dongCo.ve();
      const conChay = xongLuc === null && buoc(now - batDau, dt, dongCo);
      if (!conChay && xongLuc === null) xongLuc = now;
      const conHat = dongCo.conHat() && (xongLuc === null || now - xongLuc < tatSauMs);
      if (conChay || conHat) {
        if (xongLuc !== null && Number.isFinite(tatSauMs)) canvas.style.opacity = String(1 - (now - xongLuc) / tatSauMs);
        vongRef.current = window.requestAnimationFrame(khung);
      } else {
        dongCo.xoaHet();
        canvas.style.display = "none";
        canvas.style.opacity = "";
        vongRef.current = 0;
      }
    };
    vongRef.current = window.requestAnimationFrame(khung);
  }

  // Lòng cổng lộ ra một dải dọc giữa, rộng mo (0→1) bề ngang cổng
  function datKheMo(cacCong, mo) {
    for (const c of cacCong) {
      c.long.style.clipPath = `inset(0 ${((c.rect.width / 2) * (1 - mo)).toFixed(1)}px round ${BAN_KINH_CONG}px)`;
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
          pha = "rach";
          moc = t;
        }
        return true;
      }

      const tuVungHienTai = moiNhatRef.current.tuVung;

      if (pha === "rach") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.rach);
        const dai = Math.min(1, v / 0.55);
        for (const c of cacCong) {
          dongCo.veRach(c.tam, c.rect, BAN_KINH_CONG, em.raMu(dai));
          dongCo.veChuGiua(c.tam, c.rect, tuVungHienTai, Math.min(1, Math.max(0, (v - 0.15) / 0.6)), t);
        }
        if (v >= 1) {
          pha = "mo";
          moc = t;
        }
        return true;
      }

      if (pha === "mo") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.mo);
        const mo = em.vaoRa(v);
        datKheMo(cacCong, mo);
        for (const c of cacCong) {
          // Chữ tan theo hai mép tách ra
          dongCo.veChuGiua(c.tam, c.rect, tuVungHienTai, 1 - Math.min(1, v * 2.2), t);
          dongCo.veTachDoi(c.tam, c.rect, BAN_KINH_CONG, mo, 1);
        }
        if (v >= 1) {
          for (const c of cacCong) dongCo.loeKhung(c.rect, BAN_KINH_CONG);
          moCong();
          pha = "xong";
        }
        return true;
      }

      return false;
    }, { tatSauMs: 350 });

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
    // Cổng chưa kịp mở (đóng sớm) thì không có gì để khép — chỉ tắt đèn
    let pha = daMoRef.current ? "dong" : "het";
    let moc = 0;
    for (const c of cacCong) c.wrap.classList.remove("reward-magic__cong--mo");

    chay((t, dt, dongCo) => {
      if (pha === "dong") {
        const v = Math.min(1, t / THOI_GIAN.dong);
        const mo = 1 - em.vaoLapPhuong(v);
        datKheMo(cacCong, mo);
        for (const c of cacCong) dongCo.veTachDoi(c.tam, c.rect, BAN_KINH_CONG, mo, -1);
        if (v >= 1) {
          for (const c of cacCong) c.long.style.clipPath = "";
          pha = "thu";
          moc = t;
        }
        return true;
      }

      if (pha === "thu") {
        // Đường rạch còn lại thu ngắn về tâm
        const v = Math.min(1, (t - moc) / THOI_GIAN.thu);
        for (const c of cacCong) dongCo.veRach(c.tam, c.rect, BAN_KINH_CONG, 1 - em.vaoLapPhuong(v), 1 - v * 0.5);
        if (v >= 1) {
          for (const c of cacCong) {
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

  const hienGiua = !compact && portalDaMo && !fadeOut;
  const cauMau = (tenseExamples ?? []).slice(0, 3).filter(Boolean);

  return (
    <div ref={rootRef} className={`reward-magic ${compact ? "reward-magic--compact" : ""}`} aria-hidden="true">
      <div ref={manRef} className="reward-magic__man" />

      {/* Máy tính: màu video hắt ra khoảng giữa hai cổng như đèn hắt lên tường */}
      {!compact && (
        <canvas
          ref={(node) => luuCanvas("anhHat", node)}
          className={`reward-magic__anh-hat ${hienGiua ? "reward-magic__anh-hat--hien" : ""}`}
          width={16}
          height={9}
        />
      )}

      {viTris.map((viTri) => (
        <div
          key={viTri}
          className={`reward-magic__cong reward-magic__cong--${viTri}`}
          ref={(node) => {
            congRefs.current[viTri] = node;
          }}
        >
          <div className="reward-magic__hao-quang" />
          <div className="reward-magic__bui">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
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
                videoNodes?.[viTri] ?? <div className="reward-magic__fallback" />
              )}
            </div>
          </div>
        </div>
      ))}

      <canvas ref={fxRef} className="reward-magic__fx" />

      {/* Sân khấu giữa (máy tính): lời chúc + câu mẫu 3 thì của từ vừa làm đúng, hiện khi cổng đã mở */}
      {!compact && (
        <div className="reward-magic__san-khau">
          <AnimatePresence>
            {hienGiua && (
              <motion.div
                key={sequenceKey}
                className="reward-magic__the-giua"
                initial={{ opacity: 0, y: 28, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.9 }}
              >
                <p className="reward-magic__kicker">Mốc thưởng</p>
                <h2 className="reward-magic__tieu-de">Giỏi lắm!</h2>
                {combo >= 2 && <span className="reward-magic__chuoi">Chuỗi đúng ×{combo}</span>}

                {cauMau.length > 0 && (
                  <div className="reward-magic__cau-mau">
                    <p className="reward-magic__cau-mau-nhan">Câu mẫu với từ vừa học</p>
                    {cauMau.map((item, i) => (
                      <motion.div
                        key={item.tense}
                        className="reward-magic__tense-item"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.2 + i * 0.12 }}
                      >
                        <span className="reward-magic__tense-badge">{TENSE_LABEL[item.tense] || item.tense}</span>
                        {item.formula && <span className="reward-magic__tense-formula">{item.formula}</span>}
                        <p className="reward-magic__tense-sentence">{item.sentence}</p>
                        {item.translation && <p className="reward-magic__tense-translation">{item.translation}</p>}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default RewardMagicOverlay;
