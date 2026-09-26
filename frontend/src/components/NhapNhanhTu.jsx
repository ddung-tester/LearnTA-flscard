import { useEffect, useMemo, useRef, useState } from "react";
import { taoTuBangAI } from "../services/cardApi";
import {
  locTuTrung,
  MAU_DAN_NHANH,
  phanTichDanNhanh,
  PROMPT_CHATGPT,
} from "../utils/nhapNhanhTu";

const LOP_O_NHAP =
  "w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]";
const LOP_NUT_PHU =
  "ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)]";
const LOP_NUT_CHINH =
  "ui-button ui-button--primary w-full sm:w-auto rounded-lg px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60";
const SO_TU_AI = [10, 15, 20, 30];
const SO_DONG_XEM_TRUOC = 50;

function NhomChip({ nhan, luaChon, giaTri, onChon }) {
  return (
    <div className="ui-chip-row" role="group" aria-label={nhan}>
      {luaChon.map((muc) => {
        const dangChon = muc.giaTri === giaTri;
        return (
          <button
            key={muc.giaTri}
            type="button"
            onClick={() => onChon(muc.giaTri)}
            aria-pressed={dangChon}
            className={`ui-chip ui-chip--interactive${dangChon ? " ui-chip--primary" : ""}`}
          >
            {muc.nhan}
          </button>
        );
      })}
    </div>
  );
}

function DongTu({ tu, children }) {
  return (
    <li className="flex items-start gap-3 border-b border-[var(--mau-vien)] py-2 last:border-b-0">
      {children}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--mau-chu)]">
          {tu.term_en}
          {tu.pronunciation && (
            <span className="ml-1.5 font-normal text-[var(--mau-chu-phu)]">{tu.pronunciation}</span>
          )}
          {tu.part_of_speech && (
            <span className="ml-1.5 text-xs font-normal text-[var(--mau-chu-phu)]">({tu.part_of_speech})</span>
          )}
        </p>
        <p className="text-sm text-[var(--mau-chu)]">{tu.meaning_vi}</p>
        {tu.example_sentence && (
          <p className="text-xs italic text-[var(--mau-chu-phu)]" lang="en">{tu.example_sentence}</p>
        )}
      </div>
    </li>
  );
}

