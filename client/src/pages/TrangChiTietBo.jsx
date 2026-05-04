import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AnimatedModal from "../components/common/AnimatedModal";
import ToastMessage from "../components/common/ToastMessage";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";

const FORM_TU_RONG = {
  word: "",
  meaning: "",
  example: "",
};

function IconPlus() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function NutIconQuanLyTu({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ui-icon-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
    >
      {children}
      <span className="ui-action-tooltip">{label}</span>
    </button>
  );
}

function parseDongImport(dong) {
  const noiDung = dong.trim();
  if (!noiDung) return null;

  const match = noiDung.match(/^(.+?)\s*(?:\s-\s|,|\|)\s*(.+)$/);
  if (!match) return null;

  const word = match[1].trim();
  const meaning = match[2].trim();

  if (!word || !meaning) return null;

  return { word, meaning };
}

function TrangChiTietBo() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const [danhSach, setDanhSach] = useState(() => layTheoBoId(boId));
  const [dangMoForm, setDangMoForm] = useState(false);
  const [theDangSua, setTheDangSua] = useState(null);
  const [formTu, setFormTu] = useState(FORM_TU_RONG);
  const [dangMoImport, setDangMoImport] = useState(false);
  const [noiDungImport, setNoiDungImport] = useState("");
  const [ketQuaImport, setKetQuaImport] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setDanhSach(layTheoBoId(boId));
    setDangMoForm(false);
    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangMoImport(false);
    setNoiDungImport("");
    setKetQuaImport(null);
  }, [boId]);

  function moFormThemTu() {
    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangMoForm(true);
  }

  function moFormSuaTu(the) {
    setTheDangSua(the);
    setFormTu({
      word: the.term_en,
      meaning: the.meaning_vi,
      example: the.example_sentence || "",
    });
    setDangMoForm(true);
  }

  function dongFormTu() {
    setDangMoForm(false);
  }

  function moFormImport() {
    setNoiDungImport("");
    setKetQuaImport(null);
    setDangMoImport(true);
  }

  function dongFormImport() {
    setDangMoImport(false);
  }

  function capNhatFormTu(event) {
    const { name, value } = event.target;
    setFormTu((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  function luuTu(event) {
    event.preventDefault();

    const word = formTu.word.trim();
    const meaning = formTu.meaning.trim();
    const example = formTu.example.trim();

    if (!word || !meaning) return;

    if (theDangSua) {
      setDanhSach((hienTai) =>
        hienTai.map((the) =>
          the.id === theDangSua.id
            ? {
                ...the,
                term_en: word,
                meaning_vi: meaning,
                example_sentence: example,
              }
            : the
        )
      );
    } else {
      const idMoi = Math.max(0, ...danhSach.map((the) => the.id)) + 1;

      setDanhSach((hienTai) => [
        ...hienTai,
        {
          id: idMoi,
          deck_id: boId,
          term_en: word,
          meaning_vi: meaning,
          example_sentence: example,
          note: "",
        },
      ]);
    }

    setToast(theDangSua ? "Đã lưu thay đổi từ vựng" : "Đã thêm từ mới");
    dongFormTu();
  }

  function importTu(event) {
    event.preventDefault();

    const cacDong = noiDungImport.split(/\r?\n/);
    const danhSachHopLe = [];
    let soDongBoQua = 0;

    cacDong.forEach((dong) => {
      if (!dong.trim()) return;

      const ketQua = parseDongImport(dong);
      if (!ketQua) {
        soDongBoQua += 1;
        return;
      }

      danhSachHopLe.push(ketQua);
    });

    if (danhSachHopLe.length === 0) {
      setKetQuaImport({
        thanhCong: 0,
        boQua: soDongBoQua,
      });
      setToast("Chưa có dòng import hợp lệ");
      return;
    }

    setDanhSach((hienTai) => {
      const idLonNhat = Math.max(0, ...hienTai.map((the) => the.id));
      const tuMoi = danhSachHopLe.map((the, index) => ({
        id: idLonNhat + index + 1,
        deck_id: boId,
        term_en: the.word,
        meaning_vi: the.meaning,
        example_sentence: "",
        note: "",
      }));

      return [...hienTai, ...tuMoi];
    });

    setNoiDungImport("");
    setKetQuaImport({
      thanhCong: danhSachHopLe.length,
      boQua: soDongBoQua,
    });
    setToast(`Đã import ${danhSachHopLe.length} từ`);
  }

  if (!bo) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-phu)] mb-3">
          Không tìm thấy
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này không tồn tại
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Kiểm tra lại đường dẫn hoặc quay về danh sách bộ từ để chọn một bộ khác.
        </p>
        <Link
          to="/decks"
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  const soTu = danhSach.length;
  const streak = bo.streak ?? 0;
  const coTheQuiz = soTu >= 4;

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <Link
            to="/decks"
            className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            ← Danh sách bộ từ
          </Link>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
            {bo.title}
          </h2>
        </div>
      </div>

      <div className="ui-stat-grid">
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">
            Tổng từ
          </p>
          <p className="ui-stat-value text-[var(--mau-chu)]">
            {soTu}
          </p>
        </div>
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">
            Streak
          </p>
          <p className="ui-stat-value text-[var(--mau-chu)]">
            {streak > 0 ? streak : "-"}
          </p>
        </div>
      </div>

      <div className="ui-action-grid">
        <Link
          to={`/decks/${boId}/flashcard`}
          className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Học Flashcard</span>
        </Link>

        {coTheQuiz ? (
          <Link
            to={`/decks/${boId}/quiz`}
            className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            <span className="font-semibold text-[var(--mau-chinh)]">Làm Quiz</span>
          </Link>
        ) : (
          <div
            className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-4 cursor-not-allowed opacity-60"
            title="Cần ít nhất 4 từ để làm quiz"
          >
            <span className="font-semibold text-[var(--mau-chu-phu)]">Làm Quiz</span>
          </div>
        )}

        <Link
          to={`/decks/${boId}/tu-luan`}
          className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Tự luận</span>
        </Link>

      </div>

      <div className="ui-section-stack">
        <div className="ui-section-header">
          <h3 className="text-sm font-semibold text-[var(--mau-chu)]">
            Từ vựng ({soTu})
          </h3>
          <div className="ui-control-cluster">
            <NutIconQuanLyTu label="Thêm từ" onClick={moFormThemTu}>
              <IconPlus />
            </NutIconQuanLyTu>
            <NutIconQuanLyTu label="Import từ" onClick={moFormImport}>
              <IconUpload />
            </NutIconQuanLyTu>
          </div>
        </div>

        {danhSach.length === 0 ? (
          <div className="ui-empty-panel border-dashed">
            <p className="text-[var(--mau-chu-phu)]">Chưa có từ nào.</p>
            <button
              type="button"
              onClick={moFormThemTu}
              className="ui-link mt-3 text-sm text-[var(--mau-chinh)] hover:underline"
            >
              + Thêm từ vựng đầu tiên
            </button>
          </div>
        ) : (
          <ul className="ui-card-list">
            {danhSach.map((the, i) => (
              <li
                key={the.id}
                className="ui-reading-card border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-4 py-3.5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mau-vien)] bg-[var(--mau-input)] text-xs font-semibold text-[var(--mau-chinh)]">
                      {i + 1}
                    </span>
                    <span className="break-words font-semibold text-[var(--mau-chu)]">
                      {the.term_en}
                    </span>
                    <span className="hidden sm:inline text-[var(--mau-vien)] shrink-0">-</span>
                    <span className="break-words text-[var(--mau-chu)]">
                      {the.meaning_vi}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => moFormSuaTu(the)}
                    className="ui-button ui-button--ghost w-full rounded-md border border-[var(--mau-vien)] px-3 py-1.5 text-xs font-medium text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors sm:w-auto sm:shrink-0"
                  >
                    Sửa
                  </button>
                </div>

                {the.example_sentence && (
                  <p className="text-sm text-[var(--mau-chu-phu)] mt-1.5 ml-8 italic">
                    {the.example_sentence}
                  </p>
                )}

              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatedModal
        open={dangMoForm}
        onClose={dongFormTu}
        className="ui-form-panel max-w-lg shadow-[var(--bong-modal)]"
      >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Từ vựng
                </p>
                <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
                  {theDangSua ? "Sửa từ" : "Thêm từ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={dongFormTu}
                className="ui-button ui-button--ghost rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={luuTu} className="space-y-4">
              <div>
                <label htmlFor="word" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                  Word
                </label>
                <input
                  id="word"
                  name="word"
                  value={formTu.word}
                  onChange={capNhatFormTu}
                  required
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="example"
                />
              </div>

              <div>
                <label htmlFor="meaning" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                  Meaning
                </label>
                <input
                  id="meaning"
                  name="meaning"
                  value={formTu.meaning}
                  onChange={capNhatFormTu}
                  required
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="nghĩa tiếng Việt"
                />
              </div>

              <div>
                <label htmlFor="example" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                  Example (optional)
                </label>
                <textarea
                  id="example"
                  name="example"
                  value={formTu.example}
                  onChange={capNhatFormTu}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="I use this word in a sentence."
                />
              </div>

              <div className="ui-form-actions">
                <button
                  type="button"
                  onClick={dongFormTu}
                  className="ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  {theDangSua ? "Lưu thay đổi" : "Thêm từ"}
                </button>
              </div>
            </form>
      </AnimatedModal>

      <AnimatedModal
        open={dangMoImport}
        onClose={dongFormImport}
        className="ui-form-panel max-w-lg shadow-[var(--bong-modal)]"
      >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Import nhanh
                </p>
                <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
                  Import từ
                </h3>
              </div>
              <button
                type="button"
                onClick={dongFormImport}
                className="ui-button ui-button--ghost rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={importTu} className="space-y-4">
              <div>
                <label
                  htmlFor="import-tu"
                  className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5"
                >
                  Danh sách từ
                </label>
                <textarea
                  id="import-tu"
                  value={noiDungImport}
                  onChange={(event) => setNoiDungImport(event.target.value)}
                  rows={9}
                  className="ui-import-zone w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder={"apple - quả táo\nbook, quyển sách\ncat | con mèo"}
                />
                <p className="mt-2 text-xs text-[var(--mau-chu-phu)]">
                  Mỗi dòng một từ. Hỗ trợ: word - meaning, word, meaning, word | meaning.
                </p>
              </div>

              {ketQuaImport && (
                <div className="ui-feedback-pop rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-vien)]/20 px-3 py-2 text-sm text-[var(--mau-chu-phu)]">
                  Import thành công:{" "}
                  <span className="font-semibold text-[var(--mau-thanh-cong)]">
                    {ketQuaImport.thanhCong}
                  </span>
                  . Bỏ qua:{" "}
                  <span className="font-semibold text-[var(--mau-phu)]">
                    {ketQuaImport.boQua}
                  </span>
                  .
                </div>
              )}

              <div className="ui-form-actions">
                <button
                  type="button"
                  onClick={dongFormImport}
                  className="ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Import từ
                </button>
              </div>
            </form>
      </AnimatedModal>
      <ToastMessage message={toast} onDone={() => setToast("")} />
    </div>
  );
}

export default TrangChiTietBo;
