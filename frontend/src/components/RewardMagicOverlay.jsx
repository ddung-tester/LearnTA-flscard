import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { phatAm } from "../utils/amThanh";
import { em, MAU, taoCongSang } from "./reward/congSang";
import NutDichCau from "./common/NutDichCau";
import "./RewardMagicOverlay.css";

/*
 * Hiệu ứng thưởng "cổng sáng":
 *  Mở: đốm sao ở thanh tiến độ → vệt sao chổi ngũ sắc bay cong tới tâm cổng → quả cầu ánh sáng nở ra, từ vừa học
 *   hiện dần từng chữ ở tâm → quả cầu nở thành khung video (tròn → bo góc), viền ngũ sắc chạy quanh, hạt sáng bung ra.
 *  Đóng: khung co về quả cầu, cầu thu thành đốm sao, vệt sáng bay ngược về thanh tiến độ.
 */

const THOI_GIAN = { tu: 320, bay: 520, cau: 900, mo: 720, lang: 640, dong: 360, thu: 150, ve: 280 };
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

const kep01 = (x) => Math.min(1, Math.max(0, x));

/** Khung cổng ở tiến độ f: 0 = hình tròn bằng lòng quả cầu, 1 = khung video bo góc. Chiều cao đi trước, góc tròn lâu hơn */
function hinhCong(c, f) {
  const r0 = c.R * 0.82;
  const W = c.rect.width;
  const H = c.rect.height;
  const fh = em.raMu(kep01(f / 0.85));
  const fw = em.raMu(kep01((f - 0.08) / 0.92));
  const w = 2 * r0 + (W - 2 * r0) * fw;
  const h = 2 * r0 + (H - 2 * r0) * fh;
  const rad = Math.min(r0 + (BAN_KINH_CONG - r0) * em.vaoRa(kep01(f)), w / 2, h / 2);
  return { cx: c.tam.x, cy: c.tam.y, w, h, rad };
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
  const tuRefs = useRef({});
  const veRef = useRef(null);
  const vongRef = useRef(0);
  const daMoRef = useRef(false);
  const tienDoMoRef = useRef(0);
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
      .map((vt) => ({
        vt,
        wrap: congRefs.current[vt],
        long: longRefs.current[vt],
        media: mediaRefs.current[vt],
        tu: tuRefs.current[vt],
      }))
      .filter((c) => c.wrap && c.long)
      .map((c) => {
        const r = c.wrap.getBoundingClientRect();
        return {
          ...c,
          rect: r,
          tam: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          // Bán kính quả cầu theo bề ngang cổng
          R: Math.min(r.width * 0.27, 112),
          cheo: Math.hypot(r.width, r.height) / 2,
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
    veRef.current ??= taoCongSang(canvas);
    const ve = veRef.current;
    catVong();
    ve.xoa();
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

  // Cắt lòng cổng theo khung hiện tại (clip-path inset bo góc) + video co nhẹ về cỡ thật
  function datHinh(c, h, coGian = 1) {
    const doc = Math.max(0, (c.rect.height - h.h) / 2);
    const ngang = Math.max(0, (c.rect.width - h.w) / 2);
    c.long.style.clipPath = `inset(${doc.toFixed(1)}px ${ngang.toFixed(1)}px round ${h.rad.toFixed(1)}px)`;
    if (c.media) c.media.style.transform = coGian === 1 ? "" : `scale(${coGian.toFixed(4)})`;
  }

  function anCong(c) {
    c.long.style.clipPath = "circle(0px at 50% 50%)";
  }

  function datChu(c, hien, tan = false) {
    if (!c.tu) return;
    c.tu.classList.toggle("reward-magic__lop-tu--hien", hien);
    c.tu.classList.toggle("reward-magic__lop-tu--tan", tan);
  }

  // Mở thưởng
  useEffect(() => {
    if (!active || !rootRef.current) return undefined;

    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const man = manRef.current;
    const cacCong = layCacCong();
    daMoRef.current = false;
    tienDoMoRef.current = 0;
    rootRef.current.style.opacity = "";
    man.style.opacity = "0";
    for (const c of cacCong) {
      c.wrap.classList.remove("reward-magic__cong--mo");
      datChu(c, false);
      if (!giamChuyenDong) anCong(c);
    }

    const moCong = () => {
      if (daMoRef.current) return;
      daMoRef.current = true;
      tienDoMoRef.current = 1;
      for (const c of cacCong) {
        c.wrap.classList.add("reward-magic__cong--mo");
        c.long.style.clipPath = "";
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
    let daHienChu = false;

    chay((t, ve) => {
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
        for (const c of cacCong) {
          const dau = ve.veVet(nguon, c.tam, em.vaoRa(u));
          if (dau) ve.thaHat(dau.x, dau.y, { soLuong: 2, tocDo: 45, song: 520 });
        }
        ve.veHat(t);
        if (u >= 1) {
          pha = "cau";
          moc = t;
        }
        return true;
      }

      if (pha === "cau") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.cau);
        for (const c of cacCong) {
          // Đuôi vệt rút nốt vào tâm trong 220 ms đầu
          ve.veVet(nguon, c.tam, 1 + 0.34 * Math.min(1, (t - moc) / 220));
          ve.veQuaCau(c.tam, c.R, v / 0.6, t, Math.min(1, v * 5));
          // Hạt sáng lấm tấm quanh vành
          if (Math.random() < 0.55) {
            const goc = Math.random() * Math.PI * 2;
            ve.thaHat(c.tam.x + Math.cos(goc) * c.R, c.tam.y + Math.sin(goc) * c.R, { tocDo: 28, song: 600, tiLeSao: 0.15 });
          }
        }
        if (!daHienChu && v >= 0.04) {
          daHienChu = true;
          for (const c of cacCong) datChu(c, true);
        }
        ve.veHat(t);
        if (v >= 1) {
          phatAm("phepNo");
          for (const c of cacCong) {
            datChu(c, true, true);
            ve.thaHat(c.tam.x, c.tam.y, { soLuong: compact ? 30 : 20, tocDo: 300, song: 950, tiLeSao: 0.35 });
          }
          pha = "mo";
          moc = t;
        }
        return true;
      }

      if (pha === "mo") {
        const v = Math.min(1, (t - moc) / THOI_GIAN.mo);
        tienDoMoRef.current = v;
        for (const c of cacCong) {
          const h = hinhCong(c, v);
          datHinh(c, h, 1.14 - 0.14 * em.raLapPhuong(v));
          // Quả cầu tan vào khung, sóng sáng lan ra, viền ngũ sắc bám mép khung
          ve.veQuaCau(c.tam, c.R, 1, t, 1 - em.raLapPhuong(Math.min(1, v / 0.45)));
          if (v < 0.4) ve.veLoe(c.tam, v / 0.4, c.rect.width);
          ve.veSong(c.tam, c.R + c.cheo * em.raLapPhuong(v), (1 - v) ** 2 * 0.9);
          ve.veVienCong(h, t, v < 0.12 ? v / 0.12 : 1 - 0.5 * ((v - 0.12) / 0.88));
        }
        ve.veHat(t);
        if (v >= 1) {
          moCong();
          pha = "lang";
          moc = t;
        }
        return true;
      }

      if (pha === "lang") {
        // Viền ngũ sắc chạy thêm một nhịp rồi tắt, nhường cho viền tĩnh của cổng
        const v = Math.min(1, (t - moc) / THOI_GIAN.lang);
        for (const c of cacCong) ve.veVienCong(hinhCong(c, 1), t, 0.5 * (1 - em.vaoRaMem(v)));
        ve.veHat(t);
        return v < 1 || ve.conHat();
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
    // Cổng chưa kịp mở hết (đóng sớm) thì chỉ khép phần đã lộ
    const f0 = tienDoMoRef.current;
    for (const c of cacCong) {
      c.wrap.classList.remove("reward-magic__cong--mo");
      datChu(c, false);
      if (f0 > 0) datHinh(c, hinhCong(c, f0));
      else anCong(c);
    }
    let pha = "dong";
    let moc = 0;

    chay((t, ve) => {
      if (pha === "dong") {
        const v = Math.min(1, t / THOI_GIAN.dong);
        const f = f0 * (1 - em.vaoRaMem(v));
        for (const c of cacCong) {
          const h = hinhCong(c, f);
          if (f > 0.001) datHinh(c, h, 1 + 0.08 * em.vaoRaMem(v));
          else anCong(c);
          if (f0 > 0) ve.veVienCong(h, t, 0.85 * Math.min(1, v * 4));
          ve.veQuaCau(c.tam, c.R * 0.7, 1, t, Math.max(0, (v - 0.45) / 0.55));
        }
        if (v >= 1) {
          for (const c of cacCong) anCong(c);
          pha = "thu";
          moc = t;
        }
      } else if (pha === "thu") {
        // Quả cầu thu lại thành một đốm sao
        const u = Math.min(1, (t - moc) / THOI_GIAN.thu);
        for (const c of cacCong) {
          ve.veQuaCau(c.tam, c.R * 0.7 * (1 - em.vaoLapPhuong(u)), 1, t, 1);
          ve.quang(c.tam.x, c.tam.y, 30, MAU.matOng, u);
          ve.veSao(c.tam.x, c.tam.y, 6 + 8 * u, u * 2, u);
        }
        if (u >= 1) {
          for (const c of cacCong) ve.thaHat(c.tam.x, c.tam.y, { soLuong: 10, tocDo: 160, song: 600, tiLeSao: 0.3 });
          pha = "ve";
          moc = t;
        }
      } else if (pha === "ve") {
        const u = Math.min(1, (t - moc) / THOI_GIAN.ve);
        for (const c of cacCong) {
          const dau = ve.veVet(c.tam, nguon, em.vaoRa(u), 0.9);
          if (dau) ve.thaHat(dau.x, dau.y, { soLuong: 1, tocDo: 40, song: 420 });
        }
        if (u >= 1) {
          pha = "cham";
          moc = t;
        }
      } else {
        const f = Math.min(1, (t - moc) / 200);
        ve.veChamVe(nguon, f);
        for (const c of cacCong) ve.veVet(c.tam, nguon, 1 + 0.34 * f, 0.9);
      }
      ve.veHat(t);

      man.style.opacity = String(1 - em.vaoRaMem(Math.min(1, Math.max(0, (t - 540) / 360))));
      if (pha === "cham" && t - moc > 180 && t > 900) {
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
  const chuTu = [...(tuVung || "").trim()].slice(0, 24);
  const coChu = chuTu.length > 12 ? "1rem" : chuTu.length > 8 ? "1.25rem" : "1.5rem";

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

      {/* Từ vừa học hiện từng chữ ở tâm quả cầu (trên lớp nét vẽ để chữ không bị ánh sáng cộng làm nhoè) */}
      {chuTu.length > 0 &&
        viTris.map((viTri) => (
          <div
            key={viTri}
            className={`reward-magic__cong reward-magic__cong--${viTri} reward-magic__lop-tu`}
            ref={(node) => {
              tuRefs.current[viTri] = node;
            }}
          >
            <span className="reward-magic__tu" style={{ fontSize: coChu }}>
              {chuTu.map((kt, i) => (
                <span key={i} style={{ "--i": i }}>
                  {kt === " " ? "\u00a0" : kt}
                </span>
              ))}
            </span>
          </div>
        ))}

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
