import { useEffect, useRef, useState } from "react";
import useTTS from "../hooks/useTTS";
import { giaiThichCauHoi } from "../services/courseApi";
import {
  laTraLoiDung,
  layDapAnHienThi,
  nhomPhanBaiTap,
  phanBaiTap,
  tachChuDam,
} from "../utils/baiTapKhoaHoc";

const TAT_CA = "tat-ca";

function Icon({ children, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconDung = (props) => <Icon {...props}><path d="M20 6 9 17l-5-5" /></Icon>;
const IconSai = (props) => <Icon {...props}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
const IconLoa = (props) => (
  <Icon {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </Icon>
);
const IconTranh = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
  </Icon>
);
const IconGiaiThich = (props) => (
  <Icon {...props}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.74V16h8v-1.26A7 7 0 0 0 12 2z" />
  </Icon>
);

function DoanChuDam({ text }) {
  return tachChuDam(text).map((doan, index) =>
    doan.dam ? <strong key={index}>{doan.text}</strong> : <span key={index}>{doan.text}</span>
  );
}

function GiaiThichAI({ trangThai, onThuLai }) {
  if (!trangThai) return null;
  return (
    <section className="kh-ai" aria-busy={trangThai.dangTai} aria-live="polite">
      <h4 className="kh-ai__tieu-de">
        <IconGiaiThich className="kh-ai__icon" />
        Giải thích của AI
      </h4>
      {trangThai.dangTai ? (
        <>
          <div className="kh-ai__cho" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="sr-only">Đang soạn lời giải thích</span>
        </>
      ) : trangThai.loi ? (
        <p className="kh-ai__loi">
          {trangThai.loi}{" "}
          <button type="button" className="kh-lien-ket" onClick={onThuLai}>
            Thử lại
          </button>
        </p>
      ) : (
        <p className="kh-ai__van-ban">
          <DoanChuDam text={trangThai.text} />
        </p>
      )}
    </section>
  );
}

function traLoiHienThi(cau, traLoi) {
  return cau.type === "multiple_choice" ? layDapAnHienThi({ ...cau, answer_key: traLoi }) : traLoi;
}

function loiNhan(tiLe) {
  if (tiLe >= 0.9) return "Bạn đã nắm chắc phần này.";
  if (tiLe >= 0.6) return "Khá ổn. Xem lại các câu sai bên dưới rồi làm lại.";
  return "Nên đọc lại phần lý thuyết, sau đó làm lại các câu sai.";
}

function TongKet({ danhSach, ketQua, onLamLaiCauSai, onLamLaiTuDau }) {
  const cauSai = danhSach.filter((c) => !ketQua[c.id]?.dung);
  const soDung = danhSach.length - cauSai.length;
  const theoPhan = nhomPhanBaiTap(danhSach).flatMap((nhom) =>
    nhom.cacPhan.map((phan) => {
      const cacCau = danhSach.filter((c) => phanBaiTap(c).khoa === phan.khoa);
      return { ...phan, nguon: nhom.nguon, dung: cacCau.filter((c) => ketQua[c.id]?.dung).length };
    })
  );

  return (
    <section className="kh-tong-ket" aria-labelledby="tong-ket">
      <div className="kh-tong-ket__dau">
        <p id="tong-ket" className="kh-tong-ket__diem">
          <strong>{soDung}</strong>
          <span>/{danhSach.length} câu đúng</span>
        </p>
        <p className="kh-tong-ket__loi-nhan">{loiNhan(soDung / danhSach.length)}</p>
      </div>

      {theoPhan.length > 1 && (
        <ul className="kh-tong-ket__phan">
          {theoPhan.map((phan) => (
            <li key={phan.khoa}>
              <span className="kh-tong-ket__ten-phan">
                <span className="kh-tong-ket__nguon">{phan.nguon}</span> {phan.phan}
              </span>
              <span className="kh-tong-ket__thanh" aria-hidden="true">
                <span style={{ width: `${(phan.dung / phan.soCau) * 100}%` }} />
              </span>
              <span className="kh-tong-ket__so">
                {phan.dung}/{phan.soCau}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="kh-tong-ket__hanh-dong">
        {cauSai.length > 0 && (
          <button type="button" className="ui-button ui-button--primary px-5 py-2.5" onClick={() => onLamLaiCauSai(cauSai)}>
            Làm lại {cauSai.length} câu sai
          </button>
        )}
        <button type="button" className="ui-button ui-button--ghost px-5 py-2.5" onClick={onLamLaiTuDau}>
          Làm lại từ đầu
        </button>
      </div>

      {cauSai.length > 0 && (
        <div className="kh-tong-ket__sai">
          <h4 className="kh-tong-ket__sai-tieu-de">Các câu cần xem lại</h4>
          <ol>
            {cauSai.map((c) => (
              <li key={c.id}>
                <p className="kh-tong-ket__de" lang="en">{c.prompt}</p>
                <p className="kh-tong-ket__so-sanh">
                  <span className="kh-tong-ket__cua-ban">
                    Bạn trả lời: <s lang="en">{traLoiHienThi(c, ketQua[c.id]?.traLoi)}</s>
                  </span>
                  <span className="kh-tong-ket__dung">
                    Đúng: <strong lang="en">{layDapAnHienThi(c)}</strong>
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/**
 * BaiTapKhoaHoc — làm lần lượt từng câu của một buổi trong khoá học riêng.
 * Trả lời xong: đúng/sai + đáp án, gợi ý có sẵn, rồi AI giải thích ngay bên dưới.
 * Phím tắt: 1–4 hoặc A–D chọn đáp án, Enter sang câu tiếp.
 */
export default function BaiTapKhoaHoc({ cauHoi }) {
  const { speak, isPlaying } = useTTS();
  const [phan, setPhan] = useState(TAT_CA);
  const [danhSach, setDanhSach] = useState(cauHoi);
  const [chiSo, setChiSo] = useState(0);
  const [ketQua, setKetQua] = useState({});
  const [giaiThich, setGiaiThich] = useState({});
  const [nhap, setNhap] = useState("");
  const oNhapRef = useRef(null);
  const deBaiRef = useRef(null);

  const nhomPhan = nhomPhanBaiTap(cauHoi);
  const cau = danhSach[chiSo];
  const daTraLoi = cau ? ketQua[cau.id] : null;
  const xong = chiSo >= danhSach.length;
  const soDung = Object.values(ketQua).filter((k) => k.dung).length;
  const soSai = Object.keys(ketQua).length - soDung;

  function batDauLuot(ds) {
    setDanhSach(ds);
    setChiSo(0);
    setKetQua({});
    setGiaiThich({});
    setNhap("");
  }

  function chonPhan(khoa) {
    setPhan(khoa);
    batDauLuot(khoa === TAT_CA ? cauHoi : cauHoi.filter((c) => phanBaiTap(c).khoa === khoa));
  }

  function hoiAI(cauHienTai, traLoi) {
    setGiaiThich((cu) => ({ ...cu, [cauHienTai.id]: { dangTai: true, text: "", loi: "" } }));
    giaiThichCauHoi(cauHienTai.id, traLoi)
      .then((data) =>
        setGiaiThich((cu) => ({ ...cu, [cauHienTai.id]: { dangTai: false, text: data.explanation, loi: "" } }))
      )
      .catch((error) =>
        setGiaiThich((cu) => ({
          ...cu,
          [cauHienTai.id]: { dangTai: false, text: "", loi: error.message || "AI chưa giải thích được." },
        }))
      );
  }

  function traLoiCau(traLoi) {
    if (!cau || daTraLoi || !traLoi) return;
    setKetQua((cu) => ({ ...cu, [cau.id]: { traLoi, dung: laTraLoiDung(cau, traLoi) } }));
    hoiAI(cau, traLoi);
  }

  function sangCauTiep() {
    setNhap("");
    setChiSo((cu) => cu + 1);
    // Câu trắc nghiệm tiếp theo: đưa focus về đề bài để bàn phím và trình đọc màn hình theo kịp
    // (câu điền từ thì ô nhập tự focus)
    if (danhSach[chiSo + 1]?.type === "multiple_choice") {
      requestAnimationFrame(() => deBaiRef.current?.focus());
    }
  }

  useEffect(() => {
    function xuLyPhim(event) {
      if (!cau || event.ctrlKey || event.metaKey || event.altKey) return;
      const laONhap = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";
      // Bỏ qua phím gõ ở ô khác (vd chatbot)
      if (laONhap && event.target !== oNhapRef.current) return;
      if (event.key === "Enter" && daTraLoi) {
        event.preventDefault();
        sangCauTiep();
        return;
      }
      if (laONhap || daTraLoi || cau.type !== "multiple_choice") return;
      const theoSo = cau.options[Number(event.key) - 1];
      const theoChu = cau.options.find((luaChon) => luaChon.key === event.key.toUpperCase());
      const luaChon = theoSo || theoChu;
      if (luaChon) traLoiCau(luaChon.key);
    }
    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  });

  if (cauHoi.length === 0) {
    return <p className="kh-trong">Buổi này chưa có bài tập.</p>;
  }

  const boChonPhan = (
    <div className="kh-bt__phan" role="group" aria-label="Chọn phần bài tập">
      <button type="button" className="kh-chip" aria-pressed={phan === TAT_CA} onClick={() => chonPhan(TAT_CA)}>
        Tất cả <span className="kh-chip__so">{cauHoi.length}</span>
      </button>
      {nhomPhan.map((nhom) => (
        <span key={nhom.nguon} className="kh-bt__nhom">
          <span className="kh-bt__nhom-ten">{nhom.nguon}</span>
          {nhom.cacPhan.map((muc) => (
            <button
              key={muc.khoa}
              type="button"
              className="kh-chip"
              aria-pressed={phan === muc.khoa}
              onClick={() => chonPhan(muc.khoa)}
            >
              {muc.phan} <span className="kh-chip__so">{muc.soCau}</span>
            </button>
          ))}
        </span>
      ))}
    </div>
  );

  if (xong) {
    return (
      <div className="kh-bt">
        {boChonPhan}
        <TongKet
          danhSach={danhSach}
          ketQua={ketQua}
          onLamLaiCauSai={batDauLuot}
          onLamLaiTuDau={() => chonPhan(phan)}
        />
      </div>
    );
  }

  const { nguon, phan: tenPhan } = phanBaiTap(cau);
  const dapAnDung = layDapAnHienThi(cau);
  const soDaLam = Object.keys(ketQua).length;
  const laTracNghiem = cau.type === "multiple_choice";

  return (
    <div className="kh-bt">
      {boChonPhan}

      <div className="kh-bt__tien-do">
        <div
          className="kh-bt__thanh"
          role="progressbar"
          aria-label="Số câu đã làm"
          aria-valuemin={0}
          aria-valuemax={danhSach.length}
          aria-valuenow={soDaLam}
        >
          <span style={{ width: `${(soDaLam / danhSach.length) * 100}%` }} />
        </div>
        <p className="kh-bt__dem">
          <span>
            Câu <strong>{chiSo + 1}</strong> / {danhSach.length}
          </span>
          <span className="kh-bt__dem-ket-qua">
            <span className="kh-bt__dem-dung">{soDung} đúng</span>
            <span className="kh-bt__dem-sai">{soSai} sai</span>
          </span>
        </p>
      </div>

      <section className="kh-cau" aria-labelledby="kh-de-bai">
        <p className="kh-cau__phan">
          <span className="kh-cau__nguon">{nguon}</span> {tenPhan}
        </p>
        {cau.instruction && <p className="kh-cau__yeu-cau">{cau.instruction}</p>}
        {cau.image_description && (
          <p className="kh-cau__tranh">
            <IconTranh className="kh-cau__tranh-icon" />
            <span>Tranh trong tài liệu: {cau.image_description}</span>
          </p>
        )}
        <div className="kh-cau__de">
          <p id="kh-de-bai" ref={deBaiRef} tabIndex={-1} className="kh-cau__de-chu" lang="en">
            {cau.prompt}
          </p>
          <button
            type="button"
            className={`kh-nut-loa${isPlaying ? " kh-nut-loa--dang-doc" : ""}`}
            onClick={() => speak(cau.prompt.replace(/_{2,}/g, " blank "), "en-US")}
            title="Nghe câu hỏi"
          >
            <IconLoa />
            <span className="sr-only">Nghe câu hỏi</span>
          </button>
        </div>

        {laTracNghiem ? (
          <ul className="kh-lua-chon">
            {cau.options.map((luaChon, index) => {
              const laDung = daTraLoi && luaChon.key === cau.answer_key;
              const laChonSai = daTraLoi && !daTraLoi.dung && luaChon.key === daTraLoi.traLoi;
              const trangThai = laDung ? " kh-lua-chon__nut--dung" : laChonSai ? " kh-lua-chon__nut--sai" : daTraLoi ? " kh-lua-chon__nut--mo" : "";
              return (
                <li key={luaChon.key}>
                  <button
                    type="button"
                    className={`kh-lua-chon__nut${trangThai}`}
                    onClick={() => traLoiCau(luaChon.key)}
                    disabled={Boolean(daTraLoi)}
                    aria-keyshortcuts={`${index + 1} ${luaChon.key}`}
                  >
                    <span className="kh-lua-chon__chu" aria-hidden="true">{luaChon.key}</span>
                    <span className="kh-lua-chon__noi-dung" lang="en">{luaChon.text}</span>
                    {laDung && <IconDung className="kh-lua-chon__icon" />}
                    {laChonSai && <IconSai className="kh-lua-chon__icon" />}
                    {(laDung || laChonSai) && (
                      <span className="sr-only">{laDung ? "(đáp án đúng)" : "(bạn chọn, chưa đúng)"}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <form
            className="kh-dien"
            onSubmit={(event) => {
              event.preventDefault();
              traLoiCau(nhap.trim());
            }}
          >
            <label htmlFor="kh-o-nhap" className="sr-only">Câu trả lời</label>
            <input
              id="kh-o-nhap"
              key={cau.id}
              ref={oNhapRef}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={nhap}
              onChange={(event) => setNhap(event.target.value)}
              disabled={Boolean(daTraLoi)}
              placeholder="Gõ phần còn thiếu"
              lang="en"
              className={`kh-dien__o${daTraLoi ? (daTraLoi.dung ? " kh-dien__o--dung" : " kh-dien__o--sai") : ""}`}
            />
            <button
              type="submit"
              className="ui-button ui-button--primary px-5 py-2.5 whitespace-nowrap"
              disabled={Boolean(daTraLoi) || !nhap.trim()}
            >
              Kiểm tra
            </button>
          </form>
        )}

        {!daTraLoi && (
          <p className="kh-cau__phim">
            {laTracNghiem
              ? `Bấm vào đáp án, hoặc phím 1–${cau.options.length}`
              : "Gõ đáp án rồi nhấn Enter"}
          </p>
        )}
      </section>

      {daTraLoi && (
        <section className={`kh-phan-hoi ${daTraLoi.dung ? "kh-phan-hoi--dung" : "kh-phan-hoi--sai"}`} aria-live="polite">
          <p className="kh-phan-hoi__ket-qua">
            {daTraLoi.dung ? <IconDung className="kh-phan-hoi__icon" /> : <IconSai className="kh-phan-hoi__icon" />}
            {daTraLoi.dung ? "Chính xác" : "Chưa đúng"}
          </p>
          {!daTraLoi.dung && (
            <p className="kh-phan-hoi__dap-an">
              Đáp án đúng: <strong lang="en">{dapAnDung}</strong>
            </p>
          )}
          {cau.explanation && <p className="kh-phan-hoi__goi-y">{cau.explanation}</p>}
          <GiaiThichAI trangThai={giaiThich[cau.id]} onThuLai={() => hoiAI(cau, daTraLoi.traLoi)} />
          <div className="kh-phan-hoi__cuoi">
            <button type="button" className="ui-button ui-button--primary px-5 py-2.5 kh-phan-hoi__tiep" onClick={sangCauTiep}>
              {chiSo + 1 < danhSach.length ? "Câu tiếp theo" : "Xem kết quả"}
              <kbd aria-hidden="true">Enter</kbd>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
