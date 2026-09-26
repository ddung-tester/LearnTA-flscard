import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import CaiDatPhienHoc from "../components/common/CaiDatPhienHoc";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import ThanhTienDoPhien from "../components/common/ThanhTienDoPhien";
import TheTrangThaiPhien from "../components/common/TheTrangThaiPhien";
import RewardTikTokEffect, { CAU_HINH_REWARD_QUIZ } from "../components/RewardTikTokEffect";
import { ChatbotTheDangHoc } from "../contexts/ChatbotContext";
import useBoTuHoc from "../hooks/useBoTuHoc";
import useCombo from "../hooks/useCombo";
import useLuuKetQuaPhien from "../hooks/useLuuKetQuaPhien";
import usePhanThuongPhien from "../hooks/usePhanThuongPhien";
import useSoundEffect from "../hooks/useSoundEffect";
import useTTS from "../hooks/useTTS";
import { apDungBoLoc, docBoLocTuUrl, taoQueryBoLoc } from "../utils/locTuVung";
import { docCaiDatHocTap, luuCaiDatHocTap } from "../utils/caiDatHocTap";
import {
  chiaVong,
  chonTheChoPhien,
  laCapNoiDung,
  SO_TU_MOI_TIEN_TRINH,
  tachKetQuaPhien,
  taoDanhSachTienTrinh,
  taoHatGiong,
  tinhTienTrinh,
  tronMangOnDinh,
} from "../utils/phienHoc";

const KHOA_CAI_DAT = "noiTu";
const SO_CAP_MOI_VONG = 5;
const THOI_GIAN_NHAY_SAI = 500;

function NutGhep({ noiDung, lang, daGhep, dangChon, dangSai, onChon }) {
  let lopTrangThai =
    "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";
  if (daGhep) lopTrangThai = "ui-answer-correct text-[var(--mau-chu)] opacity-60";
  else if (dangSai) lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)]";
  else if (dangChon) lopTrangThai = "border-[var(--mau-chinh)] bg-[var(--mau-mat-hover)] text-[var(--mau-chu)] ring-2 ring-[var(--mau-chinh)]";

  return (
    <button
      type="button"
      lang={lang}
      onClick={onChon}
      disabled={daGhep}
      aria-pressed={dangChon}
      className={`ui-reading-card min-h-12 w-full rounded-lg border px-3 py-3 text-left break-words transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${lopTrangThai}`}
    >
      {noiDung}
    </button>
  );
}

/**
 * TrangNoiTu — ghép từ tiếng Anh với nghĩa tiếng Việt theo từng vòng (giống luyentu).
 * Mỗi vòng tối đa 5 cặp. Thẻ bị ghép sai ít nhất một lần được tính là sai cho SRS.
 */
