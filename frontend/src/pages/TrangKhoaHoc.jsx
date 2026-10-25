import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import DanhSachLoTrinh from "../components/deck/DanhSachLoTrinh";
import { layDanhSachKhoaHoc } from "../services/courseApi";
import { layDanhSachLoTrinh } from "../services/roadmapApi";
import { tienDoBuoiHoc, timBuoiTiepTheo, tongHopKhoaHoc, tongSoBuoiKhoaHoc } from "../utils/baiTapKhoaHoc";
import "./KhoaHoc.css";
import GachVeTay from "../components/common/GachVeTay";

function LichBuoiHoc({ khoa, buoiTiep }) {
  const theoSo = new Map(khoa.lessons.map((bai) => [bai.lesson_number, bai]));
  const tong = tongSoBuoiKhoaHoc(khoa.title, Math.max(0, ...theoSo.keys()));
  const soBuoiXong = khoa.lessons.filter((bai) => tienDoBuoiHoc(bai).xong).length;

  return (
    <ol
      className="kh-lich"
      aria-label={`${tong} buổi của khoá, ${khoa.lessons.length} buổi đã có nội dung, xong ${soBuoiXong} buổi`}
    >
      {Array.from({ length: tong }, (_, i) => {
        const bai = theoSo.get(i + 1);
        const xong = bai && tienDoBuoiHoc(bai).xong;
        const laBuoiTiep = bai && bai === buoiTiep;
        return (
          <li key={i} style={{ "--thu-tu": i }}>
            {bai ? (
              <Link
                to={`/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`}
                className={`kh-lich__o kh-lich__o--co${xong ? " kh-lich__o--xong" : ""}${laBuoiTiep ? " kh-lich__o--tiep" : ""}`}
                title={bai.title}
                aria-current={laBuoiTiep ? "step" : undefined}
                data-mo-rong
              >
                {i + 1}
                <span className="sr-only">
                  : {bai.title}
                  {xong ? " (đã xong)" : laBuoiTiep ? " (học tiếp buổi này)" : ""}
                </span>
              </Link>
            ) : (
              <span className="kh-lich__o" title="Chưa có nội dung">
                {i + 1}
                <span className="sr-only"> (chưa có nội dung)</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Một buổi trong danh sách: một dòng gọn (số · chủ đề · tiến độ), lưới bản đồ phía trên để nhảy nhanh
function DongBuoiHoc({ khoaId, bai, laBuoiTiep }) {
  const tienDo = tienDoBuoiHoc(bai);
  const trangThai = tienDo.xong ? "xong" : laBuoiTiep ? "tiep" : tienDo.daBatDau ? "dang" : "chua";
  return (
    <Link
      to={`/khoa-hoc/${khoaId}/bai/${bai.lesson_number}`}
      className={`kh-buoi kh-buoi--dong kh-buoi--${trangThai}`}
      aria-current={laBuoiTiep ? "step" : undefined}
      data-mo-rong
    >
      <span className="kh-buoi__so" aria-hidden="true">{bai.lesson_number}</span>
      <span className="kh-buoi__chu">
        <span className="kh-buoi__ten">
          <span className="sr-only">Buổi {bai.lesson_number}: </span>
          {bai.title}
        </span>
        <span className="kh-buoi__meta">
          {tienDo.xong ? (
            <span className="kh-buoi__xong">Đã xong</span>
          ) : (
            <>
              {laBuoiTiep && <span className="kh-buoi__nhan-tiep">Đang học</span>}
              <span>Từ vựng {tienDo.tuDaHoc}/{tienDo.tongTu}</span>
              <span>Bài tập {tienDo.cauDung}/{tienDo.tongCau}</span>
            </>
          )}
        </span>
        {tienDo.daBatDau && !tienDo.xong && (
          <span className="kh-buoi__thanh" aria-hidden="true">
            <span style={{ width: `${tienDo.phanTram}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}

// Thẻ đầu trang: buổi đang học + tiến độ 3 bước + tiến độ cả khoá — việc cần làm nằm trong màn đầu
function TheDangHoc({ khoa, buoiTiep, cauCanOn, soBuoiXong, tongBuoi }) {
  const goc = `/khoa-hoc/${khoa.id}/bai/${buoiTiep.lesson_number}`;
  const tienDo = tienDoBuoiHoc(buoiTiep);
  const cacBuoc = [
    { key: "tu-vung", nhan: "Từ vựng", giaTri: `${tienDo.tuDaHoc}/${tienDo.tongTu} từ`, xong: tienDo.tongTu > 0 && tienDo.tuDaHoc >= tienDo.tongTu },
    { key: "ly-thuyet", nhan: "Lý thuyết", giaTri: "Đọc trước khi làm bài", xong: false },
    { key: "bai-tap", nhan: "Bài tập", giaTri: `${tienDo.cauDung}/${tienDo.tongCau} câu đúng`, xong: tienDo.tongCau > 0 && tienDo.cauDung >= tienDo.tongCau },
  ];
  return (
    <section className="kh-tiep" aria-labelledby="kh-tiep-ten">
      <div className="kh-tiep__chinh">
        <p className="kh-tiep__nhan">{tienDo.daBatDau ? "Đang học" : "Học tiếp"} · Buổi {buoiTiep.lesson_number}</p>
        <h3 id="kh-tiep-ten" className="kh-tiep__ten">{buoiTiep.title}</h3>
        <ol className="kh-tiep__cac-buoc">
          {cacBuoc.map((buoc, i) => (
            <li key={buoc.key}>
              <Link to={`${goc}/${buoc.key}`} className={`kh-tiep__buoc${buoc.xong ? " kh-tiep__buoc--xong" : ""}`}>
                <span className="kh-tiep__buoc-so" aria-hidden="true">{buoc.xong ? "✓" : i + 1}</span>
                <span className="kh-tiep__buoc-chu">
                  <span className="kh-tiep__buoc-ten">{buoc.nhan}</span>
                  <span className="kh-tiep__buoc-gia-tri">{buoc.giaTri}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="kh-khoa__nut">
          <Link to={goc} className="ui-button ui-button--primary px-5 py-2.5" data-mo-rong>
            {tienDo.daBatDau ? "Học tiếp" : "Bắt đầu"} Buổi {buoiTiep.lesson_number}
          </Link>
          {cauCanOn > 0 && (
            <Link to="/review?loai=cau" className="ui-button ui-button--ghost px-5 py-2.5">
              Ôn {cauCanOn} câu sai
            </Link>
          )}
        </div>
      </div>
      <div className="kh-tiep__tong" aria-label={`Đã xong ${soBuoiXong} trên ${tongBuoi} buổi`}>
        <span className="kh-tiep__tong-so">{soBuoiXong}<small>/{tongBuoi}</small></span>
        <span className="kh-tiep__tong-nhan">buổi đã xong</span>
        <span className="kh-buoi__thanh" aria-hidden="true">
          <span style={{ width: `${tongBuoi ? (soBuoiXong / tongBuoi) * 100 : 0}%` }} />
        </span>
      </div>
    </section>
  );
}

function KhoaHocRieng({ khoa }) {
  const buoiTiep = timBuoiTiepTheo(khoa.lessons);
  const { cauCanOn, soBuoiXong } = tongHopKhoaHoc(khoa);
  const tongBuoi = tongSoBuoiKhoaHoc(khoa.title, Math.max(0, ...khoa.lessons.map((bai) => bai.lesson_number)));

  return (
    <section className="kh-khoa" aria-labelledby={`khoa-${khoa.id}`}>
      <header className="kh-khoa__dau">
        <h2 id={`khoa-${khoa.id}`} className="kh-khoa__ten ui-tieu-de-ve-tay">{khoa.title}<GachVeTay /></h2>
        <p className="kh-khoa__mo-ta">
          Tài liệu riêng của bạn. Mỗi buổi học theo thứ tự: từ vựng, lý thuyết, rồi bài tập.
        </p>
      </header>

      {buoiTiep ? (
        <TheDangHoc khoa={khoa} buoiTiep={buoiTiep} cauCanOn={cauCanOn} soBuoiXong={soBuoiXong} tongBuoi={tongBuoi} />
      ) : (
        <p className="kh-trong">Bạn đã học xong mọi buổi hiện có.</p>
      )}

      <section className="kh-ban-do" aria-labelledby={`ban-do-${khoa.id}`}>
        <div className="kh-ban-do__dau">
          <h3 id={`ban-do-${khoa.id}`} className="kh-ban-do__ten">{tongBuoi} buổi</h3>
          <ul className="kh-chu-giai" aria-label="Chú giải">
            <li><span className="kh-chu-giai__o kh-chu-giai__o--xong" aria-hidden="true" />Đã xong</li>
            <li><span className="kh-chu-giai__o kh-chu-giai__o--tiep" aria-hidden="true" />Đang học</li>
            <li><span className="kh-chu-giai__o" aria-hidden="true" />Chưa học</li>
          </ul>
        </div>
        <LichBuoiHoc khoa={khoa} buoiTiep={buoiTiep} />
      </section>

      <section aria-labelledby={`ds-buoi-${khoa.id}`}>
        <h3 id={`ds-buoi-${khoa.id}`} className="kh-ban-do__ten">Danh sách buổi</h3>
        <ol className="kh-ds-buoi">
          {khoa.lessons.map((bai) => (
            <li key={bai.lesson_number}>
              <DongBuoiHoc khoaId={khoa.id} bai={bai} laBuoiTiep={bai === buoiTiep} />
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

/**
 * TrangKhoaHoc — nội dung học có sẵn, học theo thứ tự: khoá học riêng của người dùng (tài liệu cá nhân,
 * chỉ khi đã đăng nhập) ở trên, lộ trình từ vựng công khai ở dưới. Bộ từ tự tạo nằm ở trang "Bộ từ".
 */
function TrangKhoaHoc() {
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [trangThai, setTrangThai] = useState({
    xong: false,
    khoaHoc: [],
    loiKhoaHoc: false,
    loTrinh: [],
    loiLoTrinh: false,
  });
  const [lanThu, setLanThu] = useState(0);

  useLayoutEffect(() => {
    setPageDataLoading("courses", !trangThai.xong);
    return () => setPageDataLoading("courses", false);
  }, [trangThai.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    // Tải riêng từng phần: khoá học lỗi không được làm mất phần lộ trình và ngược lại
    Promise.allSettled([
      isAuthenticated ? layDanhSachKhoaHoc() : Promise.resolve([]),
      layDanhSachLoTrinh(),
    ]).then(([khoaHoc, loTrinh]) => {
      if (!conHieuLuc) return;
      setTrangThai({
        xong: true,
        khoaHoc: khoaHoc.status === "fulfilled" ? khoaHoc.value : [],
        loiKhoaHoc: khoaHoc.status === "rejected",
        loTrinh: loTrinh.status === "fulfilled" ? loTrinh.value : [],
        loiLoTrinh: loTrinh.status === "rejected",
      });
    });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated, lanThu]);

  if (!trangThai.xong) return null;
  const coKhoaRieng = trangThai.khoaHoc.length > 0;

  return (
    <div className="ui-page-stack kh-trang">
      {trangThai.loiKhoaHoc && (
        <div className="kh-trong" role="alert">
          <p>Không tải được khoá học của bạn. Kiểm tra kết nối rồi thử lại.</p>
          <button
            type="button"
            className="ui-button ui-button--primary mt-3 px-5 py-2.5"
            onClick={() => {
              setTrangThai((cu) => ({ ...cu, xong: false }));
              setLanThu((lan) => lan + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {trangThai.khoaHoc.map((khoa) => (
        <KhoaHocRieng key={khoa.id} khoa={khoa} />
      ))}

      {/* Lộ trình mẫu luôn nằm ở đây, dưới khoá học: cùng là chuỗi học có thứ tự */}
      <section className="flex flex-col gap-4" aria-labelledby="lo-trinh-tieu-de">
        <div className="ui-page-header">
          <div className="ui-page-header__title">
            <h2 id="lo-trinh-tieu-de" className="ui-tieu-de-ve-tay text-2xl font-semibold text-[var(--mau-chu)]">
              Lộ trình mẫu
              <GachVeTay />
            </h2>
            <p className="text-sm text-[var(--mau-chu-phu)]">
              {coKhoaRieng
                ? "Học thêm từ vựng theo chủ đề, từ cơ bản đến nâng cao. Từ đã học vào chung lịch ôn tập."
                : "Học theo thứ tự từ cơ bản đến nâng cao, không phải đoán nên học gì tiếp theo."}
            </p>
          </div>
        </div>

        <DanhSachLoTrinh loTrinh={trangThai.loTrinh} coLoi={trangThai.loiLoTrinh} hienTienDo={isAuthenticated} />
      </section>
    </div>
  );
}

export default TrangKhoaHoc;
