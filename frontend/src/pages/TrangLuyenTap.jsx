import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layCardsTheoDeck } from "../services/cardApi";
import { layDanhSachDeck } from "../services/deckApi";
import { docCaiDatHocTap, luuCaiDatHocTap } from "../utils/caiDatHocTap";
import {
  apDungBoLoc,
  demTheoFilter,
  locFilterCoIch,
  soLuongCoIch,
  taoQueryBoLoc,
} from "../utils/locTuVung";
import { nhomBoTuTheoNguon } from "../utils/nguonBoTu";
import { cheTuTrongCau } from "../utils/phienHoc";
import { layThongKeSRS, taiSRSDongBo } from "../utils/srsReview";
import GachVeTay from "../components/common/GachVeTay";

const KHOA_CAI_DAT = "luyenTap";
const DANH_SACH_RONG = [];

const CAC_CHE_DO = [
  { path: "flashcard", ten: "Flashcard", moTa: "Lật thẻ học từ vựng" },
  { path: "quiz", ten: "Trắc nghiệm", moTa: "Chọn đáp án đúng", canBonTu: true },
  { path: "tu-luan", ten: "Tự luận", moTa: "Nhìn nghĩa, gõ từ tiếng Anh" },
  { path: "nghe-viet", ten: "Nghe viết", moTa: "Nghe phát âm và viết từ" },
  { path: "ngu-canh", ten: "Ngữ cảnh", moTa: "Chọn từ phù hợp với câu", canBonTu: true, canViDu: true },
  { path: "noi-tu", ten: "Nối từ", moTa: "Ghép đôi từ vựng và nghĩa" },
  { path: "hon-hop", ten: "Hỗn hợp", moTa: "Trắc nghiệm, gõ nghĩa, gõ từ, nghe viết" },
];

const BO_LOC = [
  { key: "tat-ca", label: "Tất cả" },
  { key: "chua-hoc-filter", label: "Chưa học" },
  { key: "da-hoc", label: "Đã học" },
];