function TrangNoiTu() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const {
    bo,
    danhSachGoc,
    dangTai: dangTaiDuLieu,
    loi: loiTaiDuLieu,
    taiLai,
  } = useBoTuHoc(boId, "noi-tu");
  const { speak: ttsSpeak } = useTTS();
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });

  const [searchParams] = useSearchParams();
  const boLocUrl = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);

  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    if (param) return false;
    return docCaiDatHocTap(KHOA_CAI_DAT).chiHocTuYeuThich;
  });
  const [batRandom, setBatRandom] = useState(
    () => boLocUrl.ngauNhien ?? docCaiDatHocTap(KHOA_CAI_DAT).batRandom
  );
  const [batReward, setBatReward] = useState(() => docCaiDatHocTap(KHOA_CAI_DAT).batReward ?? false);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    () => docCaiDatHocTap(KHOA_CAI_DAT).soCauDungNhanThuong ?? CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [lanLam, setLanLam] = useState(0);
  const [lanTron, setLanTron] = useState(taoHatGiong);
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);

  const [vong, setVong] = useState(0);
  // Ghép theo từng cột: thẻ trùng nghĩa có thể ghép chéo nhau
  const [daGhepTrai, setDaGhepTrai] = useState(() => new Set());
  const [daGhepPhai, setDaGhepPhai] = useState(() => new Set());
  const [dangChon, setDangChon] = useState(null); // { ben: "trai" | "phai", the }
  const [capSai, setCapSai] = useState(null); // { trai, phai } đang nháy đỏ
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  const [daHoanThanh, setDaHoanThanh] = useState(false);

  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const phanThuong = usePhanThuongPhien({ batReward, soCauDungNhanThuong });
  const progressEndpointRef = useRef(null);
  const progressOriginRef = useRef(null);
  const capSaiTimerRef = useRef(null);

  const danhSachLoc = useMemo(() => {
    if (danhSachHocLai !== null) return danhSachHocLai;
    return apDungBoLoc(danhSachGoc, {
      filter: chiHocTuYeuThich ? "yeu-thich" : boLocUrl.filter === "yeu-thich" ? "tat-ca" : boLocUrl.filter,
      sort: boLocUrl.sort,
      tuKhoa: boLocUrl.tuKhoa,
    });
  }, [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, boLocUrl]);

  const danhSachThe = useMemo(
    () => chonTheChoPhien(danhSachLoc, {
      ngauNhien: batRandom,
      seed: `noi-tu-${boId}-${lanTron}-${lanLam}`,
      // Làm lại câu sai thì giữ đủ các câu sai
      soLuong: danhSachHocLai !== null ? 0 : boLocUrl.soLuong,
    }),
    [batRandom, boId, danhSachLoc, lanLam, lanTron, danhSachHocLai, boLocUrl.soLuong]
  );

  const cacVong = useMemo(() => chiaVong(danhSachThe, SO_CAP_MOI_VONG), [danhSachThe]);
  const vongHienTai = useMemo(() => cacVong[vong] ?? [], [cacVong, vong]);
  const cotTrai = useMemo(
    () => tronMangOnDinh(vongHienTai, `noi-tu-trai-${boId}-${lanLam}-${vong}`, (the) => the.id),
    [boId, lanLam, vong, vongHienTai]
  );
  const cotPhai = useMemo(
    () => tronMangOnDinh(vongHienTai, `noi-tu-phai-${boId}-${lanLam}-${vong}`, (the) => the.id),
    [boId, lanLam, vong, vongHienTai]
  );

  const tongSoCau = danhSachThe.length;
  const soDaGhep = daGhepTrai.size;
  const tienTrinh = useMemo(
    () => tinhTienTrinh(taoDanhSachTienTrinh(tongSoCau), soDaGhep),
    [tongSoCau, soDaGhep]
  );
  const xongVong = vongHienTai.length > 0 && vongHienTai.every((the) => daGhepTrai.has(the.id));
  const laVongCuoi = vong + 1 >= cacVong.length;

  const [prevDanhSachThe, setPrevDanhSachThe] = useState(danhSachThe);
  if (danhSachThe !== prevDanhSachThe) {
    setPrevDanhSachThe(danhSachThe);
    setVong(0);
    setDaGhepTrai(new Set());
    setDaGhepPhai(new Set());
    setDangChon(null);
    setCapSai(null);
    setTapCardSai(new Set());
    setDaHoanThanh(false);
    resetAll();
  }

  const viTriTrongPhien = useMemo(
    () => new Map(danhSachThe.map((the, index) => [the.id, index])),
    [danhSachThe]
  );

  const { loiLuuKetQua, streakCelebration, dongStreakCelebration } = useLuuKetQuaPhien({
    bo,
    boId,
    mode: "matching",
    questionType: "matching",
    direction: "en-vi",
    onlyFavorite: chiHocTuYeuThich,
    randomOrder: batRandom,
    tongSoCau,
    lanLam: `${lanLam}.${lanTron}`,
    daHoanThanh,
    ketQua: {
      soCauDung: soDaGhep,
      maxCombo,
      soTienTrinhHoanThanh: tienTrinh.soHoanThanh,
      progressSegments: tienTrinh.payload,
      // Mỗi thẻ một đáp án: đúng nếu chưa từng bị ghép sai trong phiên
      answers: danhSachThe
        .filter((the) => daGhepTrai.has(the.id))
        .map((the) => ({
          card_id: the.id,
          question_text: the.term_en,
          correct_answer: the.meaning_vi,
          user_answer: the.meaning_vi,
          is_correct: !tapCardSai.has(the.id),
          answer_meta: {
            segment_index: Math.floor((viTriTrongPhien.get(the.id) ?? 0) / SO_TU_MOI_TIEN_TRINH),
            counts_toward_progress: true,
          },
        })),
    },
  });

  function xoaTimerCapSai() {
    if (capSaiTimerRef.current) {
      clearTimeout(capSaiTimerRef.current);
      capSaiTimerRef.current = null;
    }
  }

  useEffect(() => xoaTimerCapSai, []);

  function chon(ben, the) {
    if (capSai || phanThuong.dangBan || daHoanThanh) return;
    if ((ben === "trai" ? daGhepTrai : daGhepPhai).has(the.id)) return;

    if (!dangChon || dangChon.ben === ben) {
      setDangChon(dangChon?.the.id === the.id && dangChon.ben === ben ? null : { ben, the });
      if (ben === "trai") ttsSpeak(the.term_en, "en-US");
      return;
    }

    const theTrai = ben === "trai" ? the : dangChon.the;
    const thePhai = ben === "phai" ? the : dangChon.the;
    setDangChon(null);

    if (laCapNoiDung(theTrai, thePhai)) {
      const soDaGhepMoi = soDaGhep + 1;
      setDaGhepTrai((prev) => new Set(prev).add(theTrai.id));
      setDaGhepPhai((prev) => new Set(prev).add(thePhai.id));
      phatAmThanhDung();
      incrementCombo();
      phanThuong.ghiNhanCauDung(soDaGhepMoi);
      if (ben === "phai") ttsSpeak(theTrai.term_en, "en-US");
      return;
    }

    // Ghép sai: tính sai cho thẻ được chọn trước (người học đang tìm cặp cho nó)
    resetCombo();
    setTapCardSai((prev) => new Set(prev).add(dangChon.the.id));
    setCapSai({ trai: theTrai.id, phai: thePhai.id });
    xoaTimerCapSai();
    capSaiTimerRef.current = setTimeout(() => {
      setCapSai(null);
      capSaiTimerRef.current = null;
    }, THOI_GIAN_NHAY_SAI);
  }

  function tiepTucVong() {
    if (!xongVong || phanThuong.dangBan) return;
    if (laVongCuoi) {
      setDaHoanThanh(true);
      return;
    }
    setVong((giaTri) => giaTri + 1);
    setDangChon(null);
  }

  // Enter để sang vòng tiếp theo
  useEffect(() => {
    if (!xongVong || daHoanThanh || phanThuong.dangBan) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Enter" && !event.repeat) {
        event.preventDefault();
        tiepTucVong();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xongVong, daHoanThanh, phanThuong.dangBan]);

  // Đưa phiên về vòng đầu; tăng lanLam để xếp lại và mở study session mới.
  function batDauLai() {
    xoaTimerCapSai();
    phanThuong.datLai();
    setLanLam((giaTri) => giaTri + 1);
    setVong(0);
    setDaGhepTrai(new Set());
    setDaGhepPhai(new Set());
    setDangChon(null);
    setCapSai(null);
    setTapCardSai(new Set());
    setDaHoanThanh(false);
    resetAll();
  }

  function lamLai() {
    setDanhSachHocLai(null);
    batDauLai();
  }

  function hocLaiTuSai(danhSachCardSai) {
    if (danhSachCardSai.length === 0) return;
    setDanhSachHocLai(danhSachCardSai);
    batDauLai();
  }

  function doiCheDoReward() {
    const moi = !batReward;
    if (!moi) phanThuong.datLai();
    setBatReward(moi);
    luuCaiDatHocTap(KHOA_CAI_DAT, { chiHocTuYeuThich, batRandom, soCauDungNhanThuong, batReward: moi });
  }

  function capNhatMocReward(event) {
    const giaTriMoi = Math.max(1, Number(event.target.value) || 1);
    phanThuong.datLai();
    setSoCauDungNhanThuong(giaTriMoi);
    luuCaiDatHocTap(KHOA_CAI_DAT, { chiHocTuYeuThich, batRandom, soCauDungNhanThuong: giaTriMoi });
  }

  function doiChiHocTuYeuThich() {
    const moi = !chiHocTuYeuThich;
    setChiHocTuYeuThich(moi);
    luuCaiDatHocTap(KHOA_CAI_DAT, { chiHocTuYeuThich: moi, batRandom, soCauDungNhanThuong });
    batDauLai();
  }

  function doiRandom() {
    const moi = !batRandom;
    setBatRandom(moi);
    luuCaiDatHocTap(KHOA_CAI_DAT, { chiHocTuYeuThich, batRandom: moi, soCauDungNhanThuong });
    if (moi) setLanTron((n) => n + 1);
    batDauLai();
  }

  if (dangTaiDuLieu) {
    return <TheTrangThaiPhien tieuDe="Đang tải dữ liệu..." />;
  }

  if (loiTaiDuLieu) {
    return (
      <TheTrangThaiPhien tieuDe="Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.">
        <button
          type="button"
          onClick={taiLai}
          className="ui-button ui-button--primary ui-study-empty-card__button"
        >
          Thử lại
        </button>
      </TheTrangThaiPhien>
    );
  }

  if (!bo) return null;

  if (danhSachThe.length === 0) {
    const dangThieuTuYeuThich = chiHocTuYeuThich && danhSachGoc.length > 0;
    const khongKhopBoLoc = !chiHocTuYeuThich && danhSachGoc.length > 0;

    return (
      <TheTrangThaiPhien
        eyebrow="Nối từ"
        tieuDe={
          dangThieuTuYeuThich
            ? "Chưa có từ yêu thích"
            : khongKhopBoLoc
              ? "Không có từ nào khớp bộ lọc"
              : "Bộ từ này chưa có từ nào"
        }
        moTa={
          dangThieuTuYeuThich
            ? "Tắt lọc yêu thích hoặc thả tim thêm vài từ trước khi nối từ."
            : khongKhopBoLoc
              ? "Quay lại bộ từ và chọn bộ lọc khác."
              : "Thêm một vài cặp từ Anh Việt trước khi bắt đầu."
        }
      >
        {dangThieuTuYeuThich && (
          <button
            type="button"
            onClick={doiChiHocTuYeuThich}
            className="ui-button ui-button--ghost ui-study-empty-card__button"
          >
            Tắt lọc yêu thích
          </button>
        )}
        <Link
          to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`}
          className="ui-button ui-button--primary ui-study-empty-card__button"
        >
          Quay lại bộ từ
        </Link>
      </TheTrangThaiPhien>
    );
  }

  const hieuUngThuong = (
    <RewardTikTokEffect
      active={batReward && phanThuong.hienReward}
      lanKichHoat={phanThuong.lanReward}
      config={CAU_HINH_REWARD_QUIZ}
      progressOriginRef={progressOriginRef}
      progressEndpointRef={progressEndpointRef}
      onRequestClose={phanThuong.dongReward}
      onHideComplete={phanThuong.ketThucReward}
      combo={combo}
      tenseExamples={null}
    />
  );

  if (daHoanThanh) {
    const { danhSachCardDung, danhSachCardSai } = tachKetQuaPhien(danhSachThe, tapCardSai);

    return (
      <>
        {streakCelebration !== null && (
          <StreakCelebration streak={streakCelebration} onClose={dongStreakCelebration} />
        )}
        {hieuUngThuong}
        <div className="ui-content-enter ui-study-session relative z-10 mx-auto max-w-2xl">
          <StudyResult
            deckTitle={bo.title}
            deckId={boId}
            tongSoCau={tongSoCau}
            soCauDung={danhSachCardDung.length}
            soCauSai={danhSachCardSai.length}
            maxCombo={maxCombo}
            loiLuu={loiLuuKetQua}
            onLamLai={lamLai}
            onHocLaiTuSai={
              danhSachCardSai.length > 0 ? () => hocLaiTuSai(danhSachCardSai) : undefined
            }
            danhSachCardSai={danhSachCardSai}
            danhSachCardDung={danhSachCardDung}
            laLamLai={danhSachHocLai !== null}
            mode="noi-tu"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ChatbotTheDangHoc the={dangChon?.the} />
      {hieuUngThuong}
      <div className="ui-study-session relative z-10 mx-auto max-w-2xl">
        <div className="ui-study-toolbar mb-6">
          <Link to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`} className="ui-back-btn">
            <span className="ui-back-btn__arrow">&larr;</span> Trở về
          </Link>
          <CaiDatPhienHoc
            label="Cài đặt nối từ"
            idMocReward="moc-reward-noi-tu"
            chiHocTuYeuThich={chiHocTuYeuThich}
            onDoiYeuThich={doiChiHocTuYeuThich}
            batRandom={batRandom}
            onDoiRandom={doiRandom}
            batReward={batReward}
            onDoiReward={doiCheDoReward}
            soCauDungNhanThuong={soCauDungNhanThuong}
            onDoiMocReward={capNhatMocReward}
          />
        </div>

        <ThanhTienDoPhien
          className="ui-quiz-progress mb-6"
          nhanCheDo={`Nối từ · Vòng ${vong + 1}/${cacVong.length}`}
          soCauDung={soDaGhep}
          tongSoCau={tongSoCau}
          tienTrinh={tienTrinh}
          phase={phanThuong.phase}
          originRef={progressOriginRef}
          endpointRef={progressEndpointRef}
          combo={combo}
          comboPhase={comboPhase}
        />

        {xongVong ? (
          <section
            key={`xong-${vong}`}
            className="ui-question-flow rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 text-center shadow-[var(--bong-card)]"
          >
            <span className="ui-dau-cham ui-dau-cham--dung">Xong vòng {vong + 1}</span>
            <p className="mt-3 text-sm text-[var(--mau-chu-phu)]">
              Đã ghép {soDaGhep} từ · còn {tongSoCau - soDaGhep} từ
            </p>
            <button
              type="button"
              onClick={tiepTucVong}
              className="ui-button ui-button--primary mt-5 rounded-xl px-6 py-2.5 font-bold"
            >
              {laVongCuoi ? "Xem kết quả" : "Vòng tiếp theo"}
            </button>
            <p className="mt-2 text-xs text-[var(--mau-chu-phu)]">hoặc nhấn Enter ↵</p>
          </section>
        ) : (
          <section key={`vong-${vong}`} className="ui-question-flow">
            <p className="mb-3 text-center text-sm text-[var(--mau-chu-phu)]">
              Chọn một từ rồi chọn nghĩa tương ứng
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--mau-chu-phu)]">
                  Tiếng Anh
                </p>
                {cotTrai.map((the) => (
                  <NutGhep
                    key={the.id}
                    lang="en"
                    noiDung={the.term_en}
                    daGhep={daGhepTrai.has(the.id)}
                    dangChon={dangChon?.ben === "trai" && dangChon.the.id === the.id}
                    dangSai={capSai?.trai === the.id}
                    onChon={() => chon("trai", the)}
                  />
                ))}
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--mau-chu-phu)]">
                  Tiếng Việt
                </p>
                {cotPhai.map((the) => (
                  <NutGhep
                    key={the.id}
                    lang="vi"
                    noiDung={the.meaning_vi}
                    daGhep={daGhepPhai.has(the.id)}
                    dangChon={dangChon?.ben === "phai" && dangChon.the.id === the.id}
                    dangSai={capSai?.phai === the.id}
                    onChon={() => chon("phai", the)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function TrangNoiTuWrapper() {
  const { deckId } = useParams();
  return <TrangNoiTu key={deckId} />;
}

export default TrangNoiTuWrapper;
