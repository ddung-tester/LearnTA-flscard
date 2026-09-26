import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import ThanhTienDoLoTrinh from "../components/common/ThanhTienDoLoTrinh";
import { layDanhSachLoTrinh } from "../services/roadmapApi";

/**
 * TrangLoTrinh — danh sách lộ trình học có sẵn (giống luyentu), kèm tiến độ khi đã đăng nhập.
 */
function TrangLoTrinh() {
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({ xong: false, danhSach: [], loi: "" });

  useLayoutEffect(() => {
    setPageDataLoading("roadmap", !trangThai.xong);
    return () => setPageDataLoading("roadmap", false);
  }, [trangThai.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    layDanhSachLoTrinh()
      .then((danhSach) => {
        if (conHieuLuc) setTrangThai({ xong: true, danhSach, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setTrangThai({ xong: true, danhSach: [], loi: error.message });
      });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated]);

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">Lộ trình học</h2>
          <p className="text-sm text-[var(--mau-chu-phu)]">
            Học theo thứ tự từ cơ bản đến nâng cao, không phải đoán nên học gì tiếp theo.
          </p>
        </div>
      </div>

      {trangThai.xong && trangThai.danhSach.length === 0 && (
        <p className="text-sm text-[var(--mau-chu-phu)]">
          {trangThai.loi ? "Không tải được lộ trình. Thử lại sau." : "Chưa có lộ trình nào."}
        </p>
      )}

      <div className="roadmap-grid">
        {trangThai.danhSach.map((loTrinh) => (
          <Link key={loTrinh.slug} to={`/roadmap/${loTrinh.slug}`} className="roadmap-card">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="roadmap-card__title">{loTrinh.title}</h3>
              {loTrinh.level_label && (
                <span className="ui-chip ui-chip--small ui-chip--primary">{loTrinh.level_label}</span>
              )}
            </div>
            {loTrinh.description && <p className="roadmap-card__desc">{loTrinh.description}</p>}
            <p className="roadmap-card__meta">
              {loTrinh.deck_count} chặng · {loTrinh.word_count} từ
            </p>
            {isAuthenticated && (
              <ThanhTienDoLoTrinh
                tongSo={loTrinh.word_count}
                daHoc={loTrinh.learned_count}
                daThuoc={loTrinh.mastered_count}
              />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TrangLoTrinh;
