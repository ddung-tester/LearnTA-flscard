import { useState } from "react";
import { dichCauViDu } from "../../services/cardApi";

// Bản dịch đã lấy trong lần mở trang: làm lại câu đó không phải hỏi server nữa
const banDichDaLay = new Map();

// Nút nằm trong thẻ lật / vùng kéo: không để cú bấm lật thẻ, kéo thẻ hay chạy phím tắt của trang
function chanLanRa(e) {
  e.stopPropagation();
}
function chanPhimLanRa(e) {
  if (e.key === "Enter" || e.key === " ") e.stopPropagation();
}
const chanSuKien = { onPointerDown: chanLanRa, onMouseDown: chanLanRa, onKeyDown: chanPhimLanRa };

/**
 * Nút "Xem tiếng Việt" dưới câu ví dụ: bản dịch ẩn sẵn, bấm mới hiện (bấm lại để ẩn),
 * để người học tự dịch trước rồi so.
 * - banDich: bản dịch có sẵn (thẻ đã lưu, câu 6 thì).
 * - cardId: thẻ chưa có bản dịch thì nhờ server/AI dịch rồi lưu vào thẻ. Không có cả hai thì không hiện gì.
 */
export default function NutDichCau({ banDich = "", cardId, className = "" }) {
  const idHopLe = Number.isInteger(Number(cardId)) && Number(cardId) > 0;
  const [hien, setHien] = useState(false);
  const [banDichMoi, setBanDichMoi] = useState("");
  const [dangDich, setDangDich] = useState(false);
  const [loi, setLoi] = useState("");
  const noiDung = banDich || banDichMoi || (idHopLe ? banDichDaLay.get(String(cardId)) : "") || "";

  if (!noiDung && !idHopLe) return null;

  async function bam(e) {
    e.preventDefault();
    e.stopPropagation();
    if (hien) {
      setHien(false);
      return;
    }
    if (noiDung) {
      setHien(true);
      return;
    }
    setDangDich(true);
    setLoi("");
    try {
      const ketQua = await dichCauViDu(cardId);
      banDichDaLay.set(String(cardId), ketQua);
      setBanDichMoi(ketQua);
      setHien(true);
    } catch (error) {
      setLoi(error.message || "Chưa dịch được, thử lại nhé");
    } finally {
      setDangDich(false);
    }
  }

  return (
    <div className={`ui-dich-cau ${className}`}>
      <button
        type="button"
        className="ui-dich-cau__nut"
        onClick={bam}
        {...chanSuKien}
        disabled={dangDich}
        aria-busy={dangDich}
        aria-expanded={hien}
      >
        {dangDich ? "Đang dịch…" : hien ? "Ẩn tiếng Việt" : "Xem tiếng Việt"}
      </button>
      {hien && (
        <p lang="vi" className="ui-dich-cau__ban-dich" aria-live="polite">
          {noiDung}
        </p>
      )}
      {loi && <p className="ui-dich-cau__loi">{loi}</p>}
    </div>
  );
}
