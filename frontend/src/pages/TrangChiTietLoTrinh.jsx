import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import ThanhTienDoLoTrinh from "../components/common/ThanhTienDoLoTrinh";
import { layLoTrinh } from "../services/roadmapApi";

// Chặng đầu tiên chưa học xong (theo số từ đã học) là chặng nên học tiếp
function timChangHocTiep(decks) {
  const chiSo = decks.findIndex((bo) => bo.learned_count < bo.word_count);
  return chiSo === -1 ? null : chiSo;
}

/**
 * TrangChiTietLoTrinh — các chặng (bộ từ) của một lộ trình theo thứ tự, kèm tiến độ từng chặng.
 */
function TrangChiTietLoTrinh() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({ slug: null, loTrinh: null, loi: "" });
  const dangTai = trangThai.slug !== slug;

  useLayoutEffect(() => {
    setPageDataLoading("roadmap-detail", dangTai);
    return () => setPageDataLoading("roadmap-detail", false);
  }, [dangTai, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    layLoTrinh(slug)
      .then((loTrinh) => {
        if (conHieuLuc) setTrangThai({ slug, loTrinh, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setTrangThai({ slug, loTrinh: null, loi: error.message });
      });
    return () => {
      conHieuLuc = false;
    };
  }, [slug, isAuthenticated]);

  if (dangTai) return null;

  const { loTrinh } = trangThai;
  if (!loTrinh) {
    return (
      <div className="ui-page-stack">
        <Link to="/roadmap" className="ui-back-link ui-back-link--quiet">&larr; Lộ trình</Link>
        <p className="text-sm text-[var(--mau-chu-phu)]">Không tìm thấy lộ trình này.</p>
      </div>
    );
  }

  const tong = loTrinh.decks.reduce(
    (cong, bo) => ({
      tu: cong.tu + bo.word_count,
      hoc: cong.hoc + bo.learned_count,
      thuoc: cong.thuoc + bo.mastered_count,
    }),
    { tu: 0, hoc: 0, thuoc: 0 }
  );
  const changHocTiep = isAuthenticated ? timChangHocTiep(loTrinh.decks) : 0;

  return (
    <div className="ui-page-stack">
      <Link to="/roadmap" className="ui-back-link ui-back-link--quiet">&larr; Lộ trình</Link>

      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">{loTrinh.title}</h2>
            {loTrinh.level_label && (
              <span className="ui-chip ui-chip--small ui-chip--primary">{loTrinh.level_label}</span>
            )}
          </div>
          {loTrinh.description && (
            <p className="text-sm text-[var(--mau-chu-phu)]">{loTrinh.description}</p>
          )}
        </div>
      </div>

      {isAuthenticated ? (
        <ThanhTienDoLoTrinh tongSo={tong.tu} daHoc={tong.hoc} daThuoc={tong.thuoc} />
      ) : (
        <p className="text-sm text-[var(--mau-chu-phu)]">
          <Link to="/login" className="ui-link font-semibold text-[var(--mau-chinh)]">Đăng nhập</Link>{" "}
          để lưu tiến độ và ôn tập theo SRS.
        </p>
      )}

      <ol className="roadmap-stages">
        {loTrinh.decks.map((bo, index) => {
          const laHocTiep = index === changHocTiep;
          return (
            <li key={bo.id} className={`roadmap-stage${laHocTiep ? " roadmap-stage--next" : ""}`}>
              <span className="roadmap-stage__number" aria-hidden="true">{index + 1}</span>
              <div className="roadmap-stage__body">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="roadmap-stage__title">{bo.title}</h3>
                  {laHocTiep && <span className="ui-chip ui-chip--small ui-chip--primary">Học tiếp</span>}
                </div>
                {bo.description && <p className="roadmap-card__desc">{bo.description}</p>}
                <p className="roadmap-card__meta">
                  {bo.word_count} từ
                  {isAuthenticated && bo.due_count > 0 && ` · ${bo.due_count} từ đến hạn ôn`}
                </p>
                {isAuthenticated && (
                  <ThanhTienDoLoTrinh
                    tongSo={bo.word_count}
                    daHoc={bo.learned_count}
                    daThuoc={bo.mastered_count}
                  />
                )}
              </div>
              <div className="roadmap-stage__actions">
                <Link to={`/decks/${bo.id}`} className="ui-button ui-button--ghost roadmap-stage__btn">
                  Xem từ
                </Link>
                <Link
                  to={`/practice?bo=${bo.id}`}
                  className={`ui-button ${laHocTiep ? "ui-button--primary" : "ui-button--ghost"} roadmap-stage__btn`}
                >
                  Luyện tập
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default TrangChiTietLoTrinh;
