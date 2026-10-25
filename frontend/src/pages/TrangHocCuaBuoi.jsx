import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { BoDangHocContext } from "../contexts/BoDangHocContext";
import { layBaiHoc } from "../services/courseApi";
import LinkTroVe from "../components/common/LinkTroVe";

/**
 * TrangHocCuaBuoi — học từ vựng của một buổi ngay dưới khoá học (/khoa-hoc/:courseId/bai/:soBai/hoc/:cheDo):
 * tìm bộ từ của buổi rồi mở trang học `Trang` với bộ đó (qua BoDangHocContext).
 */
export default function TrangHocCuaBuoi({ Trang, ...props }) {
  const { courseId, soBai } = useParams();
  const { setPageDataLoading } = usePageTransition();
  const khoa = `${courseId}/${soBai}`;
  const [ketQua, setKetQua] = useState({ khoa: null, deckId: null, loi: "" });
  const dangTai = ketQua.khoa !== khoa;

  useEffect(() => {
    let conHieuLuc = true;
    layBaiHoc(courseId, soBai)
      .then((duLieu) => {
        if (!conHieuLuc) return;
        const deckId = duLieu?.lesson?.deck_id ?? null;
        setKetQua({ khoa, deckId, loi: deckId ? "" : "Buổi này chưa có từ vựng." });
      })
      .catch((error) => conHieuLuc && setKetQua({ khoa, deckId: null, loi: error.message || "Không tải được buổi học." }));
    return () => {
      conHieuLuc = false;
    };
  }, [courseId, soBai, khoa]);

  useLayoutEffect(() => {
    setPageDataLoading("bo-cua-buoi", dangTai);
    return () => setPageDataLoading("bo-cua-buoi", false);
  }, [dangTai, setPageDataLoading]);

  const duongDanBuoi = `/khoa-hoc/${courseId}/bai/${soBai}/tu-vung`;
  const giaTri = useMemo(
    () => (ketQua.deckId ? { deckId: String(ketQua.deckId), duongDanBuoi } : null),
    [ketQua.deckId, duongDanBuoi]
  );

  if (dangTai) return null;
  if (!giaTri) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">{ketQua.loi}</h2>
          <LinkTroVe to={duongDanBuoi} className="ui-button ui-button--primary mt-4 px-5 py-2.5">
            Về Buổi {soBai}
          </LinkTroVe>
        </section>
      </div>
    );
  }
  return (
    <BoDangHocContext.Provider value={giaTri}>
      <Trang {...props} />
    </BoDangHocContext.Provider>
  );
}
