import { useContext } from "react";
import { Link } from "react-router-dom";
import { BoDangHocContext } from "../../contexts/BoDangHocContext";

/**
 * Học từ của một buổi khoá học theo một mạch: Học bằng thẻ → Kiểm tra nhanh → Lý thuyết.
 * Chỉ hiện khi đang học từ của buổi (BoDangHocContext có duongDanBuoi); ngoài khoá học không hiện.
 * cheDo: "flashcard" | các chế độ khác
 */
export default function NutBuocTiepCuaBuoi({ cheDo }) {
  const duongDanBuoi = useContext(BoDangHocContext)?.duongDanBuoi;
  if (!duongDanBuoi) return null;
  // duongDanBuoi = /khoa-hoc/:c/bai/:n/tu-vung
  const goc = duongDanBuoi.replace(/\/tu-vung$/, "");
  const tiep =
    cheDo === "flashcard"
      ? { to: `${goc}/hoc/quiz`, nhan: "Tiếp: Kiểm tra nhanh" }
      : { to: `${goc}/ly-thuyet`, nhan: "Tiếp: Đọc lý thuyết" };
  return (
    <Link to={tiep.to} className="ui-button ui-button--primary px-5 py-2.5">
      {tiep.nhan} →
    </Link>
  );
}
