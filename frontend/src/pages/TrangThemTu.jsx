import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { layDeckTheoId } from "../services/deckApi";
import { taoCard, sinhCauMauAI } from "../services/cardApi";
import { getTenseExamples, TENSE_META, getWordType } from "../data/tenseExamples";

/**
 * TrangThemTu — Form them tu vung vao bo.
 * Luu tu va cau vi du qua API.
 */
function TrangThemTu() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let active = true;
    layDeckTheoId(boId).then((deck) => { if (active) setBo(deck); })
      .catch((error) => { if (active) setLoi(error.message); })
      .finally(() => { if (active) setDangTai(false); });
    return () => { active = false; };
  }, [boId]);

  const [tuMoi, setTuMoi] = useState({
    term_en: "",
    meaning_vi: "",
    example_sentence: "",
    note: "",
  });

  // Câu mẫu AI (đã sinh, sẽ lưu kèm vào DB khi submit)
  const [aiExamples, setAiExamples] = useState(null);
  const [dangSinhAI, setDangSinhAI] = useState(false);
  const [loiAI, setLoiAI] = useState("");

  const [termDebounced, setTermDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setTermDebounced(tuMoi.term_en.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [tuMoi.term_en]);

  // Reset câu AI khi từ hoặc nghĩa thay đổi
  useEffect(() => {
    setAiExamples(null);
    setLoiAI("");
  }, [tuMoi.term_en, tuMoi.meaning_vi]);

  // Sinh preview câu ví dụ tĩnh (fallback) theo thì
  const previewExamples = useMemo(() => {
    if (aiExamples) return aiExamples;
    if (!termDebounced) return [];
    const fakeCard = { term_en: termDebounced, meaning_vi: tuMoi.meaning_vi.trim() };
    return getTenseExamples(fakeCard);
  }, [termDebounced, tuMoi.meaning_vi, aiExamples]);

  const wordType = useMemo(() => getWordType(termDebounced), [termDebounced]);

  const [danhSachDaLuu, setDanhSachDaLuu] = useState([]);
  const toast = useToast();

  async function xuLySinhAI() {
    const term = tuMoi.term_en.trim();
    const meaning = tuMoi.meaning_vi.trim();
    if (!term || !meaning) {
      setLoiAI("Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt trước.");
      return;
    }
    setDangSinhAI(true);
    setLoiAI("");
    setAiExamples(null);
    try {
      const examples = await sinhCauMauAI({ term_en: term, meaning_vi: meaning });
      setAiExamples(examples);
    } catch (err) {
      setLoiAI(err?.response?.data?.message || err.message || "Không thể sinh câu AI. Vui lòng thử lại.");
    } finally {
      setDangSinhAI(false);
    }
  }

  if (dangTai) return <p role="status">Đang tải bộ từ...</p>;

  if (!bo) {
    return (
      <div className="text-center py-12">
        <p role="alert" className="text-[var(--mau-chu-phu)]">{loi || "Không tìm thấy bộ từ."}</p>
        <Link
          to="/decks"
          className="ui-back-link ui-back-link--quiet mt-4"
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

  async function xuLyGui(e) {
    e.preventDefault();
    if (dangLuu || !tuMoi.term_en.trim() || !tuMoi.meaning_vi.trim()) return;
    setDangLuu(true);
    try {
      const payload = { ...tuMoi };
      if (aiExamples) payload.tense_examples = aiExamples;
      const card = await taoCard(boId, payload);
      setDanhSachDaLuu((truoc) => [...truoc, card]);
      setTuMoi({ term_en: "", meaning_vi: "", example_sentence: "", note: "" });
      setAiExamples(null);
      toast.success("Đã lưu từ và câu ví dụ");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="ui-content-enter ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <Link
            to={`/decks/${boId}`}
            className="ui-back-link ui-back-link--quiet ui-back-link--wide"
          >
            ← {bo.title}
          </Link>

          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
            Thêm từ vựng
          </h2>
        </div>
      </div>

      <form
        onSubmit={xuLyGui}
        className="ui-form-panel max-w-lg space-y-4 shadow-[var(--bong-card)]"
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
          <p className="mt-1.5 text-xs text-[var(--mau-chu-phu)]">Dùng hiện tại đơn, hiện tại tiếp diễn hoặc quá khứ đơn.</p>
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

        {/* Nút sinh câu AI */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={xuLySinhAI}
            disabled={dangSinhAI || !tuMoi.term_en.trim() || !tuMoi.meaning_vi.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--mau-chinh)] text-[var(--mau-chinh)] text-sm font-medium hover:bg-[var(--mau-chinh)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {dangSinhAI ? (
              <>
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-[var(--mau-chinh)] border-t-transparent rounded-full" />
                Đang sinh câu AI...
              </>
            ) : (
              <>✨ Sinh câu ví dụ AI</>
            )}
          </button>
          {aiExamples && (
            <span className="text-xs text-emerald-500 font-medium">✓ Đã sinh {aiExamples.length} câu mẫu — sẽ lưu kèm khi thêm từ</span>
          )}
          {loiAI && (
            <span className="text-xs text-red-500">{loiAI}</span>
          )}
        </div>

        <div className="ui-form-actions">
          <button
            type="submit"
            disabled={dangLuu}
            className="ui-button ui-button--primary w-full rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] transition-colors sm:w-auto"
          >
            {dangLuu ? "Đang lưu..." : "Thêm từ"}
          </button>
        </div>
      </form>

      {/* Preview câu ví dụ theo thì */}
      {previewExamples.length > 0 && (
        <div className="rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat-2,var(--mau-nen))] p-3 space-y-2 max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--mau-chu-phu)]">
              {aiExamples ? "✦ Câu ví dụ AI theo 6 thì" : "✦ Câu ví dụ tự động theo 6 thì"}
            </p>
            {aiExamples && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                AI ✓
              </span>
            )}
            {!aiExamples && wordType && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `color-mix(in srgb, ${wordType.color} 14%, transparent)`, color: wordType.color }}
              >
                {wordType.abbr} {wordType.nameVi}
              </span>
            )}
          </div>
          <ul className="space-y-1.5">
            {previewExamples.map((item) => (
              <li key={item.tense} className="text-xs flex items-start gap-2">
                <span className="font-semibold text-[var(--mau-chinh)] min-w-[70px]">{TENSE_META[item.tense]?.labelVi || item.tense}:</span>
                <span className="text-[var(--mau-chu)] italic">"{item.sentence}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danh sach tu vua luu */}
      {danhSachDaLuu.length > 0 && (
        <div className="ui-content-enter ui-section-stack">
          <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
            Vừa thêm ({danhSachDaLuu.length})
          </h3>
          <ul className="ui-card-list">
            {danhSachDaLuu.map((tu) => (
              <li
                key={tu.id}
                className="ui-reading-card flex flex-wrap gap-x-2 gap-y-1 rounded-lg border border-[var(--mau-chinh)]/30 bg-[var(--mau-chinh)]/5 px-4 py-2"
              >
                <span className="break-words font-semibold">{tu.term_en}</span>
                <span className="mx-2 text-[var(--mau-vien)]">—</span>
                <span className="break-words">{tu.meaning_vi}</span>
                {tu.example_sentence && <p lang="en" className="w-full text-sm text-[var(--mau-chu-phu)]">{tu.example_sentence}</p>}
                {tu.tense_examples && (
                  <p className="w-full text-[10px] text-emerald-500 font-medium mt-0.5">✓ Có câu mẫu AI</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--mau-chu-phu)] mt-2">
            Đã lưu vào bộ từ. Bạn có thể quay lại để học ngay.
          </p>
        </div>
      )}

    </div>
  );
}

export default TrangThemTu;
