import { useState } from "react";
import { dichCauViDu } from "../../services/cardApi";

// Bản dịch đã lấy trong lần mở trang: làm lại câu đó không phải hỏi server nữa
const banDichDaLay = new Map();

/** Nút "Dịch câu" dưới câu ví dụ (chế độ Ngữ cảnh): bấm mới hiện, để người học tự đoán trước. */
export default function NutDichCau({ the }) {
  const [banDich, setBanDich] = useState("");
  const [dangDich, setDangDich] = useState(false);
  const [loi, setLoi] = useState("");

  async function dich() {
    const coSan = the.example_translation || banDichDaLay.get(the.id);
    if (coSan) {
      setBanDich(coSan);
      return;
    }
    setDangDich(true);
    setLoi("");
    try {
      const ketQua = await dichCauViDu(the.id);
      banDichDaLay.set(the.id, ketQua);
      setBanDich(ketQua);
    } catch (error) {
      setLoi(error.message || "Chưa dịch được, thử lại nhé");
    } finally {
      setDangDich(false);
    }
  }

  if (banDich) {
    return (
      <p className="mb-6 text-center text-[0.95rem] leading-relaxed text-[var(--mau-chu-phu)]" aria-live="polite">
        {banDich}
      </p>
    );
  }
  return (
    <div className="mb-6 flex flex-col items-center gap-1">
      <button
        type="button"
        className="ui-button px-4 py-2 text-sm"
        onClick={dich}
        disabled={dangDich}
        aria-busy={dangDich}
      >
        {dangDich ? "Đang dịch…" : "Dịch câu"}
      </button>
      {loi && <p className="text-sm text-[var(--mau-chu-phu)]">{loi}</p>}
    </div>
  );
}
