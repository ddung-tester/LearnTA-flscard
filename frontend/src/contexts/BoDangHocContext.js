import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";

/**
 * Bộ từ đang học khi trang học mở dưới một buổi của khoá học (/khoa-hoc/:courseId/bai/:soBai/hoc/:cheDo):
 * { deckId, duongDanBuoi } do TrangHocCuaBuoi cung cấp. Ngoài khoá học (/decks/:deckId/...) thì null.
 */
export const BoDangHocContext = createContext(null);

/** Mã bộ của trang học: từ buổi học (context) hoặc từ đường dẫn /decks/:deckId */
export function useMaBoDangHoc() {
  const boCuaBuoi = useContext(BoDangHocContext);
  const { deckId } = useParams();
  return boCuaBuoi?.deckId ?? deckId;
}

/** Hàm cho đường về "nhà" của bộ: bước Từ vựng của buổi học, hoặc trang bộ từ (kèm query bộ lọc) */
export function useDuongDanBo() {
  const boCuaBuoi = useContext(BoDangHocContext);
  return (boId, query = "") => (boCuaBuoi ? boCuaBuoi.duongDanBuoi : `/decks/${boId}${query}`);
}

// Các chế độ học của một bộ, cùng tên đoạn đường dẫn ở /decks/:id/... và /khoa-hoc/.../hoc/...
export const CHE_DO_HOC = [
  { path: "flashcard", nhan: "Học bằng thẻ" },
  { path: "quiz", nhan: "Trắc nghiệm" },
  { path: "tu-luan", nhan: "Tự luận" },
  { path: "nghe-viet", nhan: "Nghe viết" },
  { path: "ngu-canh", nhan: "Ngữ cảnh" },
  { path: "noi-tu", nhan: "Nối từ" },
  { path: "hon-hop", nhan: "Hỗn hợp" },
  { path: "luyen-cau", nhan: "Luyện câu" },
];
