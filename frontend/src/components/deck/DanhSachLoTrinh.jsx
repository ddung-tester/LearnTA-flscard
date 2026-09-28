import { Link } from "react-router-dom";
import ThanhTienDoLoTrinh from "../common/ThanhTienDoLoTrinh";

/**
 * DanhSachLoTrinh — lưới các lộ trình từ vựng công khai (dùng ở trang Khoá học của khách
 * và tab "Lộ trình" của trang Từ vựng).
 */
export default function DanhSachLoTrinh({ loTrinh, coLoi = false, hienTienDo = false }) {
  if (loTrinh.length === 0) {
    return (
      <p className="text-sm text-[var(--mau-chu-phu)]">
        {coLoi ? "Không tải được lộ trình. Thử lại sau." : "Chưa có lộ trình nào."}
      </p>
    );
  }

  return (
    <div className="roadmap-grid">
      {loTrinh.map((muc) => (
        <Link key={muc.slug} to={`/roadmap/${muc.slug}`} className="roadmap-card">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="roadmap-card__title">{muc.title}</h3>
            {muc.level_label && (
              <span className="ui-chip ui-chip--small ui-chip--primary">{muc.level_label}</span>
            )}
          </div>
          {muc.description && <p className="roadmap-card__desc">{muc.description}</p>}
          <p className="roadmap-card__meta">
            {muc.deck_count} chặng · {muc.word_count} từ
          </p>
          {hienTienDo && (
            <ThanhTienDoLoTrinh tongSo={muc.word_count} daHoc={muc.learned_count} daThuoc={muc.mastered_count} />
          )}
        </Link>
      ))}
    </div>
  );
}
