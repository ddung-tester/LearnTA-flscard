import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import BaiTapKhoaHoc from "../components/BaiTapKhoaHoc";
import { layCauHoiCanOn } from "../services/courseApi";
import "./KhoaHoc.css";

/**
 * TrangOnCauHoi — ôn các câu bài tập khoá học đến hạn (từng làm sai), gom từ mọi buổi.
 * Cùng luật SRS với từ vựng: đúng thì lên cấp và giãn lịch ôn, sai thì quay lại ngay.
 */
function TrangOnCauHoi() {
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({ xong: false, cauHoi: [], loi: "" });

  useLayoutEffect(() => {
    setPageDataLoading("course-review", !trangThai.xong);
    return () => setPageDataLoading("course-review", false);
  }, [trangThai.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    layCauHoiCanOn()
      .then((cauHoi) => {
        if (conHieuLuc) setTrangThai({ xong: true, cauHoi, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setTrangThai({ xong: true, cauHoi: [], loi: error.message });
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  if (!trangThai.xong) return null;

  return (
    <div className="ui-page-stack kh-trang">
      <Link to="/khoa-hoc" className="ui-back-link ui-back-link--quiet">&larr; Khoá học</Link>

      <header className="kh-khoa__dau">
        <h2 className="kh-khoa__ten">Ôn câu bài tập</h2>
        <p className="kh-khoa__mo-ta">
          Các câu bạn từng làm sai, nay đến lịch ôn lại. Làm đúng thì câu được giãn lịch ôn, sai thì quay lại ngay.
        </p>
      </header>

      {trangThai.loi ? (
        <p className="kh-trong">Không tải được câu cần ôn. Kiểm tra kết nối rồi tải lại trang.</p>
      ) : trangThai.cauHoi.length === 0 ? (
        <p className="kh-trong">
          Hôm nay không có câu nào cần ôn.{" "}
          <Link to="/khoa-hoc" className="kh-lien-ket">
            Học tiếp khoá học
          </Link>
        </p>
      ) : (
        <BaiTapKhoaHoc cauHoi={trangThai.cauHoi} onTap />
      )}
    </div>
  );
}

export default TrangOnCauHoi;
