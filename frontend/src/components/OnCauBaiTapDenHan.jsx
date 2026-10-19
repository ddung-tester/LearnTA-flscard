import { useEffect, useState } from "react";
import BaiTapKhoaHoc from "./BaiTapKhoaHoc";
import { layCauHoiCanOn } from "../services/courseApi";
import "../pages/KhoaHoc.css";

/**
 * Câu bài tập khoá học đến hạn ôn, hiện ngay sau phần ôn từ ở /review — một hàng ôn chung.
 * Tải riêng (lazy) để trang ôn từ không phải tải phần bài tập khi không có câu nào đến hạn.
 */
export default function OnCauBaiTapDenHan({ soCau }) {
  const [cauHoi, setCauHoi] = useState(null);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let conHieuLuc = true;
    layCauHoiCanOn()
      .then((ds) => {
        if (conHieuLuc) setCauHoi(ds);
      })
      .catch((error) => {
        if (conHieuLuc) setLoi(error.message || "Không tải được câu cần ôn");
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  return (
    <section className="review-cau-bai-tap kh-trang" aria-label="Câu bài tập đến hạn ôn">
      <h2 className="review-cau-bai-tap__tieu-de">Tiếp theo: {soCau} câu bài tập đến hạn</h2>
      {loi ? (
        <p className="review-sync-note">{loi}</p>
      ) : !cauHoi ? (
        <p className="review-sync-note">Đang tải câu bài tập...</p>
      ) : cauHoi.length === 0 ? (
        <p className="review-sync-note">Đã ôn xong câu bài tập hôm nay.</p>
      ) : (
        <BaiTapKhoaHoc cauHoi={cauHoi} onTap />
      )}
    </section>
  );
}
