import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useHoiLearnBot } from "../../contexts/ChatbotContext";

const DO_DAI_TOI_THIEU = 2;
const DO_DAI_TOI_DA = 300;
// Đề / đáp án khi chưa trả lời: không cho hỏi AI (tránh lộ đáp án), giống quy tắc ChatbotTheDangHoc
const VUNG_CAM = ".ui-the-cau-hoi, .ui-quiz-answer-list, .review-card__term, .review-card__cau, input, textarea, [contenteditable='true'], .chatbot-panel-wrapper";

function layVungChon() {
  const chon = window.getSelection?.();
  if (!chon || chon.isCollapsed || chon.rangeCount === 0) return null;
  const text = chon.toString().replace(/\s+/g, " ").trim();
  if (text.length < DO_DAI_TOI_THIEU || text.length > DO_DAI_TOI_DA) return null;
  const goc = chon.anchorNode?.nodeType === 1 ? chon.anchorNode : chon.anchorNode?.parentElement;
  if (!goc || !goc.closest("main") || goc.closest(VUNG_CAM)) return null;
  // Câu bài tập khoá học chưa trả lời (chưa có khung kết quả) cũng không hỏi được
  if (goc.closest(".kh-cau") && !document.querySelector(".kh-phan-hoi")) return null;
  const khung = chon.getRangeAt(0).getBoundingClientRect();
  if (!khung.width && !khung.height) return null;
  return { text, top: khung.bottom, left: khung.left + khung.width / 2 };
}

/**
 * HoiKhiChonChu — bôi đen chữ trong nội dung học (lý thuyết, ví dụ, lời giải thích...) → nút nổi
 * "Hỏi LearnBot": mở khung chat và hỏi về đoạn đó, kèm ngữ cảnh trang đang học.
 */
export default function HoiKhiChonChu() {
  const hoiLearnBot = useHoiLearnBot();
  const [vung, setVung] = useState(null);

  useEffect(() => {
    if (!hoiLearnBot) return undefined;
    let hen = 0;
    const capNhat = () => {
      clearTimeout(hen);
      hen = window.setTimeout(() => setVung(layVungChon()), 180);
    };
    const an = () => setVung(null);
    document.addEventListener("selectionchange", capNhat);
    window.addEventListener("scroll", an, { passive: true });
    return () => {
      clearTimeout(hen);
      document.removeEventListener("selectionchange", capNhat);
      window.removeEventListener("scroll", an);
    };
  }, [hoiLearnBot]);

  if (!vung || !hoiLearnBot || typeof document === "undefined") return null;

  const rong = window.innerWidth;
  const left = Math.min(Math.max(vung.left, 80), rong - 80);
  const top = Math.min(vung.top + 8, window.innerHeight - 56);

  return createPortal(
    <button
      type="button"
      className="hoi-khi-chon-chu"
      style={{ top, left }}
      // Giữ vùng chọn khi bấm (không để trình duyệt bỏ chọn trước khi click)
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => {
        hoiLearnBot(`Giải thích giúp mình đoạn này trong bài đang học: "${vung.text}"`);
        window.getSelection?.()?.removeAllRanges();
        setVung(null);
      }}
    >
      Hỏi LearnBot về đoạn này
    </button>,
    document.body
  );
}
