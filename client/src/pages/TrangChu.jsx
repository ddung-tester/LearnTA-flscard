import { Link } from "react-router-dom";

/**
 * TrangChu — Trang gioi thieu chinh.
 * Layout rieng (khong dung BoCuc), centered vertically.
 */
function TrangChu() {
  return (
    <div className="ui-page-enter min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-8 text-center shadow-[var(--bong-card)] sm:px-8 sm:py-10">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold text-[var(--mau-chu)] mb-3 leading-tight">
          Streak Drop
        </h1>
        <p className="text-[var(--mau-chu)] mb-2 text-lg">
          Học từ vựng tiếng Anh hiệu quả
        </p>
        <p className="text-[var(--mau-chu-phu)] mb-8 text-sm max-w-xs mx-auto">
          Tạo bộ từ, học bằng flashcard, làm quiz — trả lời đúng liên tục để
          mở khóa Streak Drop.
        </p>

        <Link
          to="/decks"
          className="ui-button ui-button--primary inline-flex bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          Bắt đầu học
        </Link>
      </div>
    </div>
  );
}

export default TrangChu;
