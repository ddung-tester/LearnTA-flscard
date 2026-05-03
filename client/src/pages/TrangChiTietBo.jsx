import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";
import { dinhDangNgayHoc, layTienDoDeck } from "../utils/tienDoHocTap";

const FORM_TU_RONG = {
  word: "",
  meaning: "",
  example: "",
};

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
    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
  }

  function moFormImport() {
    setNoiDungImport("");
    setKetQuaImport(null);
    setDangMoImport(true);
  }

  function dongFormImport() {
    setDangMoImport(false);
    setNoiDungImport("");
    setKetQuaImport(null);
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
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  const soTu = danhSach.length;
  const soThuanThuc = bo.masteredCount ?? 0;
  const soYeu = Math.max(0, soTu - soThuanThuc);
  const streak = bo.streak ?? 0;
  const coTheQuiz = soTu >= 4;
  const tienDo = layTienDoDeck(boId);
  const ngayHocGanNhat = dinhDangNgayHoc(tienDo?.lastActivityAt);

  return (
    <div>
      <Link
        to="/decks"
        className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
      >
        ← Danh sách bộ từ
      </Link>

      <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mt-2">
        {bo.title}
      </h2>
      {bo.description && (
        <p className="text-[var(--mau-chu-phu)] mt-1 mb-5">{bo.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Tổng từ
          </p>
          <p className="text-2xl font-mono font-bold text-[var(--mau-chu)]">
            {soTu}
          </p>
        </div>
        <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Thuần thục
          </p>
          <p className="text-2xl font-mono font-bold text-[var(--mau-thanh-cong)]">
            {soThuanThuc}
          </p>
        </div>
        <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Cần ôn
          </p>
          <p className="text-2xl font-mono font-bold text-[var(--mau-phu)]">
            {soYeu}
          </p>
        </div>
        <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Streak
          </p>
          <p className="text-2xl font-mono font-bold text-[var(--mau-chu)]">
            {streak > 0 ? streak : "-"}
          </p>
        </div>
      </div>

      <div className="border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-4 py-4 mb-8">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Tiến độ học tập
        </p>

        {tienDo ? (
          <div className="flex flex-wrap gap-2 text-sm text-[var(--mau-chu-phu)]">
            {tienDo.flashcard && (
                <span className="rounded-md border border-[var(--mau-thanh-cong)]/25 bg-[var(--mau-thanh-cong)]/5 px-3 py-1.5">
                Flashcard: nhớ {tienDo.flashcard.remembered}/{tienDo.flashcard.total}
              </span>
            )}
            {tienDo.quiz && (
              <span className="rounded-md border border-[var(--mau-vien)] bg-[var(--mau-vien)]/25 px-3 py-1.5">
                Quiz gần nhất: {tienDo.quiz.correct}/{tienDo.quiz.total}
              </span>
            )}
            {ngayHocGanNhat && (
              <span className="rounded-md border border-[var(--mau-phu)]/25 bg-[var(--mau-phu)]/10 px-3 py-1.5">
                Lần học gần nhất: {ngayHocGanNhat}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--mau-chu-phu)]">
            Chưa có phiên học nào.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <Link
          to={`/decks/${boId}/flashcard`}
          className="flex flex-col items-center justify-center gap-2 border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-5 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Học Flashcard</span>
          <span className="text-xs text-[var(--mau-chu-phu)] text-center">
            EN → VI · VI → EN
          </span>
        </Link>

        {coTheQuiz ? (
          <Link
            to={`/decks/${boId}/quiz`}
            className="flex flex-col items-center justify-center gap-2 border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-5 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            <span className="font-semibold text-[var(--mau-chinh)]">Làm Quiz</span>
            <span className="text-xs text-[var(--mau-chu-phu)] text-center">
              Trắc nghiệm 4 đáp án
            </span>
          </Link>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--mau-vien)] bg-[var(--mau-mat)] rounded-xl px-4 py-5 cursor-not-allowed opacity-60"
            title="Cần ít nhất 4 từ để làm quiz"
          >
            <span className="font-semibold text-[var(--mau-chu-phu)]">Làm Quiz</span>
            <span className="text-xs text-[var(--mau-chu-phu)] text-center">
              Cần ít nhất 4 từ để mở
            </span>
          </div>
        )}

        <Link
          to={`/decks/${boId}/tu-luan`}
          className="flex flex-col items-center justify-center gap-2 border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-5 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Tự luận</span>
          <span className="text-xs text-[var(--mau-chu-phu)] text-center">
            Gõ đáp án · VI ↔ EN
          </span>
        </Link>

        <button
          type="button"
          onClick={moFormThemTu}
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--mau-vien)] bg-[var(--mau-mat)] rounded-xl px-4 py-5 hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chu)]">Thêm từ</span>
          <span className="text-xs text-[var(--mau-chu-phu)] text-center">
            Thêm từ vựng mới
          </span>
        </button>

        <button
          type="button"
          onClick={moFormImport}
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--mau-vien)] bg-[var(--mau-mat)] rounded-xl px-4 py-5 hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chu)]">Import từ</span>
          <span className="text-xs text-[var(--mau-chu-phu)] text-center">
            Dán nhiều từ cùng lúc
          </span>
        </button>
      </div>

      <div>
        <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-4">
          Từ vựng ({soTu})
        </h3>

        {danhSach.length === 0 ? (
          <div className="text-center py-10 px-5 border border-dashed border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)]">
            <p className="text-[var(--mau-chu-phu)]">Chưa có từ nào.</p>
            <button
              type="button"
              onClick={moFormThemTu}
              className="inline-block mt-3 text-sm text-[var(--mau-chinh)] hover:underline"
            >
              + Thêm từ vựng đầu tiên
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {danhSach.map((the, i) => (
              <li
                key={the.id}
                className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <span className="text-xs font-mono text-[var(--mau-vien)] shrink-0 w-5 text-right">
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
                    className="w-full rounded-md border border-[var(--mau-vien)] px-3 py-1.5 text-xs font-medium text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors sm:w-auto sm:shrink-0"
                  >
                    Sửa
                  </button>
                </div>

                {the.example_sentence && (
                  <p className="text-sm text-[var(--mau-chu-phu)] mt-1.5 ml-8 italic">
                    {the.example_sentence}
                  </p>
                )}

                {the.note && (
                  <p className="text-xs text-[var(--mau-chu-phu)] mt-1 ml-8">
                    {the.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {dangMoForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#020817]/70 px-4 py-4 sm:items-center sm:py-6">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-4 shadow-[var(--bong-modal)] sm:p-5">
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
                className="rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={dongFormTu}
                  className="w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  {theDangSua ? "Lưu thay đổi" : "Thêm từ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dangMoImport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#020817]/70 px-4 py-4 sm:items-center sm:py-6">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-4 shadow-[var(--bong-modal)] sm:p-5">
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
                className="rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
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
                  className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder={"apple - quả táo\nbook, quyển sách\ncat | con mèo"}
                />
                <p className="mt-2 text-xs text-[var(--mau-chu-phu)]">
                  Mỗi dòng một từ. Hỗ trợ: word - meaning, word, meaning, word | meaning.
                </p>
              </div>

              {ketQuaImport && (
                <div className="rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-vien)]/20 px-3 py-2 text-sm text-[var(--mau-chu-phu)]">
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={dongFormImport}
                  className="w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Import từ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrangChiTietBo;
