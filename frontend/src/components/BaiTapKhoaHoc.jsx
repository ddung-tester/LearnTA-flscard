import { useEffect, useRef, useState } from "react";
import DanhSachDapAn from "./common/DanhSachDapAn";
import TheCauHoiPhien from "./common/TheCauHoiPhien";
import useTTS from "../hooks/useTTS";
import { giaiThichCauHoi } from "../services/courseApi";
import {
  laTraLoiDung,
  layDapAnHienThi,
  tachChuDam,
  tenPhanBaiTap,
} from "../utils/baiTapKhoaHoc";

const TAT_CA = "tat-ca";

function DoanChuDam({ text }) {
  return tachChuDam(text).map((doan, index) =>
    doan.dam ? <strong key={index}>{doan.text}</strong> : <span key={index}>{doan.text}</span>
  );
}

function GiaiThichAI({ trangThai, onThuLai }) {
  if (!trangThai) return null;
  return (
    <div className="khoa-hoc-ai" aria-live="polite">
      <p className="khoa-hoc-ai__nhan">AI giải thích</p>
      {trangThai.dangTai ? (
        <p className="khoa-hoc-ai__cho">Đang soạn lời giải thích…</p>
      ) : trangThai.loi ? (
        <p className="khoa-hoc-ai__loi">
          {trangThai.loi}{" "}
          <button type="button" className="ui-link font-semibold" onClick={onThuLai}>
            Thử lại
          </button>
        </p>
      ) : (
        <p className="khoa-hoc-ai__text">
          <DoanChuDam text={trangThai.text} />
        </p>
      )}
    </div>
  );
}