function TabDanDanhSach({ danhSachHienCo, dangLuu, onNhap, onHuy }) {
  const [noiDung, setNoiDung] = useState("");
  const [daSaoChep, setDaSaoChep] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const ketQua = useMemo(() => {
    const { hopLe, loi } = phanTichDanNhanh(noiDung);
    return { ...locTuTrung(hopLe, danhSachHienCo), loi };
  }, [noiDung, danhSachHienCo]);

  async function saoChepPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT_CHATGPT);
      setDaSaoChep(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDaSaoChep(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard: người dùng vẫn đọc được mẫu ở gợi ý bên dưới
    }
  }

  function xuLyNhap(event) {
    event.preventDefault();
    if (ketQua.moi.length > 0 && !dangLuu) onNhap(ketQua.moi);
  }

  const coNoiDung = noiDung.trim().length > 0;

  return (
    <form onSubmit={xuLyNhap} className="space-y-4">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="dan-nhanh-tu" className="text-sm font-medium text-[var(--mau-chu)]">
            Danh sách từ
          </label>
          <button
            type="button"
            onClick={saoChepPrompt}
            className="text-xs font-semibold text-[var(--mau-chinh)] hover:underline"
          >
            {daSaoChep ? "Đã sao chép prompt ✓" : "Sao chép prompt cho ChatGPT"}
          </button>
        </div>
        <textarea
          id="dan-nhanh-tu"
          value={noiDung}
          onChange={(event) => setNoiDung(event.target.value)}
          rows={8}
          className={`ui-import-zone resize-none ${LOP_O_NHAP}`}
          placeholder={"apple | /ˈæp.əl/ | noun | quả táo | I eat an apple. | \nbook - quyển sách\ncat, con mèo"}
        />
        <p className="mt-2 text-xs text-[var(--mau-chu-phu)]">
          Mỗi dòng một từ: <code>{MAU_DAN_NHANH}</code>. Cột nào trống cũng được. Cũng nhận
          &quot;từ - nghĩa&quot;, &quot;từ, nghĩa&quot; hoặc dán thẳng từ Excel.
        </p>
      </div>

      {coNoiDung && (
        <div aria-live="polite">
          <p className="mb-2 text-sm text-[var(--mau-chu-phu)]">
            <strong className="text-[var(--mau-chu)]">{ketQua.moi.length}</strong> từ sẽ được thêm
            {ketQua.trung.length > 0 && ` · ${ketQua.trung.length} từ trùng sẽ bỏ qua`}
            {ketQua.loi.length > 0 && ` · ${ketQua.loi.length} dòng lỗi`}
          </p>
          {ketQua.loi.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-xs text-[var(--mau-loi)]">
              {ketQua.loi.slice(0, 5).map((loi) => (
                <li key={loi.dong}>
                  Dòng {loi.dong}: {loi.lyDo} — {loi.noiDung}
                </li>
              ))}
            </ul>
          )}
          {ketQua.moi.length > 0 && (
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-[var(--mau-vien)] px-3">
              {ketQua.moi.slice(0, SO_DONG_XEM_TRUOC).map((tu, index) => (
                <DongTu key={`${tu.term_en}-${index}`} tu={tu} />
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ui-form-actions">
        <button type="button" onClick={onHuy} className={LOP_NUT_PHU}>
          Hủy
        </button>
        <button type="submit" disabled={ketQua.moi.length === 0 || dangLuu} className={LOP_NUT_CHINH}>
          {dangLuu ? "Đang thêm..." : `Thêm ${ketQua.moi.length} từ`}
        </button>
      </div>
    </form>
  );
}

function TabTaoBangAI({ danhSachHienCo, dangLuu, onNhap, onHuy }) {
  const [cachTao, setCachTao] = useState("chu-de");
  const [chuDe, setChuDe] = useState("");
  const [doanVan, setDoanVan] = useState("");
  const [soLuong, setSoLuong] = useState(15);
  const [dangTao, setDangTao] = useState(false);
  const [loi, setLoi] = useState("");
  const [goiY, setGoiY] = useState([]); // [{ tu, trung }]
  const [daChon, setDaChon] = useState(() => new Set());

  async function taoTu(event) {
    event.preventDefault();
    const dauVao = cachTao === "chu-de" ? chuDe.trim() : doanVan.trim();
    if (!dauVao || dangTao) return;

    setDangTao(true);
    setLoi("");
    try {
      const words = await taoTuBangAI(
        cachTao === "chu-de" ? { chuDe: dauVao, soLuong } : { doanVan: dauVao, soLuong }
      );
      const { trung } = locTuTrung(words, danhSachHienCo);
      const tapTrung = new Set(trung);
      const danhSach = words.map((tu) => ({ tu, trung: tapTrung.has(tu) }));
      setGoiY(danhSach);
      setDaChon(new Set(danhSach.flatMap((muc, index) => (muc.trung ? [] : [index]))));
    } catch (error) {
      setLoi(error.message);
    } finally {
      setDangTao(false);
    }
  }

  function doiChon(index) {
    setDaChon((hienTai) => {
      const moi = new Set(hienTai);
      if (moi.has(index)) moi.delete(index);
      else moi.add(index);
      return moi;
    });
  }

  const chiSoCoTheChon = goiY.flatMap((muc, index) => (muc.trung ? [] : [index]));
  const daChonHet = chiSoCoTheChon.length > 0 && chiSoCoTheChon.every((index) => daChon.has(index));

  return (
    <div className="space-y-4">
      <form onSubmit={taoTu} className="space-y-3">
        <NhomChip
          nhan="Cách tạo"
          giaTri={cachTao}
          onChon={setCachTao}
          luaChon={[
            { giaTri: "chu-de", nhan: "Theo chủ đề" },
            { giaTri: "doan-van", nhan: "Từ đoạn văn" },
          ]}
        />
        {cachTao === "chu-de" ? (
          <input
            type="text"
            value={chuDe}
            onChange={(event) => setChuDe(event.target.value)}
            maxLength={200}
            placeholder="VD: animals, du lịch, phỏng vấn xin việc"
            aria-label="Chủ đề"
            className={LOP_O_NHAP}
          />
        ) : (
          <textarea
            value={doanVan}
            onChange={(event) => setDoanVan(event.target.value)}
            maxLength={3000}
            rows={5}
            placeholder="Dán một đoạn văn tiếng Anh, AI sẽ chọn các từ nên học kèm nghĩa theo ngữ cảnh"
            aria-label="Đoạn văn tiếng Anh"
            className={`resize-none ${LOP_O_NHAP}`}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <NhomChip
            nhan="Số từ"
            giaTri={soLuong}
            onChon={setSoLuong}
            luaChon={SO_TU_AI.map((so) => ({ giaTri: so, nhan: `${so} từ` }))}
          />
          <button
            type="submit"
            disabled={dangTao || !(cachTao === "chu-de" ? chuDe.trim() : doanVan.trim())}
            className={LOP_NUT_CHINH}
          >
            {dangTao ? "AI đang tạo từ..." : "Tạo từ"}
          </button>
        </div>
        {loi && <p className="text-sm text-[var(--mau-loi)]" role="alert">{loi}</p>}
      </form>

      {goiY.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--mau-chu-phu)]">
              Đã chọn <strong className="text-[var(--mau-chu)]">{daChon.size}</strong>/{goiY.length} từ
            </p>
            <button
              type="button"
              onClick={() => setDaChon(daChonHet ? new Set() : new Set(chiSoCoTheChon))}
              className="text-xs font-semibold text-[var(--mau-chinh)] hover:underline"
            >
              {daChonHet ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto rounded-lg border border-[var(--mau-vien)] px-3">
            {goiY.map((muc, index) => (
              <DongTu key={`${muc.tu.term_en}-${index}`} tu={muc.tu}>
                <input
                  type="checkbox"
                  checked={daChon.has(index)}
                  disabled={muc.trung}
                  onChange={() => doiChon(index)}
                  aria-label={`Chọn ${muc.tu.term_en}`}
                  className="mt-1 h-4 w-4 accent-[var(--mau-chinh)]"
                />
              </DongTu>
            ))}
          </ul>
          {goiY.some((muc) => muc.trung) && (
            <p className="mt-1.5 text-xs text-[var(--mau-chu-phu)]">Từ bị khoá đã có trong bộ.</p>
          )}
        </div>
      )}

      <div className="ui-form-actions">
        <button type="button" onClick={onHuy} className={LOP_NUT_PHU}>
          Hủy
        </button>
        <button
          type="button"
          onClick={() => onNhap(goiY.filter((_, index) => daChon.has(index)).map((muc) => muc.tu))}
          disabled={daChon.size === 0 || dangLuu}
          className={LOP_NUT_CHINH}
        >
          {dangLuu ? "Đang thêm..." : `Thêm ${daChon.size} từ đã chọn`}
        </button>
      </div>
    </div>
  );
}

/**
 * NhapNhanhTu — thêm nhiều từ một lần (giống luyentu): dán danh sách hoặc để AI tạo.
 * onNhap(cards) nhận danh sách { term_en, pronunciation, part_of_speech, meaning_vi, example_sentence, note }.
 */
export default function NhapNhanhTu({ danhSachHienCo, dangLuu, onNhap, onHuy }) {
  const [tab, setTab] = useState("dan");

  return (
    <div className="space-y-4">
      <NhomChip
        nhan="Cách thêm từ"
        giaTri={tab}
        onChon={setTab}
        luaChon={[
          { giaTri: "dan", nhan: "Dán danh sách" },
          { giaTri: "ai", nhan: "Tạo bằng AI" },
        ]}
      />
      {tab === "dan" ? (
        <TabDanDanhSach danhSachHienCo={danhSachHienCo} dangLuu={dangLuu} onNhap={onNhap} onHuy={onHuy} />
      ) : (
        <TabTaoBangAI danhSachHienCo={danhSachHienCo} dangLuu={dangLuu} onNhap={onNhap} onHuy={onHuy} />
      )}
    </div>
  );
}
