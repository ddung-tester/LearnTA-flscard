import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layDanhSachKhoaHoc } from "../services/courseApi";

/**
 * TrangKhoaHoc — các khoá học riêng của người dùng (tài liệu cá nhân) và danh sách bài.
 */
function TrangKhoaHoc() {
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({ xong: false, khoaHoc: [], loi: "" });

  useLayoutEffect(() => {
    setPageDataLoading("courses", !trangThai.xong);
    return () => setPageDataLoading("courses", false);
  }, [trangThai.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    layDanhSachKhoaHoc()
      .then((khoaHoc) => {
        if (conHieuLuc) setTrangThai({ xong: true, khoaHoc, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setTrangThai({ xong: true, khoaHoc: [], loi: error.message });
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  if (!trangThai.xong) return null;

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">Khoá học</h2>
          <p className="text-sm text-[var(--mau-chu-phu)]">Tài liệu riêng của bạn, người khác không xem được.</p>
        </div>
      </div>

      {trangThai.loi ? (
        <p className="text-sm text-[var(--mau-chu-phu)]">Không tải được khoá học. Thử lại sau.</p>
      ) : trangThai.khoaHoc.length === 0 ? (
        <p className="text-sm text-[var(--mau-chu-phu)]">Bạn chưa có khoá học nào.</p>
      ) : (
        trangThai.khoaHoc.map((khoa) => (
          <section key={khoa.id} className="khoa-hoc-khoa" aria-labelledby={`khoa-${khoa.id}`}>
            <h3 id={`khoa-${khoa.id}`} className="roadmap-card__title">
              {khoa.title}
            </h3>
            <ol className="roadmap-grid khoa-hoc-ds-bai">
              {khoa.lessons.map((bai) => (
                <li key={bai.lesson_number}>
                  <Link to={`/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`} className="roadmap-card">
                    <span className="khoa-hoc-so-bai">Bài {bai.lesson_number}</span>
                    <span className="roadmap-card__title">{bai.title}</span>
                    <span className="roadmap-card__meta">
                      {bai.word_count} từ · {bai.question_count} câu bài tập
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

export default TrangKhoaHoc;
