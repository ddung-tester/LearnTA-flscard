import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePageTransition } from "../../contexts/PageTransitionContext";
import { soBuocLui } from "../../utils/lichSuDieuHuong";

/**
 * LinkTroVe — nút quay lại. Vẫn là link thật (mở thẻ mới, chép link được), nhưng bấm thường thì:
 * - kieu "len" (mặc định, nhãn "← Bộ từ", "← Buổi 1"): trang ngay trước đúng là `to` thì lùi lịch sử
 *   (Back của trình duyệt không vòng lại trang vừa rời, vị trí cuộn còn nguyên), không thì đi tới `to`;
 * - kieu "noi-truoc" (nút "Trở về" của trang học): về trang gần nhất người học đến từ đó
 *   (Luyện tập, buổi học, bộ từ...); mở thẳng link thì đi tới `to`.
 */
export default function LinkTroVe({ to, kieu = "len", onClick, children, ...props }) {
  const navigate = useNavigate();
  const viTri = useLocation();
  const { navigateWithLoading } = usePageTransition();

  function bam(event) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const buoc = soBuocLui(kieu, to, `${viTri.pathname}${viTri.search}`);
    if (buoc == null) navigateWithLoading(to);
    else navigate(buoc);
  }

  // data-tro-ve: bộ bắt click chung của PageTransitionContext để nút này tự xử lý
  return (
    <Link to={to} onClick={bam} data-tro-ve {...props}>
      {children}
    </Link>
  );
}
