import { useEffect, useRef, useState } from "react";
import { SU_KIEN_PHAN_HOI_HOC } from "../../utils/hieuUng";
import { laMayYeu } from "../../utils/mayYeu";

// Câu nói ngắn theo trạng thái (chọn ngẫu nhiên)
const LOI = {
  vui: ["Chuẩn luôn!", "Giỏi quá!", "Đúng rồi!", "Meo~ tuyệt!"],
  phanKhich: ["Chuỗi đúng dài ghê!", "Không cản nổi!", "Siêu mèo đây rồi!"],
  buon: ["Không sao, thử lại nhé", "Suýt nữa thôi!", "Ghi vào sổ, lần sau nhớ"],
  ngap: ["Oáp… học tiếp không?"],
  xong: ["Xong phiên rồi, giỏi lắm!", "Hết bài! Thưởng cá nào 🐟"],
};

const THOI_GIAN_TRANG_THAI = { vui: 1600, phanKhich: 2200, buon: 1900, ngap: 2600, xong: 3200 };
const CHO_NGAP_MS = 25000;
const CHUOI_PHAN_KHICH = 5;

const chon = (ds) => ds[Math.floor(Math.random() * ds.length)];

/**
 * MeoHocCung — mèo mực vẽ tay ngồi ở góc màn học, phản ứng theo SU_KIEN_PHAN_HOI_HOC:
 * đúng → vui (đúng liền 5 câu → phấn khích), sai → buồn, xong phiên → ăn mừng;
 * 25 giây không đụng gì → ngáp rồi ngủ, có tương tác thì thức dậy. Mắt nhìn theo chuột (trừ máy yếu).
 * Chỉ để trang trí (aria-hidden, không nhận bấm). Giảm chuyển động: chỉ đổi nét mặt.
 */
