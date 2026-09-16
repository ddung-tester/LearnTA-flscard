import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import "./TenseExamplesCard.css";
import { getTenseExamples, TENSE_META, getWordType } from "../../data/tenseExamples";
import useTTS from "../../hooks/useTTS";

const SPRING = { type: "spring", stiffness: 280, damping: 24, mass: 0.85 };

/**
 * TenseItem — card một thì.
 * Phải là top-level component (không định nghĩa bên trong TenseExamplesCard)
 * để React không unmount/remount mỗi render → tránh animation giật 2 lần.
 */
function TenseItem({ item, side, delay = 0, onSpeak, isSpeaking }) {
  const meta = TENSE_META[item.tense] || {
    nameVi: item.tense,
    nameEn: "",
    badgeColor: "var(--mau-chinh)",
  };
  const xFrom = side === "left" ? "-110%" : "110%";

  return (
    <motion.div
      className="tec-item"
      initial={{ opacity: 0, x: xFrom }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: xFrom }}
      transition={{ ...SPRING, delay }}
    >
      <div className="tec-item__header">
        <div className="tec-item__badges">
          <span
            className="tec-item__tense-badge"
            style={{
              background: `color-mix(in srgb, ${meta.badgeColor} 14%, transparent)`,
              color: meta.badgeColor,
            }}
          >
            {meta.nameVi}
          </span>
          {meta.nameEn && (
            <span className="tec-item__tense-en">({meta.nameEn})</span>
          )}
        </div>
        {item.formula && (
          <div className="tec-item__formula">
            <span className="tec-item__formula-label">Cấu trúc:</span>
            <span className="tec-item__formula-value">{item.formula}</span>
          </div>
        )}
      </div>

      <div className="tec-item__sentence-row">
        <p className="tec-item__sentence">{item.sentence}</p>
        <button
          type="button"
          onClick={() => onSpeak(item.sentence)}
          className={`tec-item__speak-btn${isSpeaking ? " tec-item__speak-btn--active" : ""}`}
          title="Nghe câu này"
          aria-label={`Nghe câu ví dụ ${meta.nameVi}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </div>

      {item.translation && (
        <p className="tec-item__translation">{item.translation}</p>
      )}
    </motion.div>
  );
}

/**
 * TenseExamplesCard
 * Trên màn hình rộng (≥1100px): 2 panel fixed trượt từ 2 bên vào.
 * Dưới 1100px: inline card như cũ.
 */
export default function TenseExamplesCard({
  card,
  termEn,
  meaningVi,
  onTiepTuc,
  showContinueButton = true,
  autoFocusContinue = false,
  compact = false,
}) {
  const { speak, isPlaying } = useTTS();
  const [readingSentence, setReadingSentence] = useState(null);
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 1100);
  const continueBtnRef = useRef(null);

  const effectiveTermEn = termEn || card?.term_en || "";
  const effectiveMeaningVi = meaningVi || card?.meaning_vi || "";
  const examples = getTenseExamples(card || effectiveTermEn);
  const wordType = getWordType(effectiveTermEn);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const handler = (e) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  if (!examples || examples.length === 0) return null;

  const leftItems = examples.filter((_, i) => i % 2 === 0);   // 0, 2, 4
  const rightItems = examples.filter((_, i) => i % 2 === 1);  // 1, 3, 5

  // Nút Tiếp tục nổi dưới giữa
  const ContinueBar = showContinueButton && onTiepTuc && (
    <motion.div
      key="tec-continue"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ ...SPRING, delay: 0.28 }}
      className="tec-continue-bar"
    >
      <span className="tec-continue-hint">
        Nhấn <kbd className="tec-continue-kbd">Enter ↵</kbd> để tiếp tục
      </span>
      <button
        ref={continueBtnRef}
        type="button"
        onClick={onTiepTuc}
        className="ui-button ui-button--primary tec-continue-btn"
      >
        <span>Tiếp tục</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="tec-arrow-icon">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </motion.div>
  );

  // ── Chế độ rộng: 2 panel fixed 2 bên ──────────────────────────────
  if (isWide) {
    return createPortal(
      <>
        {/* Panel trái — HT đơn */}
        <div className="tec-panel tec-panel--left">
          <div className="tec-panel__word-label">
            <span className="tec-panel__word">{effectiveTermEn}</span>
            {wordType && (
              <span
                className="tec-panel__pos-badge"
                style={{ background: `color-mix(in srgb, ${wordType.color} 16%, transparent)`, color: wordType.color }}
              >
                {wordType.abbr} {wordType.nameVi}
              </span>
            )}
            {effectiveMeaningVi && (
              <span className="tec-panel__meaning">• {effectiveMeaningVi}</span>
            )}
          </div>
          <AnimatePresence>
            {leftItems.map((item, i) => (
              <TenseItem
                key={item.tense}
                item={item}
                side="left"
                delay={i * 0.1}
                onSpeak={handleSpeak}
                isSpeaking={readingSentence === item.sentence && isPlaying}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Panel phải — HT tiếp diễn + QK đơn */}
        <div className="tec-panel tec-panel--right">
          <AnimatePresence>
            {rightItems.map((item, i) => (
              <TenseItem
                key={item.tense}
                item={item}
                side="right"
                delay={i * 0.14}
                onSpeak={handleSpeak}
                isSpeaking={readingSentence === item.sentence && isPlaying}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Nút Tiếp tục */}
        <AnimatePresence>{ContinueBar}</AnimatePresence>
      </>,
      document.body
    );
  }

  // ── Chế độ hẹp: inline card ─────────────────────────────────────────
  return (
    <section
      className={`tense-examples-card w-full rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-4 sm:p-5 shadow-[var(--bong-card)] transition-all${compact ? " text-sm" : ""}`}
      style={{ animation: "slideUpFade 0.28s cubic-bezier(0.16, 1, 0.3, 1)" }}
      aria-label="Ví dụ 3 thì kèm cấu trúc ngữ pháp"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--mau-vien)] pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mau-chinh)]/15 text-[var(--mau-chinh)] text-xs font-bold">
            Aa
          </span>
          <h3 className="text-sm font-bold text-[var(--mau-chu)] flex items-center gap-2">
            <span>Ví dụ 6 thì cơ bản</span>
            {effectiveTermEn && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]">
                {effectiveTermEn}{effectiveMeaningVi ? ` • ${effectiveMeaningVi}` : ""}
              </span>
            )}
            {wordType && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `color-mix(in srgb, ${wordType.color} 14%, transparent)`, color: wordType.color }}
              >
                {wordType.abbr} {wordType.nameVi}
              </span>
            )}
          </h3>
        </div>
        <span className="text-[11px] font-mono tracking-wide text-[var(--mau-chu-phu)] hidden sm:inline-block">
          Ngữ pháp &amp; Đặt câu
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
        {examples.map((item, idx) => {
          const meta = TENSE_META[item.tense] || {
            nameVi: item.tense, nameEn: "", badgeColor: "var(--mau-chinh)",
          };
          const isSpeaking = readingSentence === item.sentence && isPlaying;
          return (
            <div
              key={`${item.tense}-${idx}`}
              className="rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat-2)] p-3 sm:p-3.5"
            >
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
              <div className="flex items-start justify-between gap-2.5">
                <p className="text-sm sm:text-base font-semibold text-[var(--mau-chu)] leading-snug">
                  {item.sentence}
                </p>
                <button
                  type="button"
                  onClick={() => handleSpeak(item.sentence)}
                  className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] transition-all hover:text-[var(--mau-chinh)] hover:border-[var(--mau-chinh)]/40${isSpeaking ? " text-[var(--mau-chinh)] border-[var(--mau-chinh)] scale-105" : ""}`}
                  title="Nghe câu này"
                  aria-label={`Nghe câu ví dụ ${meta.nameVi}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="h-3.5 w-3.5">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
              {item.translation && (
                <p className="mt-1 text-xs sm:text-[13px] text-[var(--mau-chu-phu)] italic leading-normal">
                  {item.translation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {showContinueButton && onTiepTuc && (
        <div className="mt-4 pt-3 border-t border-[var(--mau-vien)] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--mau-chu-phu)]">
            Nhấn{" "}
            <kbd className="px-1.5 py-0.5 rounded border border-[var(--mau-vien)] bg-[var(--mau-nen)] font-mono text-[11px] font-semibold text-[var(--mau-chu)]">
              Enter ↵
            </kbd>{" "}
            để tiếp tục
          </span>
          <button
            ref={continueBtnRef}
            type="button"
            onClick={onTiepTuc}
            className="ui-button ui-button--primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-[var(--bong-nut-phu)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span>Tiếp tục</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
