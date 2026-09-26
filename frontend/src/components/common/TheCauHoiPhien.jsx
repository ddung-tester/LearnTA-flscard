const KIEU_NHAN_HOI_LAI = {
  position: "absolute",
  top: "0.6rem",
  left: "0.75rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#b45309",
  background: "#fef3c7",
  border: "1px solid #fcd34d",
  borderRadius: "0.4rem",
  padding: "0.15rem 0.5rem",
};

function chanSuKien(event) {
  event.stopPropagation();
}

function IconLoa({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

/**
 * TheCauHoiPhien — thẻ câu hỏi dùng chung cho các chế độ học:
 * nhãn "Lỗi sai trước đây" khi hỏi lại, nút đọc câu hỏi, nội dung câu hỏi.
 * cheDoNghe: ẩn chữ, thay bằng nút phát âm lớn (Nghe viết).
 * cauHoiNho: cỡ chữ nhỏ hơn cho câu hỏi dài (Ngữ cảnh).
 * Đặt `key` theo câu hiện tại để chạy lại animation khi đổi câu.
 */
export default function TheCauHoiPhien({
  cauHoi,
  laCauHoiLai = false,
  dangRoiDi = false,
  dangDoc = false,
  onDoc,
  cheDoNghe = false,
  cauHoiNho = false,
  className = "",
}) {
  function doc(event) {
    event.preventDefault();
    event.stopPropagation();
    onDoc();
  }

  return (
    <section
      className={`ui-question-flow ui-the-cau-hoi relative text-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] ${className} ${dangRoiDi ? "ui-question-flow--leaving" : ""}`}
    >
      {laCauHoiLai && <span style={KIEU_NHAN_HOI_LAI}>⚠ Lỗi sai trước đây</span>}
      {cheDoNghe ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={doc}
            onMouseDown={chanSuKien}
            onPointerDown={chanSuKien}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--mau-chinh)] bg-[var(--mau-mat-2)] text-[var(--mau-chinh)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2${dangDoc ? " scale-105" : ""}`}
            aria-label="Nghe lại từ"
            title="Nghe lại từ"
          >
            <IconLoa className="h-9 w-9" />
          </button>
          <p className="text-sm font-medium text-[var(--mau-chu-phu)]">
            Nghe và gõ từ tiếng Anh
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`tts-speaker-btn tts-speaker-btn--corner${dangDoc ? " tts-speaker-btn--active" : ""}`}
            onClick={doc}
            onMouseDown={chanSuKien}
            onPointerDown={chanSuKien}
            aria-label="Đọc câu hỏi"
            title="Đọc câu hỏi"
          >
            <IconLoa />
          </button>
          <h2
            className={`font-semibold text-[var(--mau-chu)] leading-snug ${cauHoiNho ? "text-xl sm:text-2xl" : "text-3xl sm:text-[2.25rem]"}`}
          >
            {cauHoi}
          </h2>
        </>
      )}
    </section>
  );
}
