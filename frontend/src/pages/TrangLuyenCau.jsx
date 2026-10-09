import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import TheTrangThaiPhien from "../components/common/TheTrangThaiPhien";
import { useAuth } from "../contexts/AuthContext";
import useBoTuHoc from "../hooks/useBoTuHoc";
import { chamCauAI } from "../services/cardApi";
import * as tts from "../services/ttsService";
import { apDungBoLoc, docBoLocTuUrl, taoQueryBoLoc } from "../utils/locTuVung";
import { layNhanDangGiongNoi, soSanhTungTu, TI_LE_DAT } from "../utils/luyenCau";
import { chonTheChoPhien, taoHatGiong } from "../utils/phienHoc";

const CAC_KIEU = [
  { key: "nghe-chep", nhan: "Nghe chép", moTa: "Nghe cả câu ví dụ rồi chép lại", canCau: true },
  { key: "noi-theo", nhan: "Nói theo", moTa: "Nghe mẫu rồi đọc to, app nghe và chấm từng từ", canCau: true },
  { key: "dat-cau", nhan: "Đặt câu", moTa: "Tự viết một câu với từ, AI chấm và sửa", canCau: false },
];

// Cùng kiểu nút với các trang khác: lớp ui-button chỉ lo hiệu ứng, khung/màu ghép bằng tiện ích
const NUT_CHINH =
  "ui-button ui-button--primary inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] disabled:opacity-50 transition-colors";
const NUT_PHU =
  "ui-button ui-button--ghost inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--mau-vien)] px-4 py-2 text-sm font-semibold text-[var(--mau-chu)] hover:bg-[var(--mau-mat-hover)] transition-colors";

function docKieu(giaTri) {
  return CAC_KIEU.some((kieu) => kieu.key === giaTri) ? giaTri : "nghe-chep";
}

/** Câu mẫu tô màu: từ đúng xanh, từ sai/thiếu đỏ gạch chân. */
function CauDaCham({ ketQua }) {
  return (
    <p lang="en" className="text-lg leading-relaxed">
      {ketQua.cacTu.map((muc, i) => (
        <span
          key={i}
          className={
            muc.dung
              ? "text-[var(--mau-thanh-cong)]"
              : "text-[var(--mau-loi)] underline decoration-wavy underline-offset-4"
          }
        >
          {muc.tu}{" "}
        </span>
      ))}
    </p>
  );
}

function ThongTinTu({ the }) {
  return (
    <p className="text-sm text-[var(--mau-chu-phu)]">
      <strong lang="en" className="text-[var(--mau-chu)]">{the.term_en}</strong>
      {the.pronunciation && <span lang="en"> {the.pronunciation}</span>}
      {" · "}
      {the.meaning_vi}
    </p>
  );
}

/**
 * TrangLuyenCau — luyện dùng từ trong câu: nghe chép cả câu ví dụ, nói theo (nhận giọng nói của trình duyệt)
 * và tự đặt câu cho AI chấm. Không ghi vào SRS: đây là bước luyện thêm sau khi đã thuộc nghĩa.
 */
