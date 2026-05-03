import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { layBoTheoId } from "../data/duLieuMau";

/**
 * TrangThemTu — Form them tu vung vao bo.
 * Phase 1: chi luu vao state tam, khong goi backend.
 */
function TrangThemTu() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);

  const [tuMoi, setTuMoi] = useState({
    term_en: "",
    meaning_vi: "",
    example_sentence: "",
    note: "",
  });
  const [danhSachDaLuu, setDanhSachDaLuu] = useState([]);

  if (!bo) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--mau-chu-phu)]">Không tìm thấy bộ từ.</p>
        <Link
          to="/decks"
          className="inline-block mt-4 text-[var(--mau-chinh)] hover:underline"
        >
          ← Quay lại
        </Link>
      </div>
    );
  }

  function xuLyThayDoi(e) {
    const { name, value } = e.target;
    setTuMoi((truoc) => ({ ...truoc, [name]: value }));
  }

  function xuLyGui(e) {
    e.preventDefault();
    if (!tuMoi.term_en.trim() || !tuMoi.meaning_vi.trim()) return;

    setDanhSachDaLuu((truoc) => [
      ...truoc,
      { ...tuMoi, id: Date.now() },
    ]);
    setTuMoi({ term_en: "", meaning_vi: "", example_sentence: "", note: "" });
  }

  return (
    <div>
      <Link
        to={`/decks/${boId}`}
        className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
      >
        ← {bo.title}
      </Link>

      <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mt-2 mb-6">
        Thêm từ vựng
      </h2>

      <form
        onSubmit={xuLyGui}
        className="max-w-lg space-y-4 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-4 shadow-[var(--bong-card)] sm:p-5"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--mau-chu)] mb-1">
            Từ tiếng Anh *
          </label>
          <input
            type="text"
            name="term_en"
            value={tuMoi.term_en}
            onChange={xuLyThayDoi}
            placeholder="Ví dụ: apple"
            className="w-full border border-[var(--mau-vien)] rounded-lg px-3 py-2 bg-[var(--mau-input)] text-[var(--mau-chu)] placeholder:text-[var(--mau-chu-mo)] focus:border-[var(--mau-chinh)] focus:outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--mau-chu)] mb-1">
            Nghĩa tiếng Việt *
          </label>
          <input
            type="text"
            name="meaning_vi"
            value={tuMoi.meaning_vi}
            onChange={xuLyThayDoi}
            placeholder="Ví dụ: quả táo"
            className="w-full border border-[var(--mau-vien)] rounded-lg px-3 py-2 bg-[var(--mau-input)] text-[var(--mau-chu)] placeholder:text-[var(--mau-chu-mo)] focus:border-[var(--mau-chinh)] focus:outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--mau-chu)] mb-1">
            Câu ví dụ (tuỳ chọn)
          </label>
          <input
            type="text"
            name="example_sentence"
            value={tuMoi.example_sentence}
            onChange={xuLyThayDoi}
            placeholder="Ví dụ: I eat an apple every morning."
            className="w-full border border-[var(--mau-vien)] rounded-lg px-3 py-2 bg-[var(--mau-input)] text-[var(--mau-chu)] placeholder:text-[var(--mau-chu-mo)] focus:border-[var(--mau-chinh)] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--mau-chu)] mb-1">
            Ghi chú (tuỳ chọn)
          </label>
          <input
            type="text"
            name="note"
            value={tuMoi.note}
            onChange={xuLyThayDoi}
            placeholder="Ghi chú thêm"
            className="w-full border border-[var(--mau-vien)] rounded-lg px-3 py-2 bg-[var(--mau-input)] text-[var(--mau-chu)] placeholder:text-[var(--mau-chu-mo)] focus:border-[var(--mau-chinh)] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] transition-colors sm:w-auto"
        >
          Thêm từ
        </button>
      </form>

      {/* Danh sach tu vua them (tam thoi, chua luu backend) */}
      {danhSachDaLuu.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
            Vừa thêm ({danhSachDaLuu.length})
          </h3>
          <ul className="space-y-2">
            {danhSachDaLuu.map((tu) => (
              <li
                key={tu.id}
                className="flex flex-wrap gap-x-2 gap-y-1 rounded-lg border border-[var(--mau-chinh)]/30 bg-[var(--mau-chinh)]/5 px-4 py-2"
              >
                <span className="break-words font-semibold">{tu.term_en}</span>
                <span className="mx-2 text-[var(--mau-vien)]">—</span>
                <span className="break-words">{tu.meaning_vi}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--mau-chu-phu)] mt-2">
            * Dữ liệu tạm. Sẽ lưu vào database khi kết nối backend.
          </p>
        </div>
      )}
    </div>
  );
}

export default TrangThemTu;
