import { useEffect, useRef, useState } from "react";
import { getTenseExamples, TENSE_META } from "../../data/tenseExamples";
import useTTS from "../../hooks/useTTS";

/**
 * TenseExamplesCard
 * Hiển thị 3 câu ví dụ tương ứng 3 thì:
 * - Hiện tại đơn
 * - Hiện tại tiếp diễn
 * - Quá khứ đơn
 * Kèm theo cấu trúc ngữ pháp (Formula) và dịch nghĩa tiếng Việt.
 */
export default function TenseExamplesCard({
  card,
  termEn,
  meaningVi,
  onTiepTuc,
  showContinueButton = true,
  autoFocusContinue = true,
  compact = false,
}) {
  const { speak, isPlaying } = useTTS();
  const [readingSentence, setReadingSentence] = useState(null);
  const continueBtnRef = useRef(null);

  const effectiveTermEn = termEn || card?.term_en || "";
  const effectiveMeaningVi = meaningVi || card?.meaning_vi || "";
  const examples = getTenseExamples(card || effectiveTermEn);

  useEffect(() => {
    if (autoFocusContinue && showContinueButton && continueBtnRef.current) {
      continueBtnRef.current.focus();
    }
  }, [autoFocusContinue, showContinueButton]);

  function handleSpeak(sentence) {
    if (readingSentence === sentence && isPlaying) {
      setReadingSentence(null);
      return;
    }
    setReadingSentence(sentence);
    speak(sentence, "en-US");
  }

  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <section
      className={`tense-examples-card w-full rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-4 sm:p-5 shadow-[var(--bong-card)] transition-all ${
        compact ? "text-sm" : ""
      }`}
      style={{
        animation: "slideUpFade 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      aria-label="Ví dụ 3 thì kèm cấu trúc ngữ pháp"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--mau-vien)] pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mau-chinh)]/15 text-[var(--mau-chinh)] text-xs font-bold">
            Aa
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--mau-chu)] flex items-center gap-2">
              <span>Ví dụ 3 thì cơ bản</span>
              {effectiveTermEn && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]">
                  {effectiveTermEn}
                  {effectiveMeaningVi ? ` • ${effectiveMeaningVi}` : ""}
                </span>
              )}
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-mono tracking-wide text-[var(--mau-chu-phu)] hidden sm:inline-block">
          Ngữ pháp & Đặt câu
        </span>
      </div>

      {/* Danh sách 3 thì */}
      <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
        {examples.map((item, idx) => {
          const meta = TENSE_META[item.tense] || {
            nameVi: item.tense,
            nameEn: "",
            badgeColor: "var(--mau-chinh)",
          };
          const isCurrentlySpeaking = readingSentence === item.sentence && isPlaying;

          return (
            <div
              key={`${item.tense}-${idx}`}
              className="rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-nen)]/60 p-3 sm:p-3.5 transition-colors hover:border-[var(--mau-chinh)]/30 hover:bg-[var(--mau-mat-hover)]"
            >
              {/* Tên thì & Cấu trúc */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${meta.badgeColor} 14%, transparent)`,
                      color: meta.badgeColor,
                    }}
                  >
                    {meta.nameVi}
                  </span>
                  {meta.nameEn && (
                    <span className="text-[11px] text-[var(--mau-chu-phu)] font-medium">
                      ({meta.nameEn})
                    </span>
                  )}
                </div>

                {item.formula && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--mau-mat)] border border-[var(--mau-vien)] px-2 py-0.5 text-[11px] font-mono text-[var(--mau-chu)] shadow-xs">
                    <span className="font-semibold text-[var(--mau-chu-phu)]">Cấu trúc:</span>
                    <span className="font-bold text-[var(--mau-chinh)]">{item.formula}</span>
                  </div>
                )}
              </div>

              {/* Câu ví dụ tiếng Anh */}
              <div className="flex items-start justify-between gap-2.5">
                <p className="text-sm sm:text-base font-semibold text-[var(--mau-chu)] leading-snug">
                  {item.sentence}
                </p>

                <button
                  type="button"
                  onClick={() => handleSpeak(item.sentence)}
                  className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] transition-all hover:text-[var(--mau-chinh)] hover:border-[var(--mau-chinh)]/40 ${
                    isCurrentlySpeaking ? "text-[var(--mau-chinh)] border-[var(--mau-chinh)] scale-105" : ""
                  }`}
                  title="Nghe câu này"
                  aria-label={`Nghe câu ví dụ ${meta.nameVi}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>

              {/* Nghĩa tiếng Việt */}
              {item.translation && (
                <p className="mt-1 text-xs sm:text-[13px] text-[var(--mau-chu-phu)] italic leading-normal">
                  {item.translation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Nút Tiếp tục (chủ động nhịp học) */}
      {showContinueButton && onTiepTuc && (
        <div className="mt-4 pt-3 border-t border-[var(--mau-vien)] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--mau-chu-phu)]">
            Nhấn <kbd className="px-1.5 py-0.5 rounded border border-[var(--mau-vien)] bg-[var(--mau-nen)] font-mono text-[11px] font-semibold text-[var(--mau-chu)]">Enter ↵</kbd> để tiếp tục
          </span>
          <button
            ref={continueBtnRef}
            type="button"
            onClick={onTiepTuc}
            className="ui-button ui-button--primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-[var(--bong-nut-phu)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span>Tiếp tục</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
