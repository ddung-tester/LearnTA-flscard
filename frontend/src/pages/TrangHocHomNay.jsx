import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { ChatbotNguCanhTrang } from "../contexts/ChatbotContext";
import { taiSRSDongBo } from "../utils/srsReview";
import { docViTriBuoi, khoaViTriBuoi } from "../utils/viTriHocBuoi";
import {
  MUC_TIEU_PHUT,
  batDauTheoKeHoach,
  boCuaKhoaHoc,
  chotKeHoach,
  danhDauXong,
  demTuDenHan,
  docKeHoachDaChot,
  dongNoiBai,
  lapKeHoach,
} from "../utils/keHoachHomNay";
import "./TrangHocHomNay.css";

/**
 * TrangHocHomNay — một danh sách việc cho cả buổi học trong ngày (khoảng 60 phút), làm lần lượt.
 * Mỗi bước học xong có nút "Tiếp kế hoạch hôm nay" quay về đây, việc kế tiếp đã được chọn sẵn.
 */
function TrangHocHomNay() {
  const { user } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [duLieu, setDuLieu] = useState(null);
  const [loi, setLoi] = useState(false);
  const [lapLai, setLapLai] = useState(0);

  useEffect(() => {
    let conHieuLuc = true;
    // Lấy mới (không dùng bộ nhớ đệm): vừa học xong một bước quay về phải thấy đúng trạng thái
    Promise.all([api.get("/courses").then((res) => res.data), taiSRSDongBo({ limit: 200 })])
      .then(([cacKhoa, srs]) => {
        if (conHieuLuc) setDuLieu({ cacKhoa: cacKhoa || [], srs: srs || [] });
      })
      .catch(() => {
        if (conHieuLuc) setLoi(true);
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  const dangTai = !duLieu && !loi;
  useLayoutEffect(() => {
    setPageDataLoading("hoc-hom-nay", dangTai);
    return () => setPageDataLoading("hoc-hom-nay", false);
  }, [dangTai, setPageDataLoading]);

  const khoa = duLieu?.cacKhoa[0] ?? null;
  const daDoc = useCallback(
    (soBuoi) =>
      Boolean(
        khoa &&
          ((khoa.lessons || []).find((bai) => bai.lesson_number === soBuoi)?.theory_read ||
            docViTriBuoi(khoaViTriBuoi(user?.id, khoa.id, soBuoi))?.daDocLyThuyet)
      ),
    [khoa, user?.id]
  );

  const keHoach = useMemo(() => {
    if (!duLieu) return null;
    const now = new Date();
    const vao = {
      khoa,
      tuDenHan: demTuDenHan(duLieu.srs, boCuaKhoaHoc(duLieu.cacKhoa), now),
      cauDenHan: duLieu.cacKhoa.reduce(
        (tong, muc) => tong + (muc.lessons || []).reduce((cong, bai) => cong + (bai.due_count || 0), 0),
        0
      ),
      daDoc,
    };
    // lapLai > 0: người học bấm "Lập lại kế hoạch"
    let viec = lapLai === 0 ? docKeHoachDaChot(user?.id, now) : null;
    if (!viec) viec = lapKeHoach(vao);
    return danhDauXong(viec, vao);
  }, [duLieu, khoa, daDoc, lapLai, user?.id]);

  // Chốt kế hoạch của ngày (ghi ngoài lúc render)
  useEffect(() => {
    if (keHoach) chotKeHoach(user?.id, keHoach.map(({ id, nhom, nhan, phut, to }) => ({ id, nhom, nhan, phut, to })));
  }, [keHoach, user?.id]);

  if (loi) {
    return (
      <div className="ui-page-stack hhn">
        <p className="hhn__trong">Chưa tải được kế hoạch hôm nay. Kiểm tra mạng rồi tải lại trang.</p>
      </div>
    );
  }
  if (!keHoach) return null;

  const tongPhut = keHoach.reduce((tong, viec) => tong + viec.phut, 0);
  const phutXong = keHoach.filter((viec) => viec.xong).reduce((tong, viec) => tong + viec.phut, 0);
  const soXong = keHoach.filter((viec) => viec.xong).length;
  const viecTiep = keHoach.find((viec) => !viec.xong) ?? null;
  const xongHet = keHoach.length > 0 && !viecTiep;
  const phanTram = tongPhut > 0 ? Math.round((phutXong / tongPhut) * 100) : 0;

  const cacNhom = [];
  for (const viec of keHoach) {
    const nhom = cacNhom.find((muc) => muc.ten === viec.nhom);
    if (nhom) nhom.viec.push(viec);
    else cacNhom.push({ ten: viec.nhom, viec: [viec] });
  }

  return (
    <div className="ui-content-enter ui-page-stack hhn">
      <ChatbotNguCanhTrang trang="hom-nay" />
      <section className="hhn__dau" aria-labelledby="hhn-tieu-de">
        <p className="hhn__eyebrow">Học hôm nay · mục tiêu {MUC_TIEU_PHUT} phút</p>
        {dongNoiBai(khoa) && <p className="hhn__noi-bai">{dongNoiBai(khoa)}</p>}
        <h1 id="hhn-tieu-de" className="hhn__tieu-de">
          {keHoach.length === 0
            ? "Hôm nay chưa có việc cần học"
            : xongHet
              ? "Đã xong kế hoạch hôm nay"
              : `Còn khoảng ${Math.max(1, tongPhut - phutXong)} phút`}
        </h1>
        {keHoach.length > 0 && (
          <>
            <div
              className="hhn__thanh"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={phanTram}
              aria-label="Tiến độ kế hoạch hôm nay"
            >
              <span style={{ width: `${phanTram}%` }} />
            </div>
            <p className="hhn__dem">
              Xong {soXong}/{keHoach.length} việc · khoảng {phutXong}/{tongPhut} phút
            </p>
          </>
        )}
        {viecTiep && (
          <Link to={viecTiep.to} className="ui-button ui-button--primary hhn__nut" onClick={batDauTheoKeHoach}>
            {soXong === 0 ? "Bắt đầu" : "Tiếp tục"}: {viecTiep.nhan}
          </Link>
        )}
        {(xongHet || keHoach.length === 0) && (
          <div className="hhn__hanh-dong">
            <Link to="/khoa-hoc" className="ui-button ui-button--primary">Học thêm buổi khác</Link>
            <Link to="/review" className="ui-button">Ôn tập tự chọn</Link>
          </div>
        )}
      </section>

      {cacNhom.map((nhom) => (
        <section key={nhom.ten} className="hhn__nhom" aria-label={nhom.ten}>
          <h2 className="hhn__ten-nhom">{nhom.ten}</h2>
          <ol className="hhn__ds">
            {nhom.viec.map((viec) => (
              <li key={viec.id}>
                <Link
                  to={viec.to}
                  onClick={batDauTheoKeHoach}
                  className={`hhn__viec${viec.xong ? " hhn__viec--xong" : ""}${viec === viecTiep ? " hhn__viec--tiep" : ""}`}
                >
                  <span className="hhn__dau-tich" aria-hidden="true">{viec.xong ? "✓" : ""}</span>
                  <span className="hhn__nhan">
                    {viec.nhan}
                    {viec.xong && <span className="sr-only"> (đã xong)</span>}
                  </span>
                  <span className="hhn__phut">~{viec.phut} phút</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {keHoach.length > 0 && (
        <p className="hhn__ghi-chu">
          Kế hoạch lập theo bài đang học và lịch ôn, giữ nguyên trong ngày.{" "}
          <button type="button" className="hhn__lap-lai" onClick={() => setLapLai((so) => so + 1)}>
            Lập lại kế hoạch
          </button>
        </p>
      )}
    </div>
  );
}

export default TrangHocHomNay;