function MeoHocCung() {
  const [trangThai, setTrangThai] = useState("cho");
  const [loi, setLoi] = useState(null);
  const gocRef = useRef(null);
  const henGioRef = useRef(null);
  const henNgapRef = useRef(null);
  const chuoiDungRef = useRef(0);
  const trangThaiRef = useRef("cho");

  useEffect(() => {
    function datTrangThai(moi, noi = true) {
      trangThaiRef.current = moi;
      setTrangThai(moi);
      setLoi(noi && LOI[moi] ? chon(LOI[moi]) : null);
      window.clearTimeout(henGioRef.current);
      const thoiGian = THOI_GIAN_TRANG_THAI[moi];
      if (!thoiGian) return;
      henGioRef.current = window.setTimeout(() => {
        // Ngáp xong thì ngủ luôn, còn lại quay về ngồi chờ
        if (moi === "ngap") datTrangThai("ngu", false);
        else datTrangThai("cho", false);
      }, thoiGian);
    }

    function henGioNgap() {
      window.clearTimeout(henNgapRef.current);
      henNgapRef.current = window.setTimeout(() => datTrangThai("ngap"), CHO_NGAP_MS);
    }

    function coTuongTac() {
      if (trangThaiRef.current === "ngu" || trangThaiRef.current === "ngap") datTrangThai("cho", false);
      henGioNgap();
    }

    function nhanPhanHoi(e) {
      const kieu = e.detail;
      if (kieu === "dung") {
        chuoiDungRef.current += 1;
        datTrangThai(chuoiDungRef.current % CHUOI_PHAN_KHICH === 0 ? "phanKhich" : "vui");
      } else if (kieu === "sai") {
        chuoiDungRef.current = 0;
        datTrangThai("buon");
      } else if (kieu === "xong") {
        datTrangThai("xong");
      }
      henGioNgap();
    }

    // Mắt nhìn theo chuột (tối đa ~2.5 đơn vị SVG), gom theo khung hình
    let raf = 0;
    function nhinTheo(e) {
      if (e.pointerType !== "mouse" || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const goc = gocRef.current;
        if (!goc) return;
        const r = goc.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.45);
        const kc = Math.hypot(dx, dy) || 1;
        const muc = Math.min(1, kc / 300) * 2.5;
        goc.style.setProperty("--meo-nhin-x", `${((dx / kc) * muc).toFixed(2)}px`);
        goc.style.setProperty("--meo-nhin-y", `${((dy / kc) * muc).toFixed(2)}px`);
      });
    }

    window.addEventListener(SU_KIEN_PHAN_HOI_HOC, nhanPhanHoi);
    window.addEventListener("pointerdown", coTuongTac, { passive: true });
    window.addEventListener("keydown", coTuongTac);
    // Máy yếu: mắt đứng yên (đỡ đo layout mỗi khung hình khi rê chuột)
    if (!laMayYeu()) window.addEventListener("pointermove", nhinTheo, { passive: true });
    henGioNgap();
    return () => {
      window.removeEventListener(SU_KIEN_PHAN_HOI_HOC, nhanPhanHoi);
      window.removeEventListener("pointerdown", coTuongTac);
      window.removeEventListener("keydown", coTuongTac);
      window.removeEventListener("pointermove", nhinTheo);
      window.clearTimeout(henGioRef.current);
      window.clearTimeout(henNgapRef.current);
      cancelAnimationFrame(raf);
    };
  }, []);

  const matMo = trangThai === "cho" || trangThai === "phanKhich";

  return (
    <div ref={gocRef} className={`meo-hoc meo-hoc--${trangThai}`} aria-hidden="true">
      {loi && (
        <span key={loi + trangThai} className="meo-hoc__loi">
          {loi}
        </span>
      )}
      <svg viewBox="0 0 120 112" className="meo-hoc__hinh">
        <g className="meo-hoc__duoi">
          <path d="M84 94 C104 92 112 72 101 58" fill="none" stroke="var(--meo-muc)" strokeWidth="10" strokeLinecap="round" />
          <path d="M84 94 C104 92 112 72 101 58" fill="none" stroke="var(--meo-giay)" strokeWidth="5.5" strokeLinecap="round" />
        </g>
        <g className="meo-hoc__than">
          <ellipse cx="60" cy="90" rx="30" ry="19" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.5" />
          <path d="M52 80 Q60 86 68 80" fill="none" stroke="var(--meo-muc)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          <ellipse cx="47" cy="105" rx="8.5" ry="5" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.2" />
          <ellipse cx="73" cy="105" rx="8.5" ry="5" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.2" />
        </g>
        <g className="meo-hoc__dau">
          <g className="meo-hoc__tai meo-hoc__tai--trai">
            <path d="M33 42 L37 13 L57 30 Z" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M38 35 L40 21 L50 29 Z" fill="var(--meo-hong)" />
          </g>
          <g className="meo-hoc__tai meo-hoc__tai--phai">
            <path d="M87 42 L83 13 L63 30 Z" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M82 35 L80 21 L70 29 Z" fill="var(--meo-hong)" />
          </g>
          <ellipse cx="60" cy="52" rx="31" ry="25" fill="var(--meo-giay)" stroke="var(--meo-muc)" strokeWidth="2.5" />
          {/* Vằn lông trên trán */}
          <path d="M55 30 L56 36 M60 29 L60 36 M65 30 L64 36" stroke="var(--meo-muc)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
          <ellipse cx="41" cy="61" rx="5.5" ry="3.2" fill="var(--meo-hong)" opacity="0.55" />
          <ellipse cx="79" cy="61" rx="5.5" ry="3.2" fill="var(--meo-hong)" opacity="0.55" />

          {matMo && (
            <g className="meo-hoc__mat">
              <g className="meo-hoc__mat-nhin">
                <ellipse cx="48" cy="50" rx="4.2" ry="5.4" fill="var(--meo-muc)" />
                <ellipse cx="72" cy="50" rx="4.2" ry="5.4" fill="var(--meo-muc)" />
                <circle cx="49.4" cy="48.2" r="1.5" fill="#fff" />
                <circle cx="73.4" cy="48.2" r="1.5" fill="#fff" />
              </g>
            </g>
          )}
          {(trangThai === "vui" || trangThai === "xong") && (
            <path d="M43 52 Q48 45 53 52 M67 52 Q72 45 77 52" fill="none" stroke="var(--meo-muc)" strokeWidth="2.6" strokeLinecap="round" />
          )}
          {trangThai === "buon" && (
            <>
              <path d="M43 44 L52 46.5 M77 44 L68 46.5" stroke="var(--meo-muc)" strokeWidth="2" strokeLinecap="round" />
              <path d="M43.5 51 Q48 55.5 52.5 51 M67.5 51 Q72 55.5 76.5 51" fill="none" stroke="var(--meo-muc)" strokeWidth="2.6" strokeLinecap="round" />
            </>
          )}
          {(trangThai === "ngu" || trangThai === "ngap") && (
            <path d="M43 51 Q48 54 53 51 M67 51 Q72 54 77 51" fill="none" stroke="var(--meo-muc)" strokeWidth="2.4" strokeLinecap="round" />
          )}

          <path d="M57.5 57 L62.5 57 L60 60 Z" fill="var(--meo-mui)" strokeLinejoin="round" />
          {trangThai === "ngap" || trangThai === "phanKhich" || trangThai === "xong" ? (
            <ellipse cx="60" cy="65" rx={trangThai === "ngap" ? 4.5 : 5} ry={trangThai === "ngap" ? 6 : 4} fill="var(--meo-mieng)" stroke="var(--meo-muc)" strokeWidth="1.8" />
          ) : trangThai === "buon" ? (
            <path d="M55 66 Q60 62 65 66" fill="none" stroke="var(--meo-muc)" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M54 61.5 Q57 65 60 61.5 Q63 65 66 61.5" fill="none" stroke="var(--meo-muc)" strokeWidth="2" strokeLinecap="round" />
          )}
          <path
            d="M29 56 L16 53 M29 60 L16 61 M91 56 L104 53 M91 60 L104 61"
            stroke="var(--meo-muc)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>

        {/* Phụ kiện theo trạng thái */}
        {trangThai === "buon" && (
          <path className="meo-hoc__mo-hoi" d="M92 30 Q96 37 92 40 Q88 37 92 30 Z" fill="#8fc6e8" stroke="var(--meo-muc)" strokeWidth="1.2" />
        )}
        {(trangThai === "vui" || trangThai === "phanKhich" || trangThai === "xong") && (
          <g className="meo-hoc__lap-lanh" fill="var(--meo-vang)" stroke="var(--meo-muc)" strokeWidth="1" strokeLinejoin="round">
            <path d="M16 18 L18.5 24 L25 26 L18.5 28 L16 34 L13.5 28 L7 26 L13.5 24 Z" />
            <path d="M103 10 L105 15 L110 17 L105 19 L103 24 L101 19 L96 17 L101 15 Z" />
            {trangThai !== "vui" && <path d="M108 44 L109.5 47.5 L113 49 L109.5 50.5 L108 54 L106.5 50.5 L103 49 L106.5 47.5 Z" />}
          </g>
        )}
        {trangThai === "ngu" && (
          <g className="meo-hoc__zzz" fill="var(--meo-muc)" fontFamily="var(--font-sans, sans-serif)" fontWeight="700">
            <text x="88" y="26" fontSize="12">z</text>
            <text x="97" y="16" fontSize="9">z</text>
            <text x="104" y="8" fontSize="7">z</text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default MeoHocCung;
