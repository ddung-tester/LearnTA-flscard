import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CHE_DO_HOC } from "../contexts/BoDangHocContext";

const CAC_CHE_DO = new Set(CHE_DO_HOC.map((cheDo) => cheDo.path));

/**
 * Bộ từ của một buổi học mở bằng đường dẫn bộ từ (/decks/:id, /decks/:id/quiz... — link cũ, trang Luyện tập):
 * chuyển sang đường dẫn dưới khoá học để menu, nút quay lại và đường dẫn đều nằm trong buổi đó.
 */
export default function useChuyenBoKhoaHoc(bo) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const cha = bo?.parent;
    if (bo?.source !== "course" || !cha?.course_id || !pathname.startsWith("/decks/")) return;
    const goc = `/khoa-hoc/${cha.course_id}/bai/${cha.lesson_number}`;
    const cheDo = /^\/decks\/[^/]+\/([^/]+)\/?$/.exec(pathname)?.[1];
    if (cheDo && !CAC_CHE_DO.has(cheDo)) return;
    navigate(cheDo ? `${goc}/hoc/${cheDo}${search}` : `${goc}/tu-vung`, { replace: true });
  }, [bo, pathname, search, navigate]);
}
