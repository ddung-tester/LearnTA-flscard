import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import ToggleSwitch from "../components/common/ToggleSwitch";
import RewardProgressBar from "../components/common/RewardProgressBar";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useCombo from "../hooks/useCombo";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { locTuYeuThich } from "../data/duLieuMau";
import { luuTienDoQuiz } from "../utils/tienDoHocTap";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";
import {
  ketThucStudySession,
  luuQuizResult,
  luuStudyAnswers,
  taoStudySession,
} from "../services/studyApi";

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

const CHE_DO_MAC_DINH_QUIZ = "vi-en";

function taoSoTuSeed(seed) {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function tronMangOnDinh(danhSach, seed, layKhoa = (item, index) => `${index}-${item}`) {
  return [...danhSach]
    .map((item, index) => ({
      item,
      thuTu: taoSoTuSeed(`${seed}-${layKhoa(item, index)}`),
    }))
    .sort((a, b) => a.thuTu - b.thuTu)
    .map(({ item }) => item);
}

function tinhDoDaiVanBan(giaTri) {
  return String(giaTri || "").trim().replace(/\s+/g, " ").length;
}

function tinhDiemGanDoDai(cauHoi, dapAnDung, dapAn) {
  const doDaiDapAn = Math.max(1, tinhDoDaiVanBan(dapAn));
  const doDaiDapAnDung = Math.max(1, tinhDoDaiVanBan(dapAnDung));
  const doDaiCauHoi = Math.max(1, tinhDoDaiVanBan(cauHoi));

  const lechVoiDapAnDung =
    Math.abs(doDaiDapAn - doDaiDapAnDung) / Math.max(doDaiDapAn, doDaiDapAnDung);
  const lechVoiCauHoi =
    Math.abs(doDaiDapAn - doDaiCauHoi) / Math.max(doDaiDapAn, doDaiCauHoi);

  return lechVoiDapAnDung * 0.75 + lechVoiCauHoi * 0.25;
}

function layDapAnNhieuTuongDong(danhSachThe, theHienTai, laEnVi, seed) {
  const cauHoi = laEnVi ? theHienTai.term_en : theHienTai.meaning_vi;
  const dapAnDung = laEnVi ? theHienTai.meaning_vi : theHienTai.term_en;
  const dapAnDaDung = new Set([String(dapAnDung || "").trim().toLowerCase()]);

  return danhSachThe
    .filter((theKhac) => theKhac.id !== theHienTai.id)
    .map((theKhac) => {
      const dapAn = laEnVi ? theKhac.meaning_vi : theKhac.term_en;

      return {
        id: theKhac.id,
        dapAn,
        diem: tinhDiemGanDoDai(cauHoi, dapAnDung, dapAn),
        thuTuPhu: taoSoTuSeed(`${seed}-distractor-${theHienTai.id}-${theKhac.id}`),
      };
    })
    .filter(({ dapAn }) => {
      const khoa = String(dapAn || "").trim().toLowerCase();
      if (!khoa || dapAnDaDung.has(khoa)) return false;
      dapAnDaDung.add(khoa);
      return true;
    })
    .sort((a, b) => a.diem - b.diem || a.thuTuPhu - b.thuTuPhu)
    .slice(0, 3)
    .map(({ dapAn }) => dapAn);
}

function taoDanhSachCauHoi(danhSachThe, cheDo = CHE_DO_MAC_DINH_QUIZ, seed = "quiz") {
  if (!danhSachThe || danhSachThe.length < 4) return [];

  const laEnVi = cheDo === "en-vi";

  return danhSachThe.map((the) => {
    const cauHoi = laEnVi ? the.term_en : the.meaning_vi;
    const dapAnDung = laEnVi ? the.meaning_vi : the.term_en;

    const dapAnNhieu = layDapAnNhieuTuongDong(danhSachThe, the, laEnVi, seed);

    return {
      id: the.id,
      cauHoi,
      dapAnDung,
      danhSachDapAn: tronMangOnDinh(
        [dapAnDung, ...dapAnNhieu],
        `${seed}-answers-${the.id}`,
        (dapAn, index) => `${index}-${dapAn}`
      ),
    };
  });
}

function TrangQuiz() {
  const { deckId } = useParams();
  const { setPageDataLoading } = usePageTransition();
  const { speak: ttsSpeak, isPlaying: ttsDangDoc } = useTTS();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");

  const [cheDo, setCheDo] = useState(CHE_DO_MAC_DINH_QUIZ);
  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(false);
  const [batRandom, setBatRandom] = useState(false);
  const [lanTronQuiz, setLanTronQuiz] = useState(0);
  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(false);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [rewardProgressValue, setRewardProgressValue] = useState(0);
  const [dangChuyenCau, setDangChuyenCau] = useState(false);
  const [dangChoReward, setDangChoReward] = useState(false);
  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const progressEndpointRef = useRef(null);
  const rewardProgressValueRef = useRef(0);
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });
  const rewardLaunchTimerRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);
  const questionTransitionTimerRef = useRef(null);
  const [studySessionId, setStudySessionId] = useState(null);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [loiLuuKetQua, setLoiLuuKetQua] = useState("");
  const daLuuKetQuaRef = useRef(false);

  async function taiDuLieuQuiz() {
    setDangTaiDuLieu(true);
    setLoiTaiDuLieu("");

    try {
      const [deck, cards] = await Promise.all([
        layDeckTheoId(boId),
        layCardsTheoDeck(boId),
      ]);

      setBo(deck);
      setDanhSachGoc(cards);
    } catch (error) {
      setBo(null);
      setDanhSachGoc([]);
      setLoiTaiDuLieu(error.message);
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    setChiHocTuYeuThich(false);
    taiDuLieuQuiz();
  }, [boId]);

  useLayoutEffect(() => {
    const loadingKey = `quiz-${boId}`;
    setPageDataLoading(loadingKey, dangTaiDuLieu);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [boId, dangTaiDuLieu, setPageDataLoading]);

  const danhSachLocQuiz = useMemo(
    () => locTuYeuThich(danhSachGoc, chiHocTuYeuThich),
    [danhSachGoc, chiHocTuYeuThich]
  );
  const danhSachThe = useMemo(() => {
    if (!batRandom) return danhSachLocQuiz;
    return tronMangOnDinh(
      danhSachLocQuiz,
      `quiz-order-${boId}-${lanTronQuiz}`,
      (the) => the.id
    );
  }, [batRandom, boId, lanTronQuiz, danhSachLocQuiz]);

  const danhSachCauHoi = useMemo(
    () => taoDanhSachCauHoi(danhSachThe, cheDo, `quiz-${boId}-${cheDo}-${lanLam}`),
    [boId, danhSachThe, cheDo, lanLam]
  );

  useEffect(() => {
    if (!bo || danhSachCauHoi.length === 0 || daHoanThanh) return;

    let daHuy = false;

    taoStudySession({
      deck_id: boId,
      mode: "quiz",
      direction: cheDo,
      only_favorite: chiHocTuYeuThich,
      random_order: batRandom,
      total: danhSachCauHoi.length,
    })
      .then((session) => {
        if (!daHuy) setStudySessionId(session.id);
      })
      .catch(() => {
        if (!daHuy) setStudySessionId(null);
      });

    return () => {
      daHuy = true;
    };
  }, [
    bo,
    boId,
    cheDo,
    chiHocTuYeuThich,
    batRandom,
    lanLam,
    lanTronQuiz,
    danhSachCauHoi.length,
    daHoanThanh,
  ]);

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
    setDangChoReward(false);
    setRewardProgressPhase("idle");
    setRewardProgressValue(0);
    rewardProgressValueRef.current = 0;
  }

  function xoaTimerChuyenCau() {
    if (questionTransitionTimerRef.current) {
      clearTimeout(questionTransitionTimerRef.current);
      questionTransitionTimerRef.current = null;
    }
  }

  function batDauTienTrinhReward(diemMoi, coReward) {
    xoaTimerProgressReward();
    setRewardProgressValue(Math.min(diemMoi, soCauDungNhanThuong));
    rewardProgressValueRef.current = Math.min(diemMoi, soCauDungNhanThuong);
    setRewardProgressPhase("correctPulse");

    if (!coReward) {
      setDangChoReward(false);
      rewardProgressTimerRef.current = setTimeout(() => {
        setRewardProgressPhase("idle");
      }, 680);
      return;
    }

    setDangChoReward(true);
    rewardLaunchTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("beamLaunch");
      setLanReward((lanHienTai) => lanHienTai + 1);
      setHienReward(true);
    }, 560);
  }

  function xuLyRewardDongXong() {
    xoaTimerProgressReward();
    setDangChoReward(false);
    setRewardProgressPhase("rewardComplete");
    rewardProgressTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("idle");
      setRewardProgressValue(0);
      rewardProgressValueRef.current = 0;
    }, 780);

    if (dapAnDaChon !== null) {
      window.setTimeout(() => {
        chuyenCauMem({ boQuaKhoaReward: true });
      }, 80);
    }
  }

  useEffect(
    () => () => {
      xoaTimerProgressReward();
    },
    []
  );

  function datLaiLuuKetQua() {
    setStudySessionId(null);
    setDanhSachKetQua([]);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
  }

  function lamLai() {
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setCheDo(key);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) {
        setHienReward(false);
        setDangChoReward(false);
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
    setDangChoReward(false);
  }

  function doiChiHocTuYeuThich() {
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setChiHocTuYeuThich((dangBat) => !dangBat);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
  }

  function doiRandom() {
    setBatRandom((prev) => {
      const moi = !prev;
      if (moi) setLanTronQuiz((n) => n + 1);
      return moi;
    });
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
  }

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null || hienReward || dangChoReward || dangChuyenCau) return;

    setDapAnDaChon(dapAn);
    const cauDangTraLoi = danhSachCauHoi[chiSo];
    const traLoiDungMoi = dapAn === cauDangTraLoi.dapAnDung;

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        card_id: cauDangTraLoi.id,
        question_text: cauDangTraLoi.cauHoi,
        correct_answer: cauDangTraLoi.dapAnDung,
        user_answer: dapAn,
        is_correct: traLoiDungMoi,
      },
    ]);

    if (traLoiDungMoi) {
      phatAmThanhDung();
      setSoCauDung((diemHienTai) => {
        const diemMoi = diemHienTai + 1;
        const tienDoMoi =
          ((diemMoi - 1) % soCauDungNhanThuong) + 1;
        const coReward =
          batReward &&
          diemMoi % soCauDungNhanThuong === 0;

        batDauTienTrinhReward(tienDoMoi, coReward);

        return diemMoi;
      });
      incrementCombo();
    } else {
      resetCombo();
    }
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachCauHoi.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((chiSoHienTai) => chiSoHienTai + 1);
    setDapAnDaChon(null);
    setDangChuyenCau(false);
  }

  function chuyenCauMem({ boQuaKhoaReward = false } = {}) {
    if (!boQuaKhoaReward && (hienReward || dangChoReward)) return;

    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = setTimeout(() => {
      sangCauTiepTheo();
      questionTransitionTimerRef.current = null;
    }, 220);
  }

  useEffect(() => {
    if (dapAnDaChon === null || daHoanThanh || hienReward || dangChoReward) {
      return undefined;
    }

    const cauDangTraLoi = danhSachCauHoi[chiSo];
    const traLoiDungTrongEffect = dapAnDaChon === cauDangTraLoi?.dapAnDung;
    const thoiGianGiuPhanHoi = traLoiDungTrongEffect ? 760 : 3000;
    const timer = setTimeout(() => {
      chuyenCauMem();
    }, thoiGianGiuPhanHoi);

    return () => clearTimeout(timer);
  }, [chiSo, danhSachCauHoi, dapAnDaChon, daHoanThanh, hienReward, dangChoReward]);

  useEffect(
    () => () => {
      xoaTimerChuyenCau();
    },
    []
  );

  useEffect(() => {
    if (!bo || !daHoanThanh || danhSachCauHoi.length === 0) return;
    if (daLuuKetQuaRef.current) return;

    luuTienDoQuiz(boId, {
      correct: soCauDung,
      review: danhSachCauHoi.length - soCauDung,
      total: danhSachCauHoi.length,
    });

    daLuuKetQuaRef.current = true;

    async function luuKetQuaLenBackend() {
      const total = danhSachCauHoi.length;
      const review = total - soCauDung;

      try {
        await luuQuizResult({
          deck_id: boId,
          question_type: "multiple_choice",
          direction: cheDo,
          correct: soCauDung,
          review,
          total,
        });

        if (studySessionId) {
          await ketThucStudySession(studySessionId, {
            correct: soCauDung,
            review,
            total,
            xp_earned: soCauDung * 10,
            max_combo: maxCombo,
          });

          if (danhSachKetQua.length > 0) {
            await luuStudyAnswers(studySessionId, danhSachKetQua);
          }
        }
      } catch (error) {
        setLoiLuuKetQua(error.message);
      }
    }

    luuKetQuaLenBackend();
  }, [
    bo,
    boId,
    cheDo,
    daHoanThanh,
    danhSachCauHoi.length,
    danhSachKetQua,
    maxCombo,
    soCauDung,
    studySessionId,
  ]);

  if (dangTaiDuLieu) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">Đang tải dữ liệu...</h2>
        </section>
      </div>
    );
  }

  if (loiTaiDuLieu) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">
            Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
          </h2>
          <div className="ui-study-empty-card__actions">
            <button
              type="button"
              onClick={taiDuLieuQuiz}
              className="ui-button ui-button--primary ui-study-empty-card__button"
            >
              Thử lại
            </button>
          </div>
        </section>
      </div>
    );
  }

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
    const dangLocYeuThich = chiHocTuYeuThich && danhSachGoc.length >= 4;

    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <p className="ui-study-empty-card__eyebrow">
            Quiz trắc nghiệm
          </p>
          <h2 className="ui-study-empty-card__title">
            {dangLocYeuThich
              ? "Cần ít nhất 4 từ yêu thích"
              : "Cần ít nhất 4 từ để làm quiz"}
          </h2>
          <p className="ui-study-empty-card__copy">
            {dangLocYeuThich
              ? "Tắt lọc yêu thích hoặc thả tim thêm vài từ để bắt đầu."
              : "Mỗi câu cần 1 đáp án đúng và 3 đáp án nhiễu."}
          </p>
          <div className="ui-study-empty-card__actions">
            {dangLocYeuThich && (
              <button
                type="button"
                onClick={doiChiHocTuYeuThich}
                className="ui-button ui-button--ghost ui-study-empty-card__button"
              >
                Tắt lọc yêu thích
              </button>
            )}
            <Link
              to={`/decks/${boId}`}
              className="ui-button ui-button--primary ui-study-empty-card__button"
            >
              Quay lại bộ từ
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (daHoanThanh) {
    return (
      <>
        <RewardTikTokEffect
          active={batReward && hienReward}
          lanKichHoat={lanReward}
          config={CAU_HINH_REWARD_QUIZ}
          progressEndpointRef={progressEndpointRef}
          onRequestClose={() => setHienReward(false)}
          onHideComplete={xuLyRewardDongXong}
          combo={combo}
        />
        <div className="ui-content-enter ui-study-session relative z-10 mx-auto max-w-2xl">
          <Link
            to={`/decks/${boId}`}
            className="ui-back-link ui-back-link--quiet"
          >
            &larr; {bo.title}
          </Link>
          <section className="ui-content-enter mt-6 rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-8 text-center shadow-[var(--bong-card)] sm:px-8 sm:py-9">
            <p className="mb-3 text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
              Tổng kết quiz
            </p>
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)] sm:text-[2rem]">
              Hoàn thành bài học
            </h2>
            {loiLuuKetQua && (
              <p className="mt-3 text-sm text-[var(--mau-loi)]">
                Không thể lưu kết quả lên backend. Kết quả trên màn hình vẫn được giữ.
              </p>
            )}
            <div className="ui-stat-grid mx-auto mt-8 mb-8 max-w-xl">
              <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat-2)]">
                <p className="ui-stat-label mb-1">Tổng câu</p>
                <p className="ui-stat-value text-[var(--mau-chu)]">
                  {danhSachCauHoi.length}
                </p>
              </div>
              <div className="ui-stat-card border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5">
                <p className="ui-stat-label mb-1">Đúng</p>
                <p className="ui-stat-value text-[var(--mau-thanh-cong)]">
                  {soCauDung}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={lamLai}
                className="ui-button ui-button--primary w-full rounded-xl bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] transition-colors hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] sm:w-auto sm:min-w-[10rem]"
              >
                Làm lại
              </button>
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
        onRequestClose={() => setHienReward(false)}
        onHideComplete={xuLyRewardDongXong}
        combo={combo}
      />
      <div className="ui-study-session ui-quiz-session relative z-10 mx-auto max-w-2xl">
        <div className="ui-study-toolbar mb-6">
          <Link
            to={`/decks/${boId}`}
            className="ui-back-btn"
          >
            <span className="ui-back-btn__arrow">&larr;</span> Trở về
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
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Chỉ học từ yêu thích</span>
                  <span className="ui-settings-popover__hint">Quiz chỉ sinh câu từ các từ đã thả tim</span>
                </div>
                <ToggleSwitch
                  checked={chiHocTuYeuThich}
                  onChange={doiChiHocTuYeuThich}
                  ariaLabel={`Chỉ học từ yêu thích ${chiHocTuYeuThich ? "bật" : "tắt"}`}
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Thứ tự ngẫu nhiên</span>
                  <span className="ui-settings-popover__hint">Xáo trộn thứ tự câu hỏi mỗi lần chơi</span>
                </div>
                <ToggleSwitch
                  checked={batRandom}
                  onChange={doiRandom}
                  ariaLabel={`Ngẫu nhiên ${batRandom ? "bật" : "tắt"}`}
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
        <div className="ui-quiz-progress mb-8">
          <RewardProgressBar
            currentValue={soCauDung}
            totalValue={tongSoCauHoi}
            progressPercent={tienDoReward}
            phase={rewardProgressPhase}
            endpointRef={progressEndpointRef}
            label="Tiến độ"
            combo={combo}
          />
          <div className="mt-2 flex justify-end">
            <ComboDisplay
              combo={combo}
              phase={comboPhase}
              progressPercent={tienDoReward}
            />
          </div>
        </div>

        <section
          key={cauHienTai.id}
          className={`ui-question-flow ui-quiz-question-card relative text-center mb-7 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-9 ${dangChuyenCau ? "ui-question-flow--leaving" : ""}`}
        >
          <button
            type="button"
            className={`tts-speaker-btn tts-speaker-btn--corner${ttsDangDoc ? " tts-speaker-btn--active" : ""}`}
            onClick={() => ttsSpeak(cauHienTai.cauHoi, cheDo === "en-vi" ? "en-US" : "vi-VN")}
            aria-label="Đọc câu hỏi"
            title="Đọc câu hỏi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
          <h2 className="text-3xl font-semibold text-[var(--mau-chu)] sm:text-[2.25rem] leading-snug">
            {cauHienTai.cauHoi}
          </h2>
        </section>

        <div
          key={`answers-${cauHienTai.id}`}
          className={`ui-question-flow ui-quiz-answer-list space-y-3 mb-6 ${dangChuyenCau ? "ui-question-flow--leaving" : ""}`}
        >
          {cauHienTai.danhSachDapAn.map((dapAn, index) => {
            const laDapAnDung = dapAn === cauHienTai.dapAnDung;
            const laDapAnNguoiDungChon = dapAn === dapAnDaChon;
            const daTraLoiSai = daTraLoi && !traLoiDung;

            let lopTrangThai =
              "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

            if (daTraLoiSai && laDapAnDung) {
              lopTrangThai = "ui-answer-correct-reveal text-[var(--mau-chu)]";
            } else if (daTraLoi && laDapAnDung) {
              lopTrangThai = "ui-answer-correct text-[var(--mau-chu)]";
            } else if (daTraLoi && laDapAnNguoiDungChon && !laDapAnDung) {
              lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)]";
            }

            return (
              <button
                key={`${cauHienTai.id}-${index}-${dapAn}`}
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

        {daTraLoi && traLoiDung && (
          <div className="ui-feedback-pop ui-quiz-feedback text-center">
            <p className="text-sm font-medium mb-4 text-[var(--mau-thanh-cong)]">
              Chính xác. Câu tiếp theo nhé...
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default TrangQuiz;
