import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import ToggleSwitch from "../components/common/ToggleSwitch";
import RewardProgressBar from "../components/common/RewardProgressBar";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";

const DS_CHE_DO = [
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    shortLabel: "EN → VI",
    moTa: "Xem tiếng Anh, gõ nghĩa tiếng Việt",
    labelCauHoi: "ENGLISH",
    labelTraLoi: "Gõ nghĩa tiếng Việt",
  },
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    shortLabel: "VI → EN",
    moTa: "Xem tiếng Việt, gõ từ tiếng Anh",
    labelCauHoi: "VIETNAMESE",
    labelTraLoi: "Gõ từ tiếng Anh",
  },
];

/**
 * Chuan hoa chuoi de so sanh: lowercase, trim, bo dau khoang trang thua.
 */
function chuanHoa(chuoi) {
  return chuoi.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tron mang ngau nhien (Fisher-Yates).
 */
function tronMang(danhSach) {
  const ketQua = [...danhSach];
  for (let i = ketQua.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ketQua[i], ketQua[j]] = [ketQua[j], ketQua[i]];
  }
  return ketQua;
}

function TrangTuLuan() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const danhSachGoc = layTheoBoId(boId);

  const [cheDo, setCheDo] = useState("en-vi");
  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [cauTraLoi, setCauTraLoi] = useState("");
  const [daKiemTra, setDaKiemTra] = useState(false);
  const [ketQuaDung, setKetQuaDung] = useState(false);
  const [daBoQua, setDaBoQua] = useState(false);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(true);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [rewardProgressValue, setRewardProgressValue] = useState(0);

  const inputRef = useRef(null);
  const progressEndpointRef = useRef(null);
  const rewardProgressValueRef = useRef(0);
  const amThanhDungRef = useRef(null);
  const rewardLaunchTimerRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);

  const cheDoHienTai =
    DS_CHE_DO.find((item) => item.key === cheDo) ?? DS_CHE_DO[0];

  // Tron danh sach the moi lan lam hoac doi che do
  const danhSachThe = useMemo(
    () => tronMang(danhSachGoc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boId, lanLam, cheDo]
  );

  useEffect(() => {
    const audio = new Audio("/sound/bigo.mp3");
    audio.preload = "auto";
    audio.volume = 0.9;
    amThanhDungRef.current = audio;

    return () => {
      audio.pause();
      amThanhDungRef.current = null;
    };
  }, []);

  function phatAmThanhDung() {
    const audio = amThanhDungRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function xoaTimerProgressReward() {
    if (rewardLaunchTimerRef.current) {
      clearTimeout(rewardLaunchTimerRef.current);
      rewardLaunchTimerRef.current = null;
    }

    if (rewardProgressTimerRef.current) {
      clearTimeout(rewardProgressTimerRef.current);
      rewardProgressTimerRef.current = null;
    }
  }

  function datLaiProgressReward() {
    xoaTimerProgressReward();
    setRewardProgressPhase("idle");
    setRewardProgressValue(0);
    rewardProgressValueRef.current = 0;
  }

  function batDauTienTrinhReward(diemMoi, coReward) {
    xoaTimerProgressReward();
    setRewardProgressValue(Math.min(diemMoi, soCauDungNhanThuong));
    rewardProgressValueRef.current = Math.min(diemMoi, soCauDungNhanThuong);
    setRewardProgressPhase("correctPulse");

    if (!coReward) {
      rewardProgressTimerRef.current = setTimeout(() => {
        setRewardProgressPhase("idle");
      }, 680);
      return;
    }

    rewardLaunchTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("beamLaunch");
      setLanReward((lanHienTai) => lanHienTai + 1);
      setHienReward(true);
    }, 560);
  }

  function xuLyRewardDongXong() {
    xoaTimerProgressReward();
    setRewardProgressPhase("rewardComplete");
    rewardProgressTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("idle");
      setRewardProgressValue(0);
      rewardProgressValueRef.current = 0;
    }, 780);
  }

  useEffect(
    () => () => {
      xoaTimerProgressReward();
    },
    []
  );

  // Auto-focus vao input khi sang cau moi
  useEffect(() => {
    if (!daHoanThanh && !daKiemTra && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chiSo, daHoanThanh, daKiemTra]);

  // Auto sang cau tiep theo khi tra loi dung:
  // - Neu dang phat reward video: doi video tat xong roi moi sang (800ms sau)
  // - Neu khong co reward: sang sau 2s
  useEffect(() => {
    if (!daKiemTra || !ketQuaDung || daHoanThanh) return undefined;
    if (hienReward) return undefined; // cho video xong

    const delay = lanReward > 0 ? 800 : 2000;
    const timer = setTimeout(() => {
      sangCauTiepTheo();
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward]);

  // Nhan Enter de sang cau tiep khi da bo qua hoac tra loi sai
  useEffect(() => {
    if (!daKiemTra || ketQuaDung || daHoanThanh || daBoQua) return undefined;

    function xuLyEnter(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sangCauTiepTheo();
      }
    }

    window.addEventListener("keydown", xuLyEnter);
    return () => window.removeEventListener("keydown", xuLyEnter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, daHoanThanh, daBoQua]);

  // Tu dong sang cau tiep theo sau khi bo qua
  useEffect(() => {
    if (!daKiemTra || !daBoQua || daHoanThanh) return undefined;

    const timer = setTimeout(() => {
      sangCauTiepTheo();
    }, 3000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, daBoQua, daHoanThanh]);

  // Auto-hide reward sau duration
  useEffect(() => {
    if (!hienReward) return undefined;

    const timer = setTimeout(() => {
      setHienReward(false);
    }, CAU_HINH_REWARD_QUIZ.duration);

    return () => clearTimeout(timer);
  }, [hienReward, lanReward]);

  function layCauHoi(the) {
    return cheDo === "vi-en" ? the.meaning_vi : the.term_en;
  }

  function layDapAnDung(the) {
    return cheDo === "vi-en" ? the.term_en : the.meaning_vi;
  }

  function kiemTraDapAn(event) {
    event.preventDefault();
    if (daKiemTra || hienReward || danhSachThe.length === 0) return;

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    setDaKiemTra(true);
    setKetQuaDung(dung);
    setDaBoQua(false);

    if (dung) {
      phatAmThanhDung();
      setSoCauDung((hienTai) => {
        const diemMoi = hienTai + 1;
        const tienDoMoi =
          ((diemMoi - 1) % soCauDungNhanThuong) + 1;
        const coReward =
          batReward &&
          diemMoi % soCauDungNhanThuong === 0;

        batDauTienTrinhReward(tienDoMoi, coReward);

        return diemMoi;
      });
    }

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: cauTraLoi.trim(),
        dung,
      },
    ]);
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachThe.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((hienTai) => hienTai + 1);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setDaBoQua(false);
  }

  function boQua() {
    if (daKiemTra || hienReward) return;

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: "",
        dung: false,
      },
    ]);

    setDaKiemTra(true);
    setKetQuaDung(false);
    setDaBoQua(true);
  }

  function lamLai() {
    datLaiProgressReward();
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setDaBoQua(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setHienReward(false);
    setLanReward(0);
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    datLaiProgressReward();
    setCheDo(key);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setDaBoQua(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setHienReward(false);
    setLanReward(0);
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) {
        setHienReward(false);
        datLaiProgressReward();
      }
      return !dangBat;
    });
  }

  function capNhatMocReward(event) {
    const giaTriMoi = Math.max(1, Number(event.target.value) || 1);
    datLaiProgressReward();
    setSoCauDungNhanThuong(giaTriMoi);
    setHienReward(false);
    setDaBoQua(false);
  }



  // ========== KHONG TIM THAY BO ==========
  if (!bo) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-phu)] mb-3">
          Không tìm thấy
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này không tồn tại
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Kiểm tra lại đường dẫn hoặc quay về danh sách bộ từ để chọn một bộ khác.
        </p>
        <Link
          to="/decks"
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  // ========== CHUA CO TU NAO ==========
  if (danhSachGoc.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Tự luận
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này chưa có từ nào
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Thêm một vài cặp từ Anh Việt trước khi bắt đầu luyện tập.
        </p>
        <Link
          to={`/decks/${boId}`}
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay lại bộ từ
        </Link>
      </div>
    );
  }

  // ========== DA HOAN THANH ==========
  if (daHoanThanh) {
    const soSai = danhSachThe.length - soCauDung;

    return (
      <>
        <RewardTikTokEffect
          active={batReward && hienReward}
          lanKichHoat={lanReward}
          config={CAU_HINH_REWARD_QUIZ}
          progressEndpointRef={progressEndpointRef}
          onHideComplete={xuLyRewardDongXong}
        />
        <div className="ui-content-enter relative z-10 mx-auto max-w-2xl">
          <Link
            to={`/decks/${boId}`}
            className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            &larr; {bo.title}
          </Link>
          <section className="ui-content-enter mt-6 rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-8 text-center shadow-[var(--bong-card)] sm:px-8 sm:py-9">
            <p className="mb-3 text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
              Tổng kết tự luận
            </p>
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)] sm:text-[2rem]">
              Bạn đúng {soCauDung}/{danhSachThe.length} từ
            </h2>

            <div className="ui-stat-grid mx-auto my-8 max-w-xl">
              <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat-2)]">
                <p className="ui-stat-label mb-1">
                  Tổng câu
                </p>
                <p className="ui-stat-value text-[var(--mau-chu)]">
                  {danhSachThe.length}
                </p>
              </div>
              <div className="ui-stat-card border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5">
                <p className="ui-stat-label mb-1">
                  Đúng
                </p>
                <p className="ui-stat-value text-[var(--mau-thanh-cong)]">
                  {soCauDung}
                </p>
              </div>
              <div className="ui-stat-card border border-[var(--mau-loi)]/35 bg-[var(--mau-loi)]/10">
                <p className="ui-stat-label mb-1">
                  Sai
                </p>
                <p className="ui-stat-value text-[var(--mau-loi)]">
                  {soSai}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                onClick={lamLai}
                className="ui-button ui-button--primary w-full sm:min-w-[9rem] sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Làm lại
              </button>
              <Link
                to={`/decks/${boId}`}
                className="ui-button ui-button--ghost w-full sm:min-w-[11rem] sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors text-center"
              >
                Quay lại bộ từ
              </Link>
              <Link
                to={`/decks/${boId}/flashcard`}
                className="ui-button ui-button--ghost w-full sm:min-w-[12rem] sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors text-center"
              >
                Ôn bằng Flashcard
              </Link>
            </div>
          </section>
        </div>
      </>
    );
  }

  // ========== MAN HINH CHINH ==========
  const theHienTai = danhSachThe[chiSo];
  const cauHoi = layCauHoi(theHienTai);
  const dapAnDung = layDapAnDung(theHienTai);
  const tongSoCauHoi = danhSachThe.length;
  const tienDoReward = (soCauDung / Math.max(1, tongSoCauHoi)) * 100;

  return (
    <>
      <RewardTikTokEffect
        active={batReward && hienReward}
        lanKichHoat={lanReward}
        config={CAU_HINH_REWARD_QUIZ}
        progressEndpointRef={progressEndpointRef}
        onHideComplete={xuLyRewardDongXong}
      />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={`/decks/${boId}`}
            className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            &larr; {bo.title}
          </Link>
          <StudySettingsPopover label="Cài đặt tự luận">
            <section className="ui-settings-popover__section">
              <p className="ui-settings-popover__title">Học tập</p>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Ngôn ngữ</span>
                  <span className="ui-settings-popover__hint">Đổi chiều câu hỏi và đáp án</span>
                </div>
                <ModeSwitch
                  value={cheDo}
                  onChange={doiCheDoHoc}
                  options={DS_CHE_DO}
                  ariaLabel="Đổi chế độ tự luận"
                  variant="compact"
                />
              </div>
            </section>
            <section className="ui-settings-popover__section">
              <p className="ui-settings-popover__title">Phần thưởng</p>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Reward</span>
                  <span className="ui-settings-popover__hint">Bật hoặc tắt hiệu ứng thưởng</span>
                </div>
                <ToggleSwitch
                  checked={batReward}
                  onChange={doiCheDoReward}
                  ariaLabel={`Reward ${batReward ? "bật" : "tắt"}`}
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <label htmlFor="moc-reward-tuluan" className="ui-settings-popover__label">
                    Mốc thưởng
                  </label>
                  <span className="ui-settings-popover__hint">Số câu đúng để kích hoạt thưởng</span>
                </div>
                <input
                  id="moc-reward-tuluan"
                  type="number"
                  min="1"
                  value={soCauDungNhanThuong}
                  onChange={capNhatMocReward}
                  className="ui-input--compact rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                />
              </div>
            </section>
          </StudySettingsPopover>
        </div>
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="ui-chip ui-chip--muted ui-chip--small">
              Câu {chiSo + 1}/{danhSachThe.length}
            </span>
          </div>
          <RewardProgressBar
            currentValue={soCauDung}
            totalValue={tongSoCauHoi}
            progressPercent={tienDoReward}
            phase={rewardProgressPhase}
            endpointRef={progressEndpointRef}
            label="Tiến độ"
          />
        </div>

        {/* Cau hoi */}
        <section
          key={`${cheDo}-${chiSo}`}
          className="ui-content-enter mb-5 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-9 text-center shadow-[var(--bong-card)] sm:px-8 sm:py-10"
        >
          <h2 className="break-words text-4xl font-semibold leading-snug text-[var(--mau-chu)] sm:text-[3rem]">
            {cauHoi}
          </h2>
        </section>

        {/* Form nhap dap an */}
        <form onSubmit={kiemTraDapAn} className="mb-4">
          <label
            htmlFor="cau-tra-loi"
            className="block ui-label mb-2"
          >
            {cheDoHienTai.labelTraLoi}
          </label>
          <div className="rounded-xl border border-[var(--mau-vien)]/70 bg-[var(--mau-mat)]/40 p-3 sm:p-3.5">
            <input
              ref={inputRef}
              id="cau-tra-loi"
              type="text"
              value={cauTraLoi}
              onChange={(e) => {
                setCauTraLoi(e.target.value);
                if (daBoQua) setDaBoQua(false);
              }}
              disabled={daKiemTra}
              autoComplete="off"
              spellCheck="false"
              placeholder="Nhập câu trả lời..."
              className={`min-h-[3.75rem] w-full rounded-xl border px-5 py-3.5 text-lg text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:cursor-default disabled:opacity-70 transition-colors ${daKiemTra && ketQuaDung
                ? "border-[var(--mau-thanh-cong)] bg-[var(--mau-thanh-cong)]/5"
                : daKiemTra && !ketQuaDung
                  ? "border-[var(--mau-loi)] bg-[var(--mau-loi)]/5"
                  : "border-[var(--mau-vien)] bg-[var(--mau-input)]"
                }`}
            />
            {!daKiemTra && (
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={boQua}
                  className="ui-button ui-button--ghost min-h-11 rounded-lg border border-[var(--mau-vien)] px-4 py-2 text-sm text-[var(--mau-chu-phu)] hover:border-[var(--mau-chinh)]/40 hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors sm:min-w-[6.5rem]"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={!cauTraLoi.trim()}
                  className="ui-button ui-button--primary min-h-11 rounded-lg bg-[var(--mau-chinh)] px-4 py-2 text-sm font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors sm:min-w-[7.5rem]"
                >
                  Kiểm tra
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Feedback */}
        {daKiemTra && (
          <div className="ui-feedback-pop text-center mb-6">
            {ketQuaDung ? (
              <p className="text-sm font-medium text-[var(--mau-thanh-cong)] mb-4">
                ✓ Chính xác! Câu tiếp theo nhé...
              </p>
            ) : daBoQua ? (
              <div className="mb-4">
                <p className="text-sm text-[var(--mau-chu-phu)]">
                  Đáp án đúng:{" "}
                  <span className="font-semibold text-[var(--mau-chinh)]">
                    {dapAnDung}
                  </span>
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--mau-loi)] mb-2">
                  ✗ Chưa đúng
                </p>
                <p className="text-sm text-[var(--mau-chu-phu)]">
                  Đáp án đúng:{" "}
                  <span className="font-semibold text-[var(--mau-chinh)]">
                    {dapAnDung}
                  </span>
                </p>
              </div>
            )}

            {!ketQuaDung && !daBoQua && (
              <button
                type="button"
                onClick={sangCauTiepTheo}
                className="ui-button ui-button--primary px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                {chiSo + 1 >= danhSachThe.length ? "Xem kết quả" : "Câu tiếp theo →"}
              </button>
            )}
          </div>
        )}

        {/* Diem hien tai */}
        <div className="mt-2 flex items-center justify-center gap-6 border-t border-[var(--mau-vien)]/60 pt-4 text-sm text-[var(--mau-chu-phu)]">
          <span>
            Đúng:{" "}
            <span className="font-mono font-bold text-[var(--mau-thanh-cong)]">
              {soCauDung}
            </span>
          </span>
          <span>
            Sai:{" "}
            <span className="font-mono font-bold text-[var(--mau-loi)]">
              {danhSachKetQua.filter((item) => !item.dung).length}
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

export default TrangTuLuan;
