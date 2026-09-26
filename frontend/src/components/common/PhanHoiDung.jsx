import TenseExamplesCard from "./TenseExamplesCard";
import useTTS from "../../hooks/useTTS";
import { tachCauMau } from "../../utils/phienHoc";

function CauMau({ cau, tu }) {
  const { speak, isPlaying } = useTTS();
  if (!cau) return null;

  return (
    <figure className="mx-auto mb-3 max-w-xl rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat-2)] px-4 py-3 text-left">
      <figcaption className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--mau-chinh)]">
        Câu mẫu
      </figcaption>
      <div className="flex items-start justify-between gap-3">
        <p lang="en" className="text-base leading-relaxed text-[var(--mau-chu)]">
          {tachCauMau(cau, tu).map((doan, index) =>
            doan.laTu ? (
              <mark key={index} className="bg-transparent font-bold text-[var(--mau-chinh)]">
                {doan.text}
              </mark>
            ) : (
              <span key={index}>{doan.text}</span>
            )
          )}
        </p>
        <button
          type="button"
          onClick={() => speak(cau, "en-US")}
          className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] transition-colors hover:text-[var(--mau-chinh)] hover:border-[var(--mau-chinh)]/40${isPlaying ? " text-[var(--mau-chinh)] border-[var(--mau-chinh)]" : ""}`}
          title="Nghe câu mẫu"
          aria-label="Nghe câu mẫu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </div>
    </figure>
  );
}

/**
 * PhanHoiDung — phản hồi khi trả lời đúng, dùng chung cho các chế độ học:
 * "Chính xác!", câu mẫu của thẻ (nếu có) và ví dụ 6 thì kèm nút Tiếp tục.
 */
export default function PhanHoiDung({ the, termEn, meaningVi, onTiepTuc, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-3 text-center">
        <span className="ui-dau-cham ui-dau-cham--dung">Chính xác!</span>
      </div>
      <CauMau cau={the?.example_sentence} tu={termEn} />
      <TenseExamplesCard
        card={the}
        termEn={termEn}
        meaningVi={meaningVi}
        onTiepTuc={onTiepTuc}
        showContinueButton={true}
      />
    </div>
  );
}