function TrangLuyenCau() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const { bo, danhSachGoc, dangTai, loi, taiLai } = useBoTuHoc(boId, "luyen-cau");
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const boLocUrl = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);
  const kieu = docKieu(searchParams.get("kieu"));
  const thongTinKieu = CAC_KIEU.find((muc) => muc.key === kieu);

  const [hatGiong, setHatGiong] = useState(taoHatGiong);
  const [viTri, setViTri] = useState(0);
  const [traLoi, setTraLoi] = useState("");
  const [ketQua, setKetQua] = useState(null); // nghe chép / nói theo: kết quả soSanhTungTu
  const [chamAI, setChamAI] = useState(null); // đặt câu: phản hồi của AI
  const [dangCham, setDangCham] = useState(false);
  const [loiCham, setLoiCham] = useState("");
  const [dangNghe, setDangNghe] = useState(false);
  const [diemCacCau, setDiemCacCau] = useState([]);
  const nhanDangRef = useRef(null);

  const NhanDang = layNhanDangGiongNoi();

  const danhSachThe = useMemo(() => {
    const daLoc = apDungBoLoc(danhSachGoc, {
      filter: boLocUrl.filter,
      sort: boLocUrl.sort,
      tuKhoa: boLocUrl.tuKhoa,
    }).filter((the) => !thongTinKieu.canCau || String(the.example_sentence || "").trim());
    return chonTheChoPhien(daLoc, {
      ngauNhien: boLocUrl.ngauNhien ?? true,
      seed: `luyen-cau-${boId}-${kieu}-${hatGiong}`,
      soLuong: boLocUrl.soLuong || 10,
    });
  }, [danhSachGoc, boLocUrl, thongTinKieu, boId, kieu, hatGiong]);

  const the = danhSachThe[viTri];
  const cauMau = String(the?.example_sentence || "").trim();
  const xong = danhSachThe.length > 0 && viTri >= danhSachThe.length;

  // Dừng đọc / nghe khi rời trang
  useEffect(() => () => {
    tts.stop();
    nhanDangRef.current?.abort();
  }, []);

  // Câu mới (hoặc đổi kiểu): Nghe chép tự đọc câu
  useEffect(() => {
    if (kieu === "nghe-chep" && cauMau) tts.speak(cauMau, "en-US", { rate: 0.85 });
  }, [kieu, cauMau, viTri]);

  function datLaiCau() {
    setTraLoi("");
    setKetQua(null);
    setChamAI(null);
    setLoiCham("");
  }

  function doiKieu(kieuMoi) {
    nhanDangRef.current?.abort();
    const params = new URLSearchParams(searchParams);
    params.set("kieu", kieuMoi);
    setSearchParams(params, { replace: true });
    setViTri(0);
    setDiemCacCau([]);
    datLaiCau();
  }

  function cauTiep() {
    tts.stop();
    if (kieu !== "dat-cau") setDiemCacCau((ds) => [...ds, ketQua?.tiLe ?? 0]);
    else setDiemCacCau((ds) => [...ds, chamAI?.dung_tu && chamAI?.dung_ngu_phap ? 100 : 0]);
    setViTri((v) => v + 1);
    datLaiCau();
  }

  function lamLai() {
    setHatGiong(taoHatGiong());
    setViTri(0);
    setDiemCacCau([]);
    datLaiCau();
  }

  function kiemTraChep(e) {
    e.preventDefault();
    if (!traLoi.trim()) return;
    setKetQua(soSanhTungTu(cauMau, traLoi));
  }

  function batDauNoi() {
    if (!NhanDang || dangNghe) return;
    tts.stop();
    const nhanDang = new NhanDang();
    nhanDang.lang = "en-US";
    nhanDang.interimResults = false;
    nhanDang.maxAlternatives = 3;
    nhanDang.onresult = (event) => {
      // Chọn cách nghe khớp câu mẫu nhất trong các phương án trình duyệt đưa ra
      const cacPhuongAn = Array.from(event.results[0] || [], (pa) => pa.transcript);
      const tot = cacPhuongAn
        .map((loiNoi) => ({ loiNoi, kq: soSanhTungTu(cauMau, loiNoi) }))
        .sort((a, b) => b.kq.soDung - a.kq.soDung)[0];
      if (!tot) return;
      setTraLoi(tot.loiNoi);
      setKetQua(tot.kq);
    };
    nhanDang.onerror = (event) => {
      setLoiCham(
        event.error === "not-allowed"
          ? "Trình duyệt chưa cho dùng micro. Bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép."
          : event.error === "no-speech"
            ? "Chưa nghe thấy gì, bấm mic và nói lại nhé."
            : "Không nhận được giọng nói, thử lại nhé."
      );
    };
    nhanDang.onend = () => setDangNghe(false);
    nhanDangRef.current = nhanDang;
    setLoiCham("");
    setDangNghe(true);
    nhanDang.start();
  }

  async function guiChamCau(e) {
    e.preventDefault();
    if (!traLoi.trim() || dangCham) return;
    setDangCham(true);
    setLoiCham("");
    try {
      setChamAI(await chamCauAI({ termEn: the.term_en, meaningVi: the.meaning_vi, cau: traLoi.trim() }));
    } catch (error) {
      setLoiCham(error.message);
    } finally {
      setDangCham(false);
    }
  }

  const linkTroVe = `/decks/${boId}${taoQueryBoLoc(boLocUrl)}`;

  if (dangTai) return <TheTrangThaiPhien eyebrow="Luyện câu" tieuDe="Đang tải bộ từ..." />;
  if (loi || !bo) {
    return (
      <TheTrangThaiPhien eyebrow="Luyện câu" tieuDe="Không tải được bộ từ" moTa={loi}>
        <button type="button" onClick={taiLai} className="ui-button ui-button--primary ui-study-empty-card__button">
          Thử lại
        </button>
      </TheTrangThaiPhien>
    );
  }

  const thanhChonKieu = (
    <div className="ui-filter-tabs ui-filter-tabs--deck mb-5" role="group" aria-label="Kiểu luyện câu">
      {CAC_KIEU.map((muc) => (
        <button
          key={muc.key}
          type="button"
          onClick={() => doiKieu(muc.key)}
          aria-pressed={muc.key === kieu}
          className="ui-filter-tab"
        >
          <span>{muc.nhan}</span>
        </button>
      ))}
    </div>
  );

  const thanhTrenCung = (
    <div className="ui-study-toolbar mb-4">
      <Link to={linkTroVe} className="ui-back-btn">
        <span className="ui-back-btn__arrow">&larr;</span> Trở về
      </Link>
      <span className="ui-mode-chip">{bo.title}</span>
    </div>
  );

  let noiDung;
  if (danhSachThe.length === 0) {
    noiDung = (
      <section className="ui-question-flow rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 text-center">
        <p className="font-semibold">
          {thongTinKieu.canCau ? "Chưa có từ nào có câu ví dụ" : "Không có từ nào khớp bộ lọc"}
        </p>
        <p className="mt-2 text-sm text-[var(--mau-chu-phu)]">
          {thongTinKieu.canCau
            ? "Thêm câu ví dụ cho từ trong bộ, hoặc chọn \"Đặt câu\"."
            : "Quay lại bộ từ và chọn bộ lọc khác."}
        </p>
      </section>
    );
  } else if (xong) {
    const soDat = diemCacCau.filter((diem) => diem >= TI_LE_DAT).length;
    noiDung = (
      <section className="ui-question-flow rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 text-center shadow-[var(--bong-card)]">
        <span className="ui-dau-cham ui-dau-cham--dung">Xong {diemCacCau.length} câu</span>
        <p className="mt-3 text-sm text-[var(--mau-chu-phu)]">
          {kieu === "dat-cau" ? "Câu dùng đúng từ và đúng ngữ pháp" : `Câu đúng từ ${TI_LE_DAT}% số từ trở lên`}:{" "}
          <strong className="text-[var(--mau-chu)]">{soDat}/{diemCacCau.length}</strong>
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={lamLai} className={NUT_CHINH}>Luyện lượt mới</button>
          <Link to={linkTroVe} className={NUT_PHU}>Về bộ từ</Link>
        </div>
      </section>
    );
  } else {
    const daCham = kieu === "dat-cau" ? Boolean(chamAI) : Boolean(ketQua);
    noiDung = (
      <section key={`${kieu}-${viTri}`} className="ui-question-flow space-y-4 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-6 shadow-[var(--bong-card)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--mau-chu-phu)]">{thongTinKieu.moTa}</p>
          <span className="text-xs font-semibold tabular-nums text-[var(--mau-chu-phu)]">
            {viTri + 1}/{danhSachThe.length}
          </span>
        </div>

        {kieu === "nghe-chep" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={NUT_PHU} onClick={() => tts.speak(cauMau, "en-US", { rate: 0.85 })}>
                🔊 Nghe lại
              </button>
              <button type="button" className={NUT_PHU} onClick={() => tts.speak(cauMau, "en-US", { rate: 0.55 })}>
                🐢 Nghe chậm
              </button>
            </div>
            {!ketQua ? (
              <form onSubmit={kiemTraChep} className="space-y-3">
                <textarea
                  lang="en"
                  value={traLoi}
                  onChange={(e) => setTraLoi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) kiemTraChep(e);
                  }}
                  rows={3}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="Gõ lại câu vừa nghe..."
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2 text-base"
                />
                <button type="submit" className={NUT_CHINH} disabled={!traLoi.trim()}>
                  Kiểm tra
                </button>
              </form>
            ) : (
              <p className="text-sm text-[var(--mau-chu-phu)]">Bạn viết: <span lang="en">{traLoi}</span></p>
            )}
          </>
        )}

        {kieu === "noi-theo" && (
          <>
            <p lang="en" className="text-lg font-semibold leading-relaxed">{cauMau}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={NUT_PHU} onClick={() => tts.speak(cauMau, "en-US", { rate: 0.85 })}>
                🔊 Nghe mẫu
              </button>
              {NhanDang ? (
                <button
                  type="button"
                  className={NUT_CHINH}
                  onClick={batDauNoi}
                  disabled={dangNghe}
                  aria-live="polite"
                >
                  {dangNghe ? "🎙️ Đang nghe..." : ketQua ? "🎤 Nói lại" : "🎤 Bấm rồi đọc to"}
                </button>
              ) : (
                <p className="text-sm text-[var(--mau-loi)]">
                  Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy mở bằng Chrome hoặc Edge.
                </p>
              )}
            </div>
            {ketQua && (
              <p className="text-sm text-[var(--mau-chu-phu)]">App nghe được: <span lang="en">“{traLoi}”</span></p>
            )}
          </>
        )}

        {kieu === "dat-cau" && (
          <>
            <ThongTinTu the={the} />
            {!isAuthenticated ? (
              <p className="text-sm text-[var(--mau-chu-phu)]">
                <Link to="/login" className="font-semibold text-[var(--mau-chinh)] underline">Đăng nhập</Link> để AI chấm câu bạn đặt.
              </p>
            ) : (
              <form onSubmit={guiChamCau} className="space-y-3">
                <textarea
                  lang="en"
                  value={traLoi}
                  onChange={(e) => {
                    setTraLoi(e.target.value);
                    setChamAI(null);
                  }}
                  rows={3}
                  maxLength={300}
                  autoFocus
                  placeholder={`Viết một câu tiếng Anh có dùng "${the.term_en}"...`}
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2 text-base"
                />
                <button type="submit" className={NUT_CHINH} disabled={!traLoi.trim() || dangCham}>
                  {dangCham ? "AI đang chấm..." : chamAI ? "Chấm lại câu đã sửa" : "Nhờ AI chấm"}
                </button>
              </form>
            )}
            {chamAI && (
              <div className="space-y-2 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-4 py-3" aria-live="polite">
                <p className="text-sm font-semibold">
                  <span className={chamAI.dung_tu ? "text-[var(--mau-thanh-cong)]" : "text-[var(--mau-loi)]"}>
                    {chamAI.dung_tu ? "✓ Dùng đúng từ" : "✗ Chưa dùng đúng từ"}
                  </span>
                  {" · "}
                  <span className={chamAI.dung_ngu_phap ? "text-[var(--mau-thanh-cong)]" : "text-[var(--mau-loi)]"}>
                    {chamAI.dung_ngu_phap ? "✓ Đúng ngữ pháp" : "✗ Cần sửa ngữ pháp"}
                  </span>
                </p>
                <p className="text-sm">{chamAI.nhan_xet}</p>
                {chamAI.cau_sua && chamAI.cau_sua !== traLoi.trim() && (
                  <p className="text-sm">
                    Câu gợi ý: <strong lang="en">{chamAI.cau_sua}</strong>{" "}
                    <button type="button" className="ml-1 underline" onClick={() => tts.speak(chamAI.cau_sua, "en-US")}>
                      🔊
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {loiCham && <p className="text-sm text-[var(--mau-loi)]" role="alert">{loiCham}</p>}

        {ketQua && kieu !== "dat-cau" && (
          <div className="space-y-2 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-4 py-3" aria-live="polite">
            <p className="text-sm font-semibold">
              Đúng {ketQua.soDung}/{ketQua.tongSo} từ ({ketQua.tiLe}%)
              {ketQua.tiLe >= TI_LE_DAT ? " — tốt lắm!" : " — nghe lại và thử thêm nhé"}
            </p>
            <CauDaCham ketQua={ketQua} />
            <ThongTinTu the={the} />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {kieu === "nghe-chep" && ketQua && (
            <button type="button" className={NUT_PHU} onClick={datLaiCau}>Chép lại</button>
          )}
          <button
            type="button"
            className={daCham ? NUT_CHINH : NUT_PHU}
            onClick={cauTiep}
          >
            {daCham ? "Câu tiếp" : "Bỏ qua"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="ui-study-session relative z-10 mx-auto max-w-2xl">
      {thanhTrenCung}
      {thanhChonKieu}
      {noiDung}
    </div>
  );
}

function TrangLuyenCauWrapper() {
  const { deckId } = useParams();
  return <TrangLuyenCau key={deckId} />;
}

export default TrangLuyenCauWrapper;
