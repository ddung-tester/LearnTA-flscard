import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { layGiaoDien, theoDoiGiaoDien } from "../../utils/giaoDien";

/**
 * DenBan — gắn data-giao-dien lên <html> (trang chủ luôn giữ giao diện sáng vì hero 3D
 * tô sương theo nền mật ong) và khi ở chế độ đèn bàn thì:
 * - vũng sáng của đèn treo cố định giữa phía trên (.den-ban-den, nằm sau nội dung),
 * - lớp tối viền màn hình (.den-ban-bong) để phần xa đèn chìm xuống.
 * Đèn không đi theo con trỏ: vẽ lại gradient toàn màn hình mỗi lần rê chuột gây giật trên máy yếu.
 */
function DenBan() {
  const { pathname } = useLocation();
  const giaoDien = useSyncExternalStore(theoDoiGiaoDien, layGiaoDien, () => "sang");
  const dangBat = giaoDien === "den-ban" && pathname !== "/";

  useEffect(() => {
    const goc = document.documentElement;
    if (dangBat) goc.dataset.giaoDien = "den-ban";
    else delete goc.dataset.giaoDien;
  }, [dangBat]);

  return dangBat ? (
    <>
      <div className="den-ban-den" aria-hidden="true" />
      <div className="den-ban-bong" aria-hidden="true" />
    </>
  ) : null;
}

export default DenBan;
