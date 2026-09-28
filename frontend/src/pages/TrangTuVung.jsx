import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import DanhSachLoTrinh from "../components/deck/DanhSachLoTrinh";
import { layDanhSachKhoaHoc } from "../services/courseApi";
import { layDanhSachLoTrinh } from "../services/roadmapApi";
import {
  chiaDongBuoi,
  tienDoBuoiHoc,
  timBuoiTiepTheo,
  tongHopKhoaHoc,
  tongSoBuoiKhoaHoc,
} from "../utils/baiTapKhoaHoc";
import TrangDanhSachBo from "./TrangDanhSachBo";

const CAC_TAB = [
  { key: "buoi", nhan: "Theo buổi" },
  { key: "cua-toi", nhan: "Bộ của tôi" },
  { key: "lo-trinh", nhan: "Lộ trình" },
];

/** Từ vựng của từng buổi trong khoá: đủ mọi buổi, buổi chưa có nội dung hiện mờ (không khoá buổi nào) */
function TuVungTheoBuoi({ khoa }) {
  const theoSo = new Map(khoa.lessons.map((bai) => [bai.lesson_number, bai]));
  const tongBuoi = tongSoBuoiKhoaHoc(khoa.title, Math.max(0, ...theoSo.keys()));
  const buoiTiep = timBuoiTiepTheo(khoa.lessons);
  const tong = tongHopKhoaHoc(khoa);

  return (
    <section className="tv-khoa" aria-labelledby={`tv-khoa-${khoa.id}`}>
      <header className="tv-khoa__dau">
        <div>
          <h3 id={`tv-khoa-${khoa.id}`} className="tv-khoa__ten">{khoa.title}</h3>
          <p className="tv-khoa__tong">
            Đã học <strong>{tong.tuDaHoc}</strong>/{tong.tongTu} từ · Đã thuộc <strong>{tong.tuDaThuoc}</strong>
          </p>
        </div>
        <Link to="/khoa-hoc" className="ui-button ui-button--ghost tv-khoa__nut">
          Xem khoá học
        </Link>
      </header>

      <ol className="tv-buoi-ds">
        {chiaDongBuoi(theoSo, tongBuoi).map(({ bai, tu, den }) => {
          if (!bai) {
            return (
              <li key={tu} className="tv-buoi tv-buoi--trong">
                <span className="tv-buoi__so">{tu === den ? `Buổi ${tu}` : `Buổi ${tu}–${den}`}</span>
                <span className="tv-buoi__ten">Chưa có nội dung</span>
              </li>
            );
          }
          const soBuoi = tu;

          const tienDo = tienDoBuoiHoc(bai);
          const phanTram = tienDo.tongTu > 0 ? Math.round((tienDo.tuDaHoc / tienDo.tongTu) * 100) : 0;
          const laBuoiTiep = bai === buoiTiep;
          return (
            <li key={soBuoi} className={`tv-buoi${laBuoiTiep ? " tv-buoi--tiep" : ""}`}>
              <span className="tv-buoi__so">
                Buổi {soBuoi}
                {laBuoiTiep && <span className="tv-buoi__nhan">Đang học</span>}
              </span>
              <Link to={`/decks/${bai.deck_id}`} className="tv-buoi__ten">
                {bai.title}
              </Link>
              <span className="tv-buoi__tien-do">
                <span className="tv-buoi__thanh" aria-hidden="true">
                  <span style={{ width: `${phanTram}%` }} />
                </span>
                <span className="tv-buoi__so-tu">
                  {tienDo.tuDaHoc}/{tienDo.tongTu} từ
                </span>
              </span>
              <span className="tv-buoi__hanh-dong">
                <Link to={`/decks/${bai.deck_id}/flashcard`} className="tv-buoi__lien-ket">
                  Flashcard
                </Link>
                <Link to={`/practice?bo=${bai.deck_id}`} className="tv-buoi__lien-ket">
                  Luyện tập
                </Link>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * TrangTuVung — mọi bộ từ ở một chỗ, chia 3 tab:
 * Theo buổi (từ vựng riêng từng buổi của khoá) · Bộ của tôi (bộ tự tạo, giữ nguyên trang cũ) · Lộ trình.
 * Tab đang mở nằm trên URL (?tab=). Khách chỉ có trang bộ từ cũ (lộ trình của khách ở trang Khoá học).
 */
function TrangTuVung() {
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [searchParams, setSearchParams] = useSearchParams();
  const [duLieu, setDuLieu] = useState({ xong: false, khoaHoc: [], loTrinh: [], loiLoTrinh: false });

  useLayoutEffect(() => {
    if (!isAuthenticated) return undefined;
    setPageDataLoading("tu-vung", !duLieu.xong);
    return () => setPageDataLoading("tu-vung", false);
  }, [isAuthenticated, duLieu.xong, setPageDataLoading]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let conHieuLuc = true;
    Promise.allSettled([layDanhSachKhoaHoc(), layDanhSachLoTrinh()]).then(([khoaHoc, loTrinh]) => {
      if (!conHieuLuc) return;
      setDuLieu({
        xong: true,
        khoaHoc: khoaHoc.status === "fulfilled" ? khoaHoc.value : [],
        loTrinh: loTrinh.status === "fulfilled" ? loTrinh.value : [],
        loiLoTrinh: loTrinh.status === "rejected",
      });
    });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <TrangDanhSachBo />;
  if (!duLieu.xong) return null;

  const coKhoa = duLieu.khoaHoc.length > 0;
  const tabUrl = searchParams.get("tab");
  // Mặc định: có khoá học thì mở từ vựng theo buổi, chưa có (hoặc đang tạo bộ mới) thì mở bộ của tôi
  const tab = CAC_TAB.some((muc) => muc.key === tabUrl)
    ? tabUrl
    : coKhoa && !searchParams.has("create")
      ? "buoi"
      : "cua-toi";

  function chonTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">Từ vựng</h2>
          <p className="text-sm text-[var(--mau-chu-phu)]">
            Từ của từng buổi học, bộ từ bạn tự tạo và các lộ trình có sẵn. Mọi từ đều vào chung lịch ôn tập.
          </p>
        </div>
        <div className="ui-page-header__actions">
          <Link to="/practice" className="ui-button ui-button--ghost whitespace-nowrap px-4 py-2">
            Luyện tập
          </Link>
        </div>
      </div>

      <div className="ui-filter-tabs ui-filter-tabs--deck" role="tablist" aria-label="Nhóm từ vựng">
        {CAC_TAB.map((muc) => (
          <button
            key={muc.key}
            type="button"
            role="tab"
            id={`tv-tab-${muc.key}`}
            aria-selected={tab === muc.key}
            aria-controls="tv-noi-dung"
            className="ui-filter-tab"
            onClick={() => chonTab(muc.key)}
          >
            {muc.nhan}
          </button>
        ))}
      </div>

      <div id="tv-noi-dung" role="tabpanel" aria-labelledby={`tv-tab-${tab}`}>
        {tab === "buoi" &&
          (coKhoa ? (
            <div className="ui-page-stack">
              {duLieu.khoaHoc.map((khoa) => (
                <TuVungTheoBuoi key={khoa.id} khoa={khoa} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--mau-chu-phu)]">
              Bạn chưa có khoá học nào. Từ vựng của mỗi buổi sẽ hiện ở đây khi khoá học được thêm vào.
            </p>
          ))}
        {tab === "cua-toi" && <TrangDanhSachBo />}
        {tab === "lo-trinh" && (
          <DanhSachLoTrinh loTrinh={duLieu.loTrinh} coLoi={duLieu.loiLoTrinh} hienTienDo />
        )}
      </div>
    </div>
  );
}

export default TrangTuVung;
