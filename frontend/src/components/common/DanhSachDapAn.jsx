/**
 * DanhSachDapAn — các nút đáp án trắc nghiệm dùng chung (Trắc nghiệm, Ngữ cảnh, Hỗn hợp).
 * Sau khi chọn: tô đáp án đúng, đánh dấu đáp án đã chọn nếu sai, làm mờ phần còn lại.
 */
export default function DanhSachDapAn({
  danhSachDapAn,
  dapAnDung,
  dapAnDaChon,
  onChon,
  dangRoiDi = false,
  khoa,
}) {
  const daTraLoi = dapAnDaChon !== null;

  return (
    <div
      className={`ui-question-flow ui-quiz-answer-list space-y-3 mb-6 ${dangRoiDi ? "ui-question-flow--leaving" : ""}`}
    >
      {danhSachDapAn.map((dapAn, index) => {
        const laDapAnDaChon = dapAn === dapAnDaChon;
        const laDapAnDung = dapAn === dapAnDung;

        let lopTrangThai =
          "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

        if (daTraLoi) {
          if (laDapAnDung) {
            lopTrangThai = "ui-answer-correct text-[var(--mau-chu)]";
          } else if (laDapAnDaChon) {
            lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)]";
          } else {
            lopTrangThai = "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] opacity-50";
          }
        }

        return (
          <button
            key={`${khoa}-${index}-${dapAn}`}
            type="button"
            onClick={() => onChon(dapAn)}
            disabled={daTraLoi}
            className={`ui-reading-card min-h-12 w-full rounded-lg border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors ${lopTrangThai}`}
          >
            <kbd className="ui-answer-phim" aria-hidden="true">
              {index + 1}
            </kbd>
            <span className="break-words">{dapAn}</span>
            {daTraLoi && (laDapAnDung || laDapAnDaChon) && (
              <svg
                className="ui-answer-dau"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label={laDapAnDung ? "Đáp án đúng" : "Đáp án bạn chọn, chưa đúng"}
              >
                {laDapAnDung ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * PhanHoiSaiTracNghiem — thông báo đáp án đúng sau khi chọn sai, kèm nút Tiếp tục.
 */
export function PhanHoiSaiTracNghiem({ dapAnDung, onTiepTuc }) {
  return (
    <div className="ui-feedback-pop ui-quiz-feedback text-center mt-4 mb-6">
      <p className="text-sm font-medium text-[var(--mau-loi)] mb-3">
        Chưa đúng. Đáp án đúng là: <span className="font-bold">{dapAnDung}</span>
      </p>
      <button
        type="button"
        onClick={onTiepTuc}
        className="ui-button ui-button--primary px-5 py-2 text-xs font-bold rounded-xl shadow-sm"
      >
        Tiếp tục (Enter ↵)
      </button>
    </div>
  );
}