/**
 * BaiTapKhoaHoc — làm lần lượt từng câu của một bài trong khoá học riêng.
 * Trả lời xong: hiện đúng/sai + đáp án, gợi ý có sẵn, rồi AI giải thích ngay bên dưới.
 * Phím tắt: 1–4 chọn đáp án, Enter sang câu tiếp.
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

  const cacPhan = [...new Set(cauHoi.map(tenPhanBaiTap))];
  const cau = danhSach[chiSo];
  const daTraLoi = cau ? ketQua[cau.id] : null;
  const xong = chiSo >= danhSach.length;

  function batDauLuot(ds) {
    setDanhSach(ds);
    setChiSo(0);
    setKetQua({});
    setGiaiThich({});
    setNhap("");
  }

  function chonPhan(giaTri) {
    setPhan(giaTri);
    batDauLuot(giaTri === TAT_CA ? cauHoi : cauHoi.filter((c) => tenPhanBaiTap(c) === giaTri));
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
    if (!cau || daTraLoi) return;
    setKetQua((cu) => ({ ...cu, [cau.id]: { traLoi, dung: laTraLoiDung(cau, traLoi) } }));
    hoiAI(cau, traLoi);
  }

  function sangCauTiep() {
    setNhap("");
    setChiSo((cu) => cu + 1);
  }

  useEffect(() => {
    function xuLyPhim(event) {
      if (!cau) return;
      const laONhap = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";
      // Bỏ qua phím gõ ở ô khác (vd chatbot)
      if (laONhap && event.target !== oNhapRef.current) return;
      if (event.key === "Enter" && daTraLoi) {
        event.preventDefault();
        sangCauTiep();
        return;
      }
      if (laONhap || daTraLoi || cau.type !== "multiple_choice") return;
      const so = Number(event.key);
      if (so >= 1 && so <= cau.options.length) traLoiCau(cau.options[so - 1].key);
    }
    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  });

  if (cauHoi.length === 0) {
    return <p className="text-sm text-[var(--mau-chu-phu)]">Bài này chưa có bài tập.</p>;
  }

  const boChonPhan = (
    <label className="khoa-hoc-bai-tap__phan">
      <span className="practice-field__label">Phần</span>
      <select
        value={phan}
        onChange={(event) => chonPhan(event.target.value)}
        className="ui-word-sort__select practice-select"
      >
        <option value={TAT_CA}>Tất cả ({cauHoi.length} câu)</option>
        {cacPhan.map((ten) => (
          <option key={ten} value={ten}>
            {ten} ({cauHoi.filter((c) => tenPhanBaiTap(c) === ten).length})
          </option>
        ))}
      </select>
    </label>
  );

  if (xong) {
    const cauSai = danhSach.filter((c) => !ketQua[c.id]?.dung);
    const soDung = danhSach.length - cauSai.length;
    return (
      <div className="khoa-hoc-bai-tap">
        {boChonPhan}
        <section className="khoa-hoc-tong-ket">
          <p className="khoa-hoc-tong-ket__diem">
            {soDung}/{danhSach.length} câu đúng
          </p>
          <div className="flex flex-wrap gap-2">
            {cauSai.length > 0 && (
              <button type="button" className="ui-button ui-button--primary px-4 py-2.5" onClick={() => batDauLuot(cauSai)}>
                Làm lại câu sai ({cauSai.length})
              </button>
            )}
            <button type="button" className="ui-button ui-button--ghost px-4 py-2.5" onClick={() => chonPhan(phan)}>
              Làm lại từ đầu
            </button>
          </div>
          {cauSai.length > 0 && (
            <ol className="khoa-hoc-tong-ket__sai">
              {cauSai.map((c) => (
                <li key={c.id}>
                  <span>{c.prompt}</span>
                  <span className="khoa-hoc-tong-ket__dap-an">→ {layDapAnHienThi(c)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  }

  const dapAnDung = layDapAnHienThi(cau);
  const soDaDung = Object.values(ketQua).filter((k) => k.dung).length;

  return (
    <div className="khoa-hoc-bai-tap">
      {boChonPhan}

      <div className="khoa-hoc-bai-tap__dau">
        <span className="ui-chip ui-chip--small">{tenPhanBaiTap(cau)}</span>
        <span className="khoa-hoc-bai-tap__dem">
          Câu {chiSo + 1}/{danhSach.length} · đúng {soDaDung}
        </span>
      </div>

      {cau.instruction && <p className="khoa-hoc-bai-tap__yeu-cau">{cau.instruction}</p>}
      {cau.image_description && (
        <p className="khoa-hoc-bai-tap__hinh">Hình trong tài liệu: {cau.image_description}</p>
      )}

      <TheCauHoiPhien
        key={`${cau.id}-${chiSo}`}
        cauHoi={cau.prompt}
        cauHoiNho
        dangDoc={isPlaying}
        onDoc={() => speak(cau.prompt.replace(/_{2,}/g, "blank"), "en-US")}
      />

      {cau.type === "multiple_choice" ? (
        <DanhSachDapAn
          khoa={cau.id}
          danhSachDapAn={cau.options.map((luaChon) => luaChon.text)}
          dapAnDung={dapAnDung}
          dapAnDaChon={daTraLoi ? layDapAnHienThi({ ...cau, answer_key: daTraLoi.traLoi }) : null}
          onChon={(text) => traLoiCau(cau.options.find((luaChon) => luaChon.text === text)?.key)}
        />
      ) : (
        <form
          className="khoa-hoc-bai-tap__dien"
          onSubmit={(event) => {
            event.preventDefault();
            if (nhap.trim()) traLoiCau(nhap.trim());
          }}
        >
          <input
            key={cau.id}
            ref={oNhapRef}
            autoFocus
            value={nhap}
            onChange={(event) => setNhap(event.target.value)}
            disabled={Boolean(daTraLoi)}
            placeholder="Gõ câu trả lời…"
            aria-label="Câu trả lời"
            className="ui-written-answer-input w-full rounded-xl border px-4 py-3 text-lg outline-none"
          />
          <button type="submit" className="ui-button ui-button--primary px-4 py-2.5 whitespace-nowrap" disabled={Boolean(daTraLoi) || !nhap.trim()}>
            Kiểm tra
          </button>
        </form>
      )}

      {daTraLoi && (
        <section className={`khoa-hoc-phan-hoi ${daTraLoi.dung ? "khoa-hoc-phan-hoi--dung" : "khoa-hoc-phan-hoi--sai"}`}>
          <p className="khoa-hoc-phan-hoi__ket-qua">
            {daTraLoi.dung ? "Chính xác!" : `Chưa đúng. Đáp án: ${dapAnDung}`}
          </p>
          {cau.explanation && <p className="khoa-hoc-phan-hoi__goi-y">{cau.explanation}</p>}
          <GiaiThichAI trangThai={giaiThich[cau.id]} onThuLai={() => hoiAI(cau, daTraLoi.traLoi)} />
          <button type="button" className="ui-button ui-button--primary khoa-hoc-phan-hoi__tiep px-4 py-2.5" onClick={sangCauTiep}>
            {chiSo + 1 < danhSach.length ? "Câu tiếp theo" : "Xem kết quả"} <kbd aria-hidden="true">Enter</kbd>
          </button>
        </section>
      )}
    </div>
  );
}