function NhomChip({ nhan, luaChon, giaTri, onChon }) {
  return (
    <div className="practice-field">
      <p className="practice-field__label">{nhan}</p>
      {/* Cùng kiểu segmented control với bộ lọc ở trang chi tiết bộ và bài tập khoá học */}
      <div className="ui-filter-tabs ui-filter-tabs--deck" role="group" aria-label={nhan}>
        {luaChon.map((muc) => (
          <button
            key={String(muc.giaTri)}
            type="button"
            onClick={() => onChon(muc.giaTri)}
            aria-pressed={muc.giaTri === giaTri}
            className="ui-filter-tab"
          >
            <span>{muc.nhan}</span>
            {muc.so !== undefined && <span className="ui-filter-tab__count">{muc.so}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * TrangLuyenTap — chọn bộ từ, bộ lọc, thứ tự, số lượng rồi chọn chế độ học (giống luyentu).
 * Kèm lối tắt vào ôn tập SRS.
 */
function TrangLuyenTap() {
  const { isAuthenticated } = useAuth();
  const { setPageDataLoading } = usePageTransition();
  const [searchParams] = useSearchParams();
  // ?bo=<id>: mở sẵn một bộ từ (vd. từ buổi học hoặc chặng lộ trình)
  const boTuUrl = Number(searchParams.get("bo")) || null;
  const [caiDat, setCaiDat] = useState(() => {
    const daLuu = docCaiDatHocTap(KHOA_CAI_DAT);
    return boTuUrl ? { ...daLuu, boId: boTuUrl } : daLuu;
  });
  const [dsBo, setDsBo] = useState({ xong: false, danhSach: [], loi: "" });
  // Thẻ của bộ đang chọn; dangTai suy ra từ boId để không phải setState đồng bộ trong effect
  const [theCuaBo, setTheCuaBo] = useState({ boId: null, danhSach: [], loi: "", lanTai: 0 });
  const [lanTaiThe, setLanTaiThe] = useState(0);
  const [srsStats, setSrsStats] = useState(() => layThongKeSRS());

  useLayoutEffect(() => {
    setPageDataLoading("practice", !dsBo.xong);
    return () => setPageDataLoading("practice", false);
  }, [dsBo.xong, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;

    // Mọi bộ học được: tự tạo + khoá học + lộ trình, đã xếp theo nhóm nguồn
    layDanhSachDeck({ scope: "learnable" })
      .then((danhSach) => {
        if (conHieuLuc) setDsBo({ xong: true, danhSach, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setDsBo({ xong: true, danhSach: [], loi: error.message });
      });

    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let conHieuLuc = true;
    taiSRSDongBo({ limit: 200 }).then(() => {
      if (conHieuLuc) setSrsStats(layThongKeSRS());
    });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated]);

  const boId = dsBo.danhSach.some((bo) => bo.id === caiDat.boId)
    ? caiDat.boId
    : dsBo.danhSach[0]?.id ?? null;

  useEffect(() => {
    if (!boId) return undefined;
    let conHieuLuc = true;
    layCardsTheoDeck(boId)
      .then((danhSach) => {
        if (conHieuLuc) setTheCuaBo({ boId, danhSach, loi: "", lanTai: lanTaiThe });
      })
      .catch((error) => {
        if (conHieuLuc) setTheCuaBo({ boId, danhSach: [], loi: error.message, lanTai: lanTaiThe });
      });
    return () => {
      conHieuLuc = false;
    };
  }, [boId, lanTaiThe]);

  const boDangChon = dsBo.danhSach.find((bo) => bo.id === boId) ?? null;
  const dangTaiThe = boId !== null && (theCuaBo.boId !== boId || theCuaBo.lanTai !== lanTaiThe);
  const danhSachThe = dangTaiThe ? DANH_SACH_RONG : theCuaBo.danhSach;
  const demFilter = useMemo(() => demTheoFilter(danhSachThe), [danhSachThe]);
  const danhSachLoc = useMemo(
    () => apDungBoLoc(danhSachThe, { filter: caiDat.filter }),
    [danhSachThe, caiDat.filter]
  );
  const soTuSanSang =
    caiDat.soLuong > 0 ? Math.min(caiDat.soLuong, danhSachLoc.length) : danhSachLoc.length;
  // Chỉ hiện lựa chọn có tác dụng; bộ mới chưa học từ nào thì không cần hàng "Bộ lọc"
  const boLocCoIch = locFilterCoIch(BO_LOC, demFilter, caiDat.filter);
  const soLuongHien = soLuongCoIch(danhSachLoc.length, caiDat.soLuong);
  const coNguCanh = danhSachLoc.some((the) => cheTuTrongCau(the.example_sentence, the.term_en));
  // Luôn gửi filter tường minh (kể cả "tat-ca") để trang học không rơi về cài đặt
  // "chỉ học yêu thích" đã lưu, giống trang chi tiết bộ từ.
  const query = `?filter=${caiDat.filter}${taoQueryBoLoc({
    soLuong: caiDat.soLuong,
    ngauNhien: caiDat.ngauNhien,
  }).replace("?", "&")}`;

  function capNhat(thayDoi) {
    const moi = { ...caiDat, ...thayDoi };
    setCaiDat(moi);
    luuCaiDatHocTap(KHOA_CAI_DAT, moi);
  }

  function lyDoKhoa(cheDo) {
    if (dangTaiThe) return "Đang tải từ vựng...";
    if (theCuaBo.loi) return "Chưa tải được từ vựng";
    if (soTuSanSang === 0) return "Không có từ nào khớp bộ lọc";
    if (cheDo.canBonTu && danhSachThe.length < 4) return "Cần ít nhất 4 từ trong bộ";
    if (cheDo.canViDu && !coNguCanh) return "Cần câu ví dụ có chứa chính từ đang học";
    return "";
  }

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="ui-tieu-de-ve-tay text-2xl font-semibold text-[var(--mau-chu)]">Luyện tập<GachVeTay /></h2>
        </div>
      </div>

      <div className="practice-layout">
        <section className="practice-panel" aria-labelledby="practice-setup-title">
          <h3 id="practice-setup-title" className="practice-panel__title">Chọn từ để học</h3>

          {dsBo.xong && dsBo.danhSach.length === 0 ? (
            <p className="text-sm text-[var(--mau-chu-phu)]">
              {dsBo.loi ? "Không tải được danh sách bộ từ." : "Chưa có bộ từ nào."}{" "}
              <Link to="/decks" className="ui-link font-semibold text-[var(--mau-chinh)]">
                Xem bộ từ
              </Link>
            </p>
          ) : (
            <>
              <label className="practice-field">
                <span className="practice-field__label">Bộ từ vựng</span>
                <select
                  value={boId ?? ""}
                  onChange={(event) => capNhat({ boId: Number(event.target.value) })}
                  className="ui-word-sort__select practice-select"
                  disabled={!dsBo.xong}
                >
                  {nhomBoTuTheoNguon(dsBo.danhSach).map((nhom) => (
                    <optgroup key={nhom.khoa} label={nhom.nhan}>
                      {nhom.danhSach.map((bo) => (
                        <option key={bo.id} value={bo.id}>
                          {bo.title} ({bo.card_count ?? 0} từ)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* Ô chọn không xuống dòng được: màn hẹp hiện đủ tên bộ dài ngay bên dưới */}
                {boDangChon && boDangChon.title.length > 26 && (
                  <span className="practice-select__ten-day-du" aria-hidden="true">
                    {boDangChon.title}
                  </span>
                )}
              </label>

              {!dangTaiThe && boLocCoIch.length > 1 && (
                <NhomChip
                  nhan="Bộ lọc"
                  giaTri={caiDat.filter}
                  onChon={(filter) => capNhat({ filter })}
                  luaChon={boLocCoIch.map((muc) => ({
                    giaTri: muc.key,
                    nhan: muc.label,
                    so: demFilter[muc.key] ?? 0,
                  }))}
                />
              )}
              <NhomChip
                nhan="Thứ tự"
                giaTri={caiDat.ngauNhien}
                onChon={(ngauNhien) => capNhat({ ngauNhien })}
                luaChon={[
                  { giaTri: true, nhan: "Ngẫu nhiên" },
                  { giaTri: false, nhan: "Theo thứ tự" },
                ]}
              />
              {!dangTaiThe && soLuongHien.length > 1 && (
                <NhomChip
                  nhan="Số lượng"
                  giaTri={caiDat.soLuong}
                  onChon={(soLuong) => capNhat({ soLuong })}
                  luaChon={soLuongHien.map((so) => ({
                    giaTri: so,
                    nhan: so === 0 ? "Tất cả" : `${so} từ`,
                  }))}
                />
              )}

              <p className="practice-ready" aria-live="polite">
                {theCuaBo.loi && !dangTaiThe ? (
                  <>Không tải được từ vựng.{" "}
                    <button type="button" className="ui-button ui-button--ghost" onClick={() => setLanTaiThe((lan) => lan + 1)}>Thử lại</button>
                  </>
                ) : dangTaiThe ? "Đang tải từ vựng..." : <><strong>{soTuSanSang}</strong> từ sẵn sàng</>}
              </p>
            </>
          )}
        </section>

        <aside className="practice-panel practice-srs" aria-labelledby="practice-srs-title">
          <h3 id="practice-srs-title" className="practice-panel__title">Ôn tập ngắt quãng (SRS)</h3>
          <p className="text-sm text-[var(--mau-chu-phu)]">
            Hệ thống tự nhắc lại các từ bạn sắp quên. Học ít, nhớ lâu.
          </p>
          {isAuthenticated ? (
            <>
              <p className="practice-ready">
                <strong>{srsStats.duHomNay}</strong> từ đến hạn · {srsStats.total} từ đang học
              </p>
              <Link to="/review" className="ui-button ui-button--primary practice-srs__btn">
                Bắt đầu ôn tập
              </Link>
            </>
          ) : (
            <Link to="/login" className="ui-button ui-button--ghost practice-srs__btn">
              Đăng nhập để ôn SRS
            </Link>
          )}
        </aside>
      </div>

      {boId !== null && (
        <section aria-labelledby="practice-modes-title">
          <h3 id="practice-modes-title" className="practice-panel__title mb-3">Chọn chế độ</h3>
          <div className="practice-modes">
            {CAC_CHE_DO.map((cheDo) => {
              const lyDo = lyDoKhoa(cheDo);
              const noiDung = (
                <>
                  <span className="practice-mode__name">{cheDo.ten}</span>
                  <span className="practice-mode__desc">{lyDo || cheDo.moTa}</span>
                </>
              );

              return lyDo ? (
                <span
                  key={cheDo.path}
                  className="practice-mode practice-mode--disabled"
                  aria-disabled="true"
                  title={lyDo}
                >
                  {noiDung}
                </span>
              ) : (
                <Link key={cheDo.path} to={`/decks/${boId}/${cheDo.path}${query}`} className="practice-mode" data-mo-rong>
                  {noiDung}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default TrangLuyenTap;
