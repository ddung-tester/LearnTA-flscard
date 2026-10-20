import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { layMayChuCham, theoDoiMayChuCham } from "../../services/api";

/**
 * ThongBaoMayChu — dải báo trên cùng màn hình khi máy chủ phản hồi chậm (thường là Render gói
 * miễn phí vừa ngủ dậy, mất 30–60 giây). Tự ẩn khi các lệnh đọc dữ liệu đã xong.
 * Gắn thẳng vào body để nằm trên cả màn chờ "Đang tải..." (PageLoadingOverlay).
 */
export default function ThongBaoMayChu() {
  const dangCham = useSyncExternalStore(theoDoiMayChuCham, layMayChuCham, () => false);
  if (!dangCham || typeof document === "undefined") return null;

  return createPortal(
    <div className="thong-bao-may-chu" role="status" aria-live="polite">
      <span className="thong-bao-may-chu__cham" aria-hidden="true" />
      Máy chủ đang khởi động sau thời gian nghỉ, thường mất 30–60 giây. Bạn chờ chút nhé.
    </div>,
    document.body
  );
}
