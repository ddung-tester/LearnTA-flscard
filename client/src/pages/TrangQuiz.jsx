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
import { luuTienDoQuiz } from "../utils/tienDoHocTap";

const DS_CHE_DO_QUIZ = [
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    shortLabel: "EN → VI",
  },
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    shortLabel: "VI → EN",
  },
];

function tronMang(danhSach) {
  return [...danhSach].sort(() => Math.random() - 0.5);
}

function taoDanhSachCauHoi(danhSachThe, cheDo = "en-vi") {
  if (!danhSachThe || danhSachThe.length < 4) return [];

  const laEnVi = cheDo === "en-vi";

  return danhSachThe.map((the) => {
    const cauHoi = laEnVi ? the.term_en : the.meaning_vi;
    const dapAnDung = laEnVi ? the.meaning_vi : the.term_en;

    const dapAnNhieu = tronMang(
      danhSachThe
        .filter((theKhac) => theKhac.id !== the.id)
        .map((theKhac) => (laEnVi ? theKhac.meaning_vi : theKhac.term_en))
    ).slice(0, 3);

    return {
      id: the.id,
      cauHoi,
      dapAnDung,
      danhSachDapAn: tronMang([dapAnDung, ...dapAnNhieu]),
    };
  });
}

function TrangQuiz() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const danhSachThe = layTheoBoId(boId);

  const [cheDo, setCheDo] = useState("en-vi");
  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [hienReward, setHienReward] = useState(false);
  const [diemRewardGanNhat, setDiemRewardGanNhat] = useState(0);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(true);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [rewardProgressValue, setRewardProgressValue] = useState(0);
  const progressEndpointRef = useRef(null);
  const rewardProgressValueRef = useRef(0);
  const amThanhDungRef = useRef(null);
  const rewardLaunchTimerRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);

  const danhSachCauHoi = useMemo(
    () => taoDanhSachCauHoi(danhSachThe, cheDo),
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
      setDiemRewardGanNhat(diemMoi);
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

  function lamLai() {
    datLaiProgressReward();
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDiemRewardGanNhat(0);
    setLanReward(0);
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    datLaiProgressReward();
    setCheDo(key);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDiemRewardGanNhat(0);
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
    setDiemRewardGanNhat(0);
    setHienReward(false);
  }

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null || hienReward) return;

    setDapAnDaChon(dapAn);
    if (dapAn === danhSachCauHoi[chiSo].dapAnDung) {
      phatAmThanhDung();
      setSoCauDung((diemHienTai) => {
        const diemMoi = diemHienTai + 1;
        const tienDoMoi = Math.min(
          rewardProgressValueRef.current + 1,
          soCauDungNhanThuong
        );
        const coReward =
          batReward &&
          tienDoMoi >= soCauDungNhanThuong &&
          diemMoi !== diemRewardGanNhat;

        batDauTienTrinhReward(tienDoMoi, coReward);

        return diemMoi;
      });
    }
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachCauHoi.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((chiSoHienTai) => chiSoHienTai + 1);
    setDapAnDaChon(null);
  }

  useEffect(() => {
    if (dapAnDaChon === null || daHoanThanh || hienReward) return undefined;

    const timer = setTimeout(() => {
      sangCauTiepTheo();
    }, 1000);

    return () => clearTimeout(timer);
  }, [dapAnDaChon, daHoanThanh, hienReward]);

  useEffect(() => {
    if (!bo || !daHoanThanh || danhSachCauHoi.length === 0) return;

    luuTienDoQuiz(boId, {
      correct: soCauDung,
      review: danhSachCauHoi.length - soCauDung,
      total: danhSachCauHoi.length,
    });
  }, [bo, boId, daHoanThanh, danhSachCauHoi.length, soCauDung]);

  useEffect(() => {
    if (!hienReward) return undefined;

    const timer = setTimeout(() => {
      setHienReward(false);
    }, CAU_HINH_REWARD_QUIZ.duration);

    return () => clearTimeout(timer);
  }, [hienReward, lanReward]);

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

  if (danhSachThe.length < 4) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Quiz trắc nghiệm
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Cần ít nhất 4 từ để làm quiz
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Mỗi câu cần 1 đáp án đúng và 3 đáp án nhiễu.
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

  if (daHoanThanh) {
    const soCanOn = danhSachCauHoi.length - soCauDung;

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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={`/decks/${boId}`}
              className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
            >
              &larr; {bo.title}
            </Link>
            <button
              type="button"
              aria-pressed={batReward}
              onClick={doiCheDoReward}
              className={`ui-chip ui-chip--interactive shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${batReward
                  ? "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]"
                  : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
                }`}
            >
              Reward {batReward ? "Bật" : "Tắt"}
            </button>
          </div>
          <section className="ui-content-enter mt-6 border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-5 py-8 text-center shadow-[var(--bong-card)]">
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)] mb-3">
              Tổng kết quiz
            </p>
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
              Bạn nhớ đúng {soCauDung}/{danhSachCauHoi.length} từ
            </h2>
            <p className="text-[var(--mau-chu-phu)] mb-8">
              Cần ôn lại:{" "}
              <span className="font-semibold text-[var(--mau-phu)]">
                {soCanOn} từ
              </span>
            </p>

            <div className="ui-form-actions sm:justify-center">
              <button
                type="button"
                onClick={lamLai}
                className="ui-button ui-button--primary w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Làm lại
              </button>
              <Link
                to={`/decks/${boId}`}
                className="ui-button ui-button--ghost w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Quay lại bộ từ
              </Link>
              <Link
                to={`/decks/${boId}/flashcard`}
                className="ui-button ui-button--ghost w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Ôn bằng Flashcard
              </Link>
            </div>
          </section>
        </div>
      </>
    );
  }

  const cauHienTai = danhSachCauHoi[chiSo];
  const daTraLoi = dapAnDaChon !== null;
  const traLoiDung = dapAnDaChon === cauHienTai.dapAnDung;
  const tongSoCauHoi = danhSachCauHoi.length;
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
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={`/decks/${boId}`}
            className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            &larr; {bo.title}
          </Link>
          <StudySettingsPopover label="Cài đặt trắc nghiệm">
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
                  options={DS_CHE_DO_QUIZ}
                  ariaLabel="Đổi chế độ trắc nghiệm"
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
                  <label htmlFor="moc-reward-quiz" className="ui-settings-popover__label">
                    Mốc thưởng
                  </label>
                  <span className="ui-settings-popover__hint">Số câu đúng để kích hoạt thưởng</span>
                </div>
                <input
                  id="moc-reward-quiz"
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
        <div className="mt-5 mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="ui-chip ui-chip--muted ui-chip--small">
              Câu {chiSo + 1}/{danhSachCauHoi.length}
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

        <section key={cauHienTai.id} className="ui-content-enter text-center mb-7 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-9">
          <h2 className="break-words text-3xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-4xl">
            {cauHienTai.cauHoi}
          </h2>
        </section>

        <div key={`answers-${cauHienTai.id}`} className="ui-content-enter space-y-3 mb-6">
          {cauHienTai.danhSachDapAn.map((dapAn, index) => {
            const laDapAnDung = dapAn === cauHienTai.dapAnDung;
            const laDapAnNguoiDungChon = dapAn === dapAnDaChon;

            let lopTrangThai =
              "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

            if (daTraLoi && laDapAnDung) {
              lopTrangThai = "ui-answer-correct border-[var(--mau-thanh-cong)] bg-[var(--mau-thanh-cong)]/10 text-[var(--mau-chu)]";
            } else if (daTraLoi && laDapAnNguoiDungChon && !laDapAnDung) {
              lopTrangThai = "ui-answer-wrong border-[var(--mau-loi)] bg-[var(--mau-loi)]/10 text-[var(--mau-chu)]";
            } else if (daTraLoi) {
              lopTrangThai = "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] opacity-60";
            }

            return (
              <button
                key={`${cauHienTai.id}-${dapAn}`}
                type="button"
                onClick={() => chonDapAn(dapAn)}
                className={`ui-reading-card min-h-12 w-full rounded-lg border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors ${lopTrangThai}`}
              >
                <span className="text-xs font-mono text-[var(--mau-chu-phu)] mr-3">
                  {index + 1}
                </span>
                <span className="break-words">{dapAn}</span>
              </button>
            );
          })}
        </div>

        {daTraLoi && (
          <div className="ui-feedback-pop text-center">
            <p
              className={`text-sm font-medium mb-4 ${traLoiDung ? "text-[var(--mau-thanh-cong)]" : "text-[var(--mau-loi)]"
                }`}
            >
              {traLoiDung
                ? "Chính xác. Câu tiếp theo nhé..."
                : `Chưa đúng. Đáp án đúng là: ${cauHienTai.dapAnDung}`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default TrangQuiz;
