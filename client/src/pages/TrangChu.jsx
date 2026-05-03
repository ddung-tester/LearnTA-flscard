import { Link } from "react-router-dom";

/**
 * TrangChu — Trang gioi thieu chinh.
 * Layout rieng (khong dung BoCuc), centered vertically.
 */
function TrangChu() {
  return (
    <div className="min-h-screen bg-[var(--mau-nen)] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold text-[var(--mau-chu)] mb-3 leading-tight">
          Streak Drop
        </h1>
        <p className="text-[var(--mau-chu-phu)] mb-2 text-lg">
          Học từ vựng tiếng Anh hiệu quả
        </p>
        <p className="text-[var(--mau-chu-phu)] mb-8 text-sm max-w-xs mx-auto">
          Tạo bộ từ, học bằng flashcard, làm quiz — trả lời đúng liên tục để
          mở khóa Streak Drop.
        </p>

        <Link
          to="/decks"
          className="inline-block bg-[var(--mau-chinh)] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Bắt đầu học
        </Link>
      </div>
    </div>
  );
}

export default TrangChu;
