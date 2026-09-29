import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import DanhSachLoTrinh from "../components/deck/DanhSachLoTrinh";
import { layDanhSachKhoaHoc } from "../services/courseApi";
import { layDanhSachLoTrinh } from "../services/roadmapApi";
import { tienDoBuoiHoc, timBuoiTiepTheo, tongHopKhoaHoc, tongSoBuoiKhoaHoc } from "../utils/baiTapKhoaHoc";
import "./KhoaHoc.css";

function LichBuoiHoc({ khoa, buoiTiep }) {
  const theoSo = new Map(khoa.lessons.map((bai) => [bai.lesson_number, bai]));
  const tong = tongSoBuoiKhoaHoc(khoa.title, Math.max(0, ...theoSo.keys()));
  const soBuoiXong = khoa.lessons.filter((bai) => tienDoBuoiHoc(bai).xong).length;

  return (
    <ol
      className="kh-lich"
      aria-label={`${tong} buổi của khoá, ${khoa.lessons.length} buổi đã có nội dung, xong ${soBuoiXong} buổi`}
    >
      {Array.from({ length: tong }, (_, i) => {
        const bai = theoSo.get(i + 1);
        const xong = bai && tienDoBuoiHoc(bai).xong;
        const laBuoiTiep = bai && bai === buoiTiep;
        return (
          <li key={i} style={{ "--thu-tu": i }}>
            {bai ? (
              <Link
                to={`/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`}
                className={`kh-lich__o kh-lich__o--co${xong ? " kh-lich__o--xong" : ""}${laBuoiTiep ? " kh-lich__o--tiep" : ""}`}
                title={bai.title}
                aria-current={laBuoiTiep ? "step" : undefined}
                data-mo-rong
              >
                {i + 1}
                <span className="sr-only">
                  : {bai.title}
                  {xong ? " (đã xong)" : laBuoiTiep ? " (học tiếp buổi này)" : ""}
                </span>
              </Link>
            ) : (
              <span className="kh-lich__o" title="Chưa có nội dung">
                {i + 1}
                <span className="sr-only"> (chưa có nội dung)</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TheBuoiHoc({ khoaId, bai }) {
  const tienDo = tienDoBuoiHoc(bai);
  return (
    <Link to={`/khoa-hoc/${khoaId}/bai/${bai.lesson_number}`} className="kh-buoi" data-mo-rong>
      <span className="kh-buoi__so" aria-hidden="true">{bai.lesson_number}</span>
      <span className="kh-buoi__chu">
        <span className="kh-buoi__nhan">
          Buổi {bai.lesson_number}
          {tienDo.xong && <span className="kh-buoi__xong"> · Đã xong</span>}
        </span>
        <span className="kh-buoi__ten">{bai.title}</span>
        <span className="kh-buoi__meta">
          <span>Từ vựng {tienDo.tuDaHoc}/{tienDo.tongTu} đã học</span>
          <span>Bài tập {tienDo.cauDung}/{tienDo.tongCau} câu đúng</span>
        </span>
        {tienDo.daBatDau && (
          <span className="kh-buoi__thanh" aria-hidden="true">
            <span style={{ width: `${tienDo.phanTram}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}

function KhoaHocRieng({ khoa }) {
  const buoiTiep = timBuoiTiepTheo(khoa.lessons);
  const { cauCanOn } = tongHopKhoaHoc(khoa);

  return (
    <section className="kh-khoa" aria-labelledby={`khoa-${khoa.id}`}>
      <header className="kh-khoa__dau">
        <h2 id={`khoa-${khoa.id}`} className="kh-khoa__ten">{khoa.title}</h2>
        <p className="kh-khoa__mo-ta">
          Tài liệu riêng của bạn. Mỗi buổi học theo thứ tự: từ vựng, lý thuyết, rồi bài tập.
        </p>
        {(buoiTiep || cauCanOn > 0) && (
          <div className="kh-khoa__nut">
            {buoiTiep && (
              <Link
                to={`/khoa-hoc/${khoa.id}/bai/${buoiTiep.lesson_number}`}
                className="ui-button ui-button--primary px-5 py-2.5"
              >
                {tienDoBuoiHoc(buoiTiep).daBatDau ? "Học tiếp" : "Bắt đầu"} Buổi {buoiTiep.lesson_number}
              </Link>
            )}
            {cauCanOn > 0 && (
              <Link to="/khoa-hoc/on-tap" className="ui-button ui-button--ghost px-5 py-2.5">
                Ôn {cauCanOn} câu sai
              </Link>
            )}
          </div>
        )}
      </header>

      <LichBuoiHoc khoa={khoa} buoiTiep={buoiTiep} />

      <ul className="kh-ds-buoi">
        {khoa.lessons.map((bai) => (
          <li key={bai.lesson_number}>
            <TheBuoiHoc khoaId={khoa.id} bai={bai} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * TrangKhoaHoc — nội dung học có sẵn, học theo thứ tự: khoá học riêng của người dùng (tài liệu cá nhân,
 * chỉ khi đã đăng nhập) ở trên, lộ trình từ vựng công khai ở dưới. Bộ từ tự tạo nằm ở trang "Bộ từ".
 */
function TrangKhoaHoc() {
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({
    xong: false,
    khoaHoc: [],
    loiKhoaHoc: false,
    loTrinh: [],
    loiLoTrinh: false,
  });

  useLayoutEffect(() => {
    setPageDataLoading("courses", !trangThai.xong);
    return () => setPageDataLoading("courses", false);
  }, [trangThai.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    // Tải riêng từng phần: khoá học lỗi không được làm mất phần lộ trình và ngược lại
    Promise.allSettled([
      isAuthenticated ? layDanhSachKhoaHoc() : Promise.resolve([]),
      layDanhSachLoTrinh(),
    ]).then(([khoaHoc, loTrinh]) => {
      if (!conHieuLuc) return;
      setTrangThai({
        xong: true,
        khoaHoc: khoaHoc.status === "fulfilled" ? khoaHoc.value : [],
        loiKhoaHoc: khoaHoc.status === "rejected",
        loTrinh: loTrinh.status === "fulfilled" ? loTrinh.value : [],
        loiLoTrinh: loTrinh.status === "rejected",
      });
    });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated]);

  if (!trangThai.xong) return null;
  const coKhoaRieng = trangThai.khoaHoc.length > 0;

  return (
    <div className="ui-page-stack kh-trang">
      {trangThai.loiKhoaHoc && (
        <p className="kh-trong">Không tải được khoá học của bạn. Kiểm tra kết nối rồi tải lại trang.</p>
      )}

      {trangThai.khoaHoc.map((khoa) => (
        <KhoaHocRieng key={khoa.id} khoa={khoa} />
      ))}

      {/* Đã có khoá riêng: lộ trình nằm ở Từ vựng → Lộ trình để trang này chỉ còn khoá học */}
      {!coKhoaRieng && (
        <section className="flex flex-col gap-4" aria-labelledby="lo-trinh-tieu-de">
          <div className="ui-page-header">
            <div className="ui-page-header__title">
              <h2 id="lo-trinh-tieu-de" className="text-2xl font-semibold text-[var(--mau-chu)]">
                Lộ trình từ vựng
              </h2>
              <p className="text-sm text-[var(--mau-chu-phu)]">
                Học theo thứ tự từ cơ bản đến nâng cao, không phải đoán nên học gì tiếp theo.
              </p>
            </div>
          </div>

          <DanhSachLoTrinh loTrinh={trangThai.loTrinh} coLoi={trangThai.loiLoTrinh} hienTienDo={isAuthenticated} />
        </section>
      )}
    </div>
  );
}

export default TrangKhoaHoc;
