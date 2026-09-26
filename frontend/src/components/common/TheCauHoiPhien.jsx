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

/**
 * TheCauHoiPhien — thẻ câu hỏi dùng chung cho các chế độ học:
 * nhãn "Lỗi sai trước đây" khi hỏi lại, nút đọc câu hỏi, nội dung câu hỏi.
 * Đặt `key` theo câu hiện tại để chạy lại animation khi đổi câu.
 */
export default function TheCauHoiPhien({
  cauHoi,
  laCauHoiLai = false,
  dangRoiDi = false,
  dangDoc = false,
  onDoc,
  className = "",
}) {
  return (
    <section
      className={`ui-question-flow ui-the-cau-hoi relative text-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] ${className} ${dangRoiDi ? "ui-question-flow--leaving" : ""}`}
    >
      {laCauHoiLai && <span style={KIEU_NHAN_HOI_LAI}>⚠ Lỗi sai trước đây</span>}
      <button
        type="button"
        className={`tts-speaker-btn tts-speaker-btn--corner${dangDoc ? " tts-speaker-btn--active" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDoc();
        }}
        onMouseDown={chanSuKien}
        onPointerDown={chanSuKien}
        aria-label="Đọc câu hỏi"
        title="Đọc câu hỏi"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      </button>
      <h2 className="text-3xl font-semibold text-[var(--mau-chu)] sm:text-[2.25rem] leading-snug">
        {cauHoi}
      </h2>
    </section>
  );
}
