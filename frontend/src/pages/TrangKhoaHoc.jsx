import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layDanhSachKhoaHoc } from "../services/courseApi";
import { tongSoBuoiKhoaHoc } from "../utils/baiTapKhoaHoc";
import "./KhoaHoc.css";

function LichBuoiHoc({ khoa }) {
  const theoSo = new Map(khoa.lessons.map((bai) => [bai.lesson_number, bai]));
  const tong = tongSoBuoiKhoaHoc(khoa.title, Math.max(0, ...theoSo.keys()));

  return (
    <ol className="kh-lich" aria-label={`${tong} buổi của khoá, ${khoa.lessons.length} buổi đã có nội dung`}>
      {Array.from({ length: tong }, (_, i) => {
        const bai = theoSo.get(i + 1);
        return (
          <li key={i}>
            {bai ? (
              <Link
                to={`/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`}
                className="kh-lich__o kh-lich__o--co"
                title={bai.title}
              >
                {i + 1}
                <span className="sr-only">: {bai.title}</span>
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

/**
 * TrangKhoaHoc — các khoá học riêng của người dùng (tài liệu cá nhân): lịch buổi học + các buổi đã có.
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

  if (trangThai.loi) {
    return <p className="kh-trong">Không tải được khoá học. Kiểm tra kết nối rồi tải lại trang.</p>;
  }
  if (trangThai.khoaHoc.length === 0) {
    return <p className="kh-trong">Bạn chưa có khoá học nào.</p>;
  }

  return (
    <div className="ui-page-stack kh-trang">
      {trangThai.khoaHoc.map((khoa) => (
        <section key={khoa.id} className="kh-khoa" aria-labelledby={`khoa-${khoa.id}`}>
          <header className="kh-khoa__dau">
            <h2 id={`khoa-${khoa.id}`} className="kh-khoa__ten">{khoa.title}</h2>
            <p className="kh-khoa__mo-ta">
              Tài liệu riêng của bạn. Mỗi buổi học theo thứ tự: từ vựng, lý thuyết, rồi bài tập.
            </p>
          </header>

          <LichBuoiHoc khoa={khoa} />

          <ul className="kh-ds-buoi">
            {khoa.lessons.map((bai) => (
              <li key={bai.lesson_number}>
                <Link to={`/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`} className="kh-buoi">
                  <span className="kh-buoi__so" aria-hidden="true">{bai.lesson_number}</span>
                  <span className="kh-buoi__chu">
                    <span className="kh-buoi__nhan">Buổi {bai.lesson_number}</span>
                    <span className="kh-buoi__ten">{bai.title}</span>
                    <span className="kh-buoi__meta">
                      <span>{bai.word_count} từ vựng</span>
                      <span>{bai.question_count} câu bài tập</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default TrangKhoaHoc;
