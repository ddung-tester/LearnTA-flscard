import { useEffect } from "react";
import { createPortal } from "react-dom";
import useManRong from "../../hooks/useManRong";

/**
 * ThanhTiepTuc — kết quả câu vừa trả lời + nút Tiếp tục.
 * Điện thoại/màn hẹp: thanh dính đáy màn hình, luôn trong tầm ngón cái, khỏi cuộn qua phần ví dụ;
 * chừa một khoảng trống đúng chỗ để nội dung cuối không bị thanh che.
 * Máy tính: nằm ngay trong luồng trang như trước.
 * demNguocMs: trang tự chuyển câu sau chừng này — hiện vạch đếm ngược để người học biết.
 */
export default function ThanhTiepTuc({ dung, children, onTiepTuc, demNguocMs = 0 }) {
  const manRong = useManRong();
  const coDinh = !manRong;

  // Nút chat nổi góc phải dưới: đẩy lên khi thanh đang hiện để không đè nút Tiếp tục.
  // Gắn lớp thẳng lên nút (không lên <html>) để mỗi câu không bắt cả trang tính lại style.
  useEffect(() => {
    if (!coDinh) return undefined;
    const nutChat = document.querySelector(".chatbot-bubble");
    nutChat?.classList.add("chatbot-bubble--nhuong-cho");
    return () => nutChat?.classList.remove("chatbot-bubble--nhuong-cho");
  }, [coDinh]);

  const thanh = (
    <div
      className={`ui-thanh-tiep-tuc ui-thanh-tiep-tuc--${dung ? "dung" : "sai"} ${coDinh ? "ui-thanh-tiep-tuc--co-dinh" : ""}`}
      role="status"
    >
      <div className="ui-thanh-tiep-tuc__ket-qua">{children}</div>
      <button type="button" onClick={onTiepTuc} className="ui-button ui-button--primary ui-thanh-tiep-tuc__nut">
        <span>Tiếp tục</span>
        <kbd className="ui-thanh-tiep-tuc__phim" aria-hidden="true">
          Enter ↵
        </kbd>
      </button>
      {demNguocMs > 0 && (
        <span className="ui-thanh-tiep-tuc__dem-nguoc" style={{ animationDuration: `${demNguocMs}ms` }} aria-hidden="true" />
      )}
    </div>
  );

  if (!coDinh) return thanh;

  return (
    <>
      <div className="ui-thanh-tiep-tuc__cho-trong" aria-hidden="true" />
      {createPortal(thanh, document.body)}
    </>
  );
}
