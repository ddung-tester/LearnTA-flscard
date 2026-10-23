import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { phatAm } from "../utils/amThanh";
import { em, taoVongAn } from "./reward/vongAn";
import NutDichCau from "./common/NutDichCau";
import "./RewardMagicOverlay.css";

/*
 * Hiệu ứng thưởng "vòng ấn":
 *  Mở: đốm mật ong ở thanh tiến độ → tia sáng thẳng tới tâm cổng → vòng ấn được vẽ từng nét, từ vừa học hiện ở tâm
 *   → vòng thu nhẹ rồi bung ra, video lộ dần từ tâm theo mặt nạ tròn viền mềm, bốn góc khung trượt vào.
 *  Đóng: mặt nạ khép về tâm (mép vòng sáng chạy theo), tia sáng bay ngược về thanh tiến độ.
 */

const THOI_GIAN = { tu: 320, bay: 420, an: 900, mo: 760, lang: 520, dong: 440, ve: 340 };
const BAN_KINH_CONG = 22;
const MEM = 64; // độ mềm mép mặt nạ (px)
const MAU_HO_PHACH = [245, 166, 35];
const MAU_MAT_ONG = [255, 213, 138];

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
  const mediaRefs = useRef({});
  const veRef = useRef(null);
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
      .map((vt) => ({ vt, wrap: congRefs.current[vt], long: longRefs.current[vt], media: mediaRefs.current[vt] }))
      .filter((c) => c.wrap && c.long)
      .map((c) => {
        const r = c.wrap.getBoundingClientRect();
        return {
          ...c,
          rect: r,
          tam: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          // Bán kính vòng ấn theo bề ngang cổng; bán kính mặt nạ phủ kín cả góc cổng
          R: Math.min(r.width * 0.3, 120),
          rDay: Math.hypot(r.width, r.height) / 2 + MEM,
        };
      });
  }

  function catVong() {
    window.cancelAnimationFrame(vongRef.current);
    vongRef.current = 0;
  }

  /** Chạy một kịch bản theo từng khung; tắt canvas khi kịch bản trả về false */
  function chay(buoc) {
    const canvas = fxRef.current;
    if (!canvas) return;
    veRef.current ??= taoVongAn(canvas);
    const ve = veRef.current;
    catVong();
    ve.doKichThuoc();
    canvas.style.display = "block";

    const batDau = performance.now();
    const khung = (now) => {
      ve.batDauKhung();
      if (buoc(now - batDau, ve)) {
        vongRef.current = window.requestAnimationFrame(khung);
      } else {
        ve.xoa();
        canvas.style.display = "none";
        vongRef.current = 0;
      }
    };
    vongRef.current = window.requestAnimationFrame(khung);
  }

  // Mặt nạ tròn viền mềm trên lòng cổng (bán kính px) + video co nhẹ về cỡ thật
  function datMatNa(cacCong, banKinh, coGian = 1) {
    for (const c of cacCong) {
      c.long.style.setProperty("--r", `${banKinh(c).toFixed(1)}px`);
      if (c.media) c.media.style.transform = coGian === 1 ? "" : `scale(${coGian.toFixed(4)})`;
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
      c.long.style.setProperty("--r", "0px");
    }

    const moCong = () => {
      if (daMoRef.current) return;
      daMoRef.current = true;
      for (const c of cacCong) {
        c.wrap.classList.add("reward-magic__cong--mo");
        if (c.media) c.media.style.transform = "";
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
    let pha = "tu";
    let moc = 0;

    chay((t, ve) => {
      const tuVungHienTai = moiNhatRef.current.tuVung;

      if (pha === "tu") {
        man.style.opacity = String(em.vaoRaMem(Math.min(1, t / 420)));
        ve.veDiemTu(nguon, t, Math.min(1, t / 200));
        const { videoReady: sanSang, hasError: loi } = moiNhatRef.current;
        if (t >= THOI_GIAN.tu && (sanSang || loi)) {
          pha = "bay";
          moc = t;
          phatAm("phepBay");
        }
        return true;
      }

      if (pha === "bay") {
        man.style.opacity = "1";
        const u = Math.min(1, (t - moc) / THOI_GIAN.bay);
        ve.veDiemTu(nguon, t, 1 - u);
        for (const c of cacCong) ve.veTia(nguon, c.tam, em.vaoRa(u) * 1.35);
        if (u >= 1) {
          pha = "an";
          moc = t;
        }
        return true;
      }

      if (pha === "an") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.an);
        for (const c of cacCong) {
          // Đuôi tia tắt nốt trong 150 ms đầu
          ve.veTia(nguon, c.tam, 1.35, 1 - Math.min(1, (t - moc) / 150));
          ve.quang(c.tam.x, c.tam.y, c.R * 0.5, MAU_HO_PHACH, 0.18 * v);
          ve.veVong(c.tam, c.R, { tienDo: v, xoay: -0.5 * (1 - em.raLapPhuong(v)) });
          ve.veChu(c.tam, c.R, tuVungHienTai, (v - 0.3) / 0.45);
        }
        if (v >= 1) {
          phatAm("phepNo");
          pha = "mo";
          moc = t;
        }
        return true;
      }

      if (pha === "mo") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.mo);
        // Vòng thu nhẹ (0 → 0,16) rồi bung rộng và tan; mặt nạ mở từ tâm theo nhịp bung
        const thu = Math.min(1, v / 0.16);
        const bung = Math.max(0, (v - 0.12) / 0.88);
        const coGianVong = bung > 0 ? 0.94 + em.raLapPhuong(bung) * 2.6 : 1 - 0.06 * em.vaoRaMem(thu);
        const moRa = em.raLapPhuong(bung);
        datMatNa(cacCong, (c) => c.rDay * moRa, 1.06 - 0.06 * moRa);
        for (const c of cacCong) {
          // Máy tính: hai cổng sát mép, vòng bung giữ trong cổng để không vắt ngang thẻ ở giữa
          const veVongBung = () => ve.veVong(c.tam, c.R, { xoay: 0.35 * moRa, coGian: coGianVong, a: 1 - moRa });
          if (compact) veVongBung();
          else ve.trongKhung(c.rect, BAN_KINH_CONG, veVongBung);
          ve.veChu(c.tam, c.R, tuVungHienTai, 1 - v / 0.22);
          if (bung > 0) {
            ve.veLoe(c.tam, bung, c.rect.width);
            ve.veMepMo(c.tam, Math.max(0, c.rDay * moRa - MEM * 0.6), 0.55 * (1 - moRa));
            ve.veGoc(c.rect, BAN_KINH_CONG, Math.max(0, (bung - 0.35) / 0.65));
          }
        }
        if (v >= 1) {
          moCong();
          pha = "lang";
          moc = t;
        }
        return true;
      }

      if (pha === "lang") {
        // Bốn góc khung mờ dần, nhường cho viền cổng
        const v = Math.min(1, (t - moc) / THOI_GIAN.lang);
        for (const c of cacCong) ve.veGoc(c.rect, BAN_KINH_CONG, 1, 1 - em.vaoRaMem(v));
        return v < 1;
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
    // Cổng chưa kịp mở (đóng sớm) thì chỉ khép phần đã lộ
    const banDau = new Map(
      cacCong.map((c) => [c, daMoRef.current ? c.rDay : parseFloat(c.long.style.getPropertyValue("--r")) || 0]),
    );
    for (const c of cacCong) {
      c.long.style.setProperty("--r", `${banDau.get(c)}px`);
      c.wrap.classList.remove("reward-magic__cong--mo");
    }
    let pha = "dong";
    let moc = 0;

    chay((t, ve) => {
      if (pha === "dong") {
        const v = Math.min(1, t / THOI_GIAN.dong);
        const con = 1 - em.vaoRaMem(v);
        datMatNa(cacCong, (c) => banDau.get(c) * con, 1 + 0.04 * em.vaoRaMem(v));
        for (const c of cacCong) {
          ve.veMepMo(c.tam, Math.max(0, banDau.get(c) * con - MEM * 0.6), 0.5 * Math.min(1, v * 3));
          ve.veGoc(c.rect, BAN_KINH_CONG, 1, 0.6 * (1 - v));
          if (v > 0.7) ve.quang(c.tam.x, c.tam.y, 22, MAU_MAT_ONG, (v - 0.7) / 0.3);
        }
        if (v >= 1) {
          pha = "ve";
          moc = t;
        }
      } else if (pha === "ve") {
        const u = Math.min(1, (t - moc) / THOI_GIAN.ve);
        for (const c of cacCong) {
          ve.quang(c.tam.x, c.tam.y, 22, MAU_MAT_ONG, 1 - u);
          ve.veTia(c.tam, nguon, em.vaoRa(u) * 1.35, 0.85);
        }
        if (u >= 1) {
          pha = "cham";
          moc = t;
        }
      } else {
        const f = Math.min(1, (t - moc) / 260);
        ve.veChamVe(nguon, f);
        for (const c of cacCong) ve.veTia(c.tam, nguon, 1.35, 1 - f);
      }

      man.style.opacity = String(1 - em.vaoRaMem(Math.min(1, Math.max(0, (t - 560) / 360))));
      if (pha === "cham" && t - moc > 200 && t > 920) {
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
          <div
            className="reward-magic__long"
            ref={(node) => {
              longRefs.current[viTri] = node;
            }}
          >
            <div
              className="reward-magic__media"
              ref={(node) => {
                mediaRefs.current[viTri] = node;
              }}
            >
              {hasError || !videoSrc ? (
                <div className="reward-magic__fallback" />
              ) : (
                videoNodes?.[viTri] ?? <div className="reward-magic__fallback" />
              )}
            </div>
            <div className="reward-magic__vien" />
          </div>
        </div>
      ))}

      <canvas ref={fxRef} className="reward-magic__fx" />

      {/* Sân khấu giữa (máy tính): lời chúc + câu mẫu 3 thì của từ vừa làm đúng, hiện khi cổng đã mở */}
      {!compact && (
        <div className="reward-magic__san-khau">
          <AnimatePresence>
            {hienGiua && (
              <m.div
                key={sequenceKey}
                className="reward-magic__the-giua"
                initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 8, filter: "blur(4px)", transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="reward-magic__kicker">Mốc thưởng</p>
                <h2 className="reward-magic__tieu-de">Giỏi lắm!</h2>
                {combo >= 2 && <span className="reward-magic__chuoi">Chuỗi đúng x{combo}</span>}

                {cauMau.length > 0 && (
                  <div className="reward-magic__cau-mau">
                    <p className="reward-magic__cau-mau-nhan">Câu mẫu với từ vừa học</p>
                    {cauMau.map((item, i) => (
                      <m.div
                        key={item.tense}
                        className="reward-magic__tense-item"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.18 + i * 0.1 }}
                      >
                        <span className="reward-magic__tense-badge">{TENSE_LABEL[item.tense] || item.tense}</span>
                        {item.formula && <span className="reward-magic__tense-formula">{item.formula}</span>}
                        <p className="reward-magic__tense-sentence">{item.sentence}</p>
                        <NutDichCau banDich={item.translation} />
                      </m.div>
                    ))}
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default RewardMagicOverlay;
