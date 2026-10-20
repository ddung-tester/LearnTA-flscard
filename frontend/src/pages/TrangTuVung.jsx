import { Navigate, useSearchParams } from "react-router-dom";
import TrangDanhSachBo from "./TrangDanhSachBo";

// Tab cũ của trang Từ vựng đã chuyển sang mục Học: từ vựng theo buổi nằm trong từng buổi,
// lộ trình mẫu nằm ở trang Học. Link cũ (?tab=buoi, ?tab=lo-trinh) tự chuyển sang đó.
const TAB_DA_CHUYEN = new Set(["buoi", "lo-trinh"]);

/**
 * TrangTuVung — mục "Bộ từ": các bộ từ người học tự tạo (tạo, sửa, nhập từ, học).
 * Bộ từ của khoá học và lộ trình mẫu nằm ở mục "Học".
 */
function TrangTuVung() {
  const [searchParams] = useSearchParams();
  if (TAB_DA_CHUYEN.has(searchParams.get("tab"))) return <Navigate to="/khoa-hoc" replace />;
  return <TrangDanhSachBo />;
}

export default TrangTuVung;
