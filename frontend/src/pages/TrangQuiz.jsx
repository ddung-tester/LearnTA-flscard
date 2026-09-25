import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import ToggleSwitch from "../components/common/ToggleSwitch";
import SegmentedRewardProgressBar from "../components/common/SegmentedRewardProgressBar";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import TenseExamplesCard from "../components/common/TenseExamplesCard";
import { getTenseExamples } from "../data/tenseExamples";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { ChatbotTheDangHoc } from "../contexts/ChatbotContext";
import useCombo from "../hooks/useCombo";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";
import { apDungBoLoc, docBoLocTuUrl, taoQueryBoLoc } from "../utils/locTuVung";
import { luuTienDoQuiz } from "../utils/tienDoHocTap";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";
import { getUserStats } from "../services/userApi";
import {
  ketThucStudySession,
  luuQuizResult,
  luuStudyAnswers,
  taoStudySession,
} from "../services/studyApi";
import { docCaiDatHocTap, luuCaiDatHocTap } from "../utils/caiDatHocTap";

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
const SO_TU_MOI_TIEN_TRINH = 10;

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

// danhSachNhieu: pool để lấy đáp án sai (mặc định = danhSachThe,
// nhưng khi học lại từ sai thì dùng toàn bộ bộ từ gốc để luôn có đủ 3 đáp án nhiễu)
function taoDanhSachCauHoi(danhSachThe, cheDo = CHE_DO_MAC_DINH_QUIZ, seed = "quiz", danhSachNhieu = null) {
  if (!danhSachThe || danhSachThe.length === 0) return [];
  const poolNhieu = (danhSachNhieu && danhSachNhieu.length >= 4) ? danhSachNhieu : danhSachThe;
  if (poolNhieu.length < 4) return [];

  const laEnVi = cheDo === "en-vi";

  return danhSachThe.map((the) => {
    const cauHoi = laEnVi ? the.term_en : the.meaning_vi;
    const dapAnDung = laEnVi ? the.meaning_vi : the.term_en;

    const dapAnNhieu = layDapAnNhieuTuongDong(poolNhieu, the, laEnVi, seed);

    return {
      id: the.id,
      cauHoi,
      dapAnDung,
      the,
      danhSachDapAn: tronMangOnDinh(
        [dapAnDung, ...dapAnNhieu],
        `${seed}-answers-${the.id}`,
        (dapAn, index) => `${index}-${dapAn}`
      ),
    };
  });
}

function taoDanhSachTheoTienTrinh(danhSach, kichThuocTienTrinh = SO_TU_MOI_TIEN_TRINH) {
  return danhSach.map((item, index) => ({
    ...item,
    __sessionKey: `${item?.id ?? "item"}-${index}`,
    __segmentIndex: Math.floor(index / kichThuocTienTrinh),
  }));
}

function taoDanhSachTienTrinh(tongSoCau, kichThuocTienTrinh = SO_TU_MOI_TIEN_TRINH) {
  const tongSoTienTrinh = Math.ceil(tongSoCau / kichThuocTienTrinh);

  return Array.from({ length: tongSoTienTrinh }, (_, index) => ({
    index,
    totalValue: Math.min(
      kichThuocTienTrinh,
      Math.max(0, tongSoCau - index * kichThuocTienTrinh)
    ),
  }));
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

  const [searchParams] = useSearchParams();
  const boLocUrl = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);

  const [cheDo, setCheDo] = useState(() => docCaiDatHocTap("quiz").cheDo ?? CHE_DO_MAC_DINH_QUIZ);
  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    // Có bộ lọc khác từ trang bộ từ → ưu tiên bộ lọc đó
    if (param) return false;
    return docCaiDatHocTap("quiz").chiHocTuYeuThich;
  });
  const [batRandom, setBatRandom] = useState(
    () => docCaiDatHocTap("quiz").batRandom
  );
  const [lanTronQuiz, setLanTronQuiz] = useState(0);
  const [lanLam, setLanLam] = useState(0);
  const [, setSoCauDungTheoTienTrinh] = useState([]);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [, setDapAnSaiDaChon] = useState([]);
  const [, setDaTungSaiOnCard] = useState(false);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(
    () => docCaiDatHocTap("quiz").batReward ?? false
  );
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    () => docCaiDatHocTap("quiz").soCauDungNhanThuong ?? CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [, setRewardProgressValue] = useState(0);
  const [dangChuyenCau, setDangChuyenCau] = useState(false);
  const [dangChoReward, setDangChoReward] = useState(false);
  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const progressEndpointRef = useRef(null);
  const progressOriginRef = useRef(null);
  const rewardProgressValueRef = useRef(0);
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });
  const rewardLaunchTimerRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);
  const questionTransitionTimerRef = useRef(null);
  const postRewardContinueTimerRef = useRef(null);
  const [studySessionId, setStudySessionId] = useState(null);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [loiLuuKetQua, setLoiLuuKetQua] = useState("");
  const daLuuKetQuaRef = useRef(false);
  const [streakCelebration, setStreakCelebration] = useState(null); // streak mới nếu tăng
  const prevStreakRef = useRef(null);
  const [danhSachCauHoiRuntime, setDanhSachCauHoiRuntime] = useState([]);
  const dataRequestRef = useRef(0);
  // Set lưu card_id nào đã bị trả lời sai ít nhất 1 lần trong session này
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  // Danh sách card gốc chỉ để học lại (null = học tất cả, mảng = học lại từ sai)
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);

  async function taiDuLieuQuiz() {
    const requestId = ++dataRequestRef.current;
    setDangTaiDuLieu(true);
    setLoiTaiDuLieu("");

    try {
      const [deck, cards] = await Promise.all([
        layDeckTheoId(boId),
        layCardsTheoDeck(boId),
      ]);

      if (requestId === dataRequestRef.current) {
        setBo(deck);
        setDanhSachGoc(cards);
      }
    } catch (error) {
      if (requestId === dataRequestRef.current) {
        const mockDeck = layBoTheoId(boId);
        const mockCards = layTheoBoId(boId);
        if (mockDeck && mockCards && mockCards.length > 0) {
          setBo(mockDeck);
          setDanhSachGoc(mockCards);
        } else {
          setBo(null);
          setDanhSachGoc([]);
          setLoiTaiDuLieu(error.message);
        }
      }
    } finally {
      if (requestId === dataRequestRef.current) {
        setDangTaiDuLieu(false);
      }
    }
  }

  useEffect(() => {
    taiDuLieuQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boId]);

  // Lấy streak hiện tại làm baseline để detect tăng sau khi học xong
  useEffect(() => {
    getUserStats()
      .then((stats) => {
        prevStreakRef.current = stats.current_streak ?? 0;
      })
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const loadingKey = `quiz-${boId}`;
    setPageDataLoading(loadingKey, dangTaiDuLieu);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [boId, dangTaiDuLieu, setPageDataLoading]);

  const danhSachLocQuiz = useMemo(
    () => {
      if (danhSachHocLai !== null) return danhSachHocLai;
      return apDungBoLoc(danhSachGoc, {
        filter: chiHocTuYeuThich ? "yeu-thich" : boLocUrl.filter === "yeu-thich" ? "tat-ca" : boLocUrl.filter,
        sort: boLocUrl.sort,
        tuKhoa: boLocUrl.tuKhoa,
      });
    },
    [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, boLocUrl]
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
    () => taoDanhSachCauHoi(
      danhSachThe,
      cheDo,
      `quiz-${boId}-${cheDo}-${lanLam}`,
      // Đáp án nhiễu lấy từ cả bộ → học được cả khi bộ lọc chỉ còn 1–3 từ
      danhSachGoc
    ),
    [boId, danhSachThe, danhSachGoc, cheDo, lanLam]
  );

  const tongSoCauMucTieu = danhSachCauHoi.length;
  const danhSachTienTrinh = useMemo(() => {
    return taoDanhSachTienTrinh(danhSachCauHoi.length);
  }, [danhSachCauHoi]);

  const [prevDanhSachCauHoi, setPrevDanhSachCauHoi] = useState(danhSachCauHoi);
  if (danhSachCauHoi !== prevDanhSachCauHoi) {
    setPrevDanhSachCauHoi(danhSachCauHoi);
    setChiSo(0);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
    setSoCauDung(0);
    setDanhSachCauHoiRuntime(taoDanhSachTheoTienTrinh(danhSachCauHoi));
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    setStudySessionId(null);
    setDanhSachKetQua([]);
    setLoiLuuKetQua("");
    setTapCardSai(new Set());
  }

  const cacThanhTienTrinh = useMemo(() => {
    let daTichLuy = 0;
    return danhSachTienTrinh.map((tienTrinh) => {
      const totalValue = tienTrinh.totalValue || 1;
      const currentValue = Math.min(
        totalValue,
        Math.max(0, soCauDung - daTichLuy)
      );
      daTichLuy += totalValue;
      return {
        index: tienTrinh.index,
        currentValue,
        totalValue,
        progressPercent: (currentValue / totalValue) * 100,
      };
    });
  }, [danhSachTienTrinh, soCauDung]);

  const chiSoTienTrinhDangHoatDong = (() => {
    const idx = cacThanhTienTrinh.findIndex(
      (tienTrinh) => tienTrinh.currentValue < tienTrinh.totalValue
    );
    return idx === -1 ? Math.max(0, cacThanhTienTrinh.length - 1) : idx;
  })();
  const soTienTrinhHoanThanh = cacThanhTienTrinh.filter(
    (tienTrinh) => tienTrinh.currentValue >= tienTrinh.totalValue
  ).length;
  const progressSegmentsPayload = cacThanhTienTrinh.map((tienTrinh) => ({
    segment_index: tienTrinh.index,
    current: tienTrinh.currentValue,
    total: tienTrinh.totalValue,
    is_completed: tienTrinh.currentValue >= tienTrinh.totalValue,
  }));

  useLayoutEffect(() => {
    daLuuKetQuaRef.current = false;
  }, [danhSachCauHoi]);

  useEffect(() => {
    if (!bo || tongSoCauMucTieu === 0 || daHoanThanh) return;

    let daHuy = false;

    taoStudySession({
      deck_id: boId,
      mode: "quiz",
      direction: cheDo,
      only_favorite: chiHocTuYeuThich,
      random_order: batRandom,
      total: tongSoCauMucTieu,
      segment_size: SO_TU_MOI_TIEN_TRINH,
      segment_total: danhSachTienTrinh.length,
      segment_completed: 0,
      progress_segments: danhSachTienTrinh.map((tienTrinh) => ({
        segment_index: tienTrinh.index,
        current: 0,
        total: tienTrinh.totalValue,
        is_completed: false,
      })),
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
    tongSoCauMucTieu,
    danhSachTienTrinh,
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

  function xoaTimerSauReward() {
    if (postRewardContinueTimerRef.current) {
      clearTimeout(postRewardContinueTimerRef.current);
      postRewardContinueTimerRef.current = null;
    }
  }

  function datLaiProgressReward() {
    xoaTimerProgressReward();
    xoaTimerSauReward();
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

  useEffect(() => {
    xoaTimerChuyenCau();
    Promise.resolve().then(() => {
      datLaiProgressReward();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSachCauHoi]);

  function batDauTienTrinhReward(diemMoi, coReward) {
    xoaTimerProgressReward();
    setRewardProgressValue(Math.min(diemMoi, soCauDungNhanThuong));
    rewardProgressValueRef.current = Math.min(diemMoi, soCauDungNhanThuong);
    setRewardProgressPhase("correctPulse");

    if (!coReward) {
      setDangChoReward(false);
      rewardProgressTimerRef.current = setTimeout(() => {
        setRewardProgressPhase("idle");
        rewardProgressTimerRef.current = null;
      }, 680);
      return;
    }

    setDangChoReward(true);
    rewardLaunchTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("beamLaunch");
      setLanReward((lanHienTai) => lanHienTai + 1);
      setHienReward(true);
      rewardLaunchTimerRef.current = null;
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
      rewardProgressTimerRef.current = null;
    }, 780);

    if (dapAnDaChon !== null) {
      xoaTimerSauReward();
      postRewardContinueTimerRef.current = window.setTimeout(() => {
        chuyenCauMem({ boQuaKhoaReward: true });
        postRewardContinueTimerRef.current = null;
      }, 80);
    }
  }

  useEffect(
    () => () => {
      xoaTimerProgressReward();
      xoaTimerSauReward();
    },
    []
  );

  function datLaiLuuKetQua() {
    setStudySessionId(null);
    setDanhSachKetQua([]);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
  }

  function datLaiTapCardSai() {
    setTapCardSai(new Set());
  }

  function tangTienTrinhChoCau() {
    setSoCauDung((diemHienTai) => {
      const diemMoi = diemHienTai + 1;
      const tienDoMoi = ((diemMoi - 1) % soCauDungNhanThuong) + 1;
      const coReward = batReward && diemMoi % soCauDungNhanThuong === 0;

      batDauTienTrinhReward(tienDoMoi, coReward);

      return diemMoi;
    });
  }

  function lamLai() {
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setDanhSachHocLai(null);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
    setSoCauDung(0);
    setDanhSachCauHoiRuntime(taoDanhSachTheoTienTrinh(danhSachCauHoi));
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
    datLaiTapCardSai();
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setCheDo(key);
    luuCaiDatHocTap("quiz", { cheDo: key, chiHocTuYeuThich, batRandom, soCauDungNhanThuong });
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
    setSoCauDung(0);
    setSoCauDungTheoTienTrinh([]);
    setDanhSachCauHoiRuntime([]);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
    datLaiTapCardSai();
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      const moi = !dangBat;
      if (dangBat) {
        setHienReward(false);
        setDangChoReward(false);
        datLaiProgressReward();
      }
      luuCaiDatHocTap("quiz", { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong, batReward: moi });
      return moi;
    });
  }

  function capNhatMocReward(event) {
    const giaTriMoi = Math.max(1, Number(event.target.value) || 1);
    datLaiProgressReward();
    setSoCauDungNhanThuong(giaTriMoi);
    luuCaiDatHocTap("quiz", { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong: giaTriMoi });
    setHienReward(false);
    setDangChoReward(false);
  }

  function doiChiHocTuYeuThich() {
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setChiHocTuYeuThich((dangBat) => {
      const moi = !dangBat;
      luuCaiDatHocTap("quiz", { cheDo, chiHocTuYeuThich: moi, batRandom, soCauDungNhanThuong });
      return moi;
    });
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
    setSoCauDung(0);
    setSoCauDungTheoTienTrinh([]);
    setDanhSachCauHoiRuntime([]);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
    datLaiTapCardSai();
  }

  function doiRandom() {
    setBatRandom((prev) => {
      const moi = !prev;
      luuCaiDatHocTap("quiz", { cheDo, chiHocTuYeuThich, batRandom: moi, soCauDungNhanThuong });
      if (moi) setLanTronQuiz((n) => n + 1);
      return moi;
    });
    xoaTimerChuyenCau();
    datLaiProgressReward();
    setDangChuyenCau(false);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
    setSoCauDung(0);
    setSoCauDungTheoTienTrinh([]);
    setDanhSachCauHoiRuntime([]);
    setDaHoanThanh(false);
    setHienReward(false);
    setDangChoReward(false);
    setLanReward(0);
    resetAll();
    datLaiLuuKetQua();
    datLaiTapCardSai();
  }

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null || dangChuyenCau || hienReward || dangChoReward) return;

    const cauDangTraLoi = danhSachCauHoiRuntime[chiSo];
    if (!cauDangTraLoi) return;
    const traLoiDungMoi = dapAn === cauDangTraLoi.dapAnDung;

    setDapAnDaChon(dapAn);

    if (traLoiDungMoi) {
      phatAmThanhDung();
      tangTienTrinhChoCau();
      incrementCombo();
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          card_id: cauDangTraLoi.id,
          question_text: cauDangTraLoi.cauHoi,
          correct_answer: cauDangTraLoi.dapAnDung,
          user_answer: dapAn,
          is_correct: true,
          answer_meta: {
            segment_index: cauDangTraLoi.__segmentIndex ?? 0,
            counts_toward_progress: true,
          },
        },
      ]);
    } else {
      // Chọn sai: không tăng tiến trình, ghi nhận sai và tự động chuyển câu tiếp theo sau phản hồi
      resetCombo();
      setTapCardSai((prev) => {
        const next = new Set(prev);
        next.add(cauDangTraLoi.id);
        return next;
      });
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          card_id: cauDangTraLoi.id,
          question_text: cauDangTraLoi.cauHoi,
          correct_answer: cauDangTraLoi.dapAnDung,
          user_answer: dapAn,
          is_correct: false,
          answer_meta: {
            segment_index: cauDangTraLoi.__segmentIndex ?? 0,
            counts_toward_progress: false,
          },
        },
      ]);
      // Chèn câu hỏi lại vào sau 5 câu (hoặc cuối danh sách) để hỏi lại
      setDanhSachCauHoiRuntime((prev) => {
        const moi = [...prev];
        const viTriChen = Math.min(chiSo + 5, moi.length);
        moi.splice(viTriChen, 0, {
          ...cauDangTraLoi,
          __sessionKey: `${cauDangTraLoi.id}-retry-${Date.now()}`,
          __saiBuoc: true,
        });
        return moi;
      });
    }
  }

  function sangCauTiepTheo() {
    if (soCauDung >= tongSoCauMucTieu || chiSo + 1 >= danhSachCauHoiRuntime.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((chiSoHienTai) => chiSoHienTai + 1);
    setDapAnDaChon(null);
    setDapAnSaiDaChon([]);
    setDaTungSaiOnCard(false);
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
    if (dapAnDaChon === null || daHoanThanh || hienReward || dangChoReward || dangChuyenCau) {
      return undefined;
    }

    const cauDangTraLoi = danhSachCauHoiRuntime[chiSo];
    const traLoiDung = dapAnDaChon === cauDangTraLoi?.dapAnDung;

    // Khi trả lời đúng: hiển thị card ví dụ 3 thì kèm cấu trúc ngữ pháp để người học đọc kỹ.
    // Người học chủ động nhấn nút "Tiếp tục" hoặc bấm Enter để chuyển câu.
    if (traLoiDung) {
      return undefined;
    }

    const thoiGianCho = 2000;
    const timer = setTimeout(() => {
      chuyenCauMem();
    }, thoiGianCho);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dapAnDaChon, daHoanThanh, hienReward, dangChoReward, dangChuyenCau]);

  // Hỗ trợ phím tắt Enter để chuyển câu khi đã trả lời
  useEffect(() => {
    if (dapAnDaChon === null || dangChuyenCau || hienReward || dangChoReward) {
      return undefined;
    }

    function handleKeyDown(e) {
      if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        chuyenCauMem();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dapAnDaChon, dangChuyenCau, hienReward, dangChoReward]);

  useEffect(
    () => () => {
      xoaTimerChuyenCau();
    },
    []
  );

  useEffect(() => {
    if (!bo || !daHoanThanh || tongSoCauMucTieu === 0) return;
    if (daLuuKetQuaRef.current) return;

    luuTienDoQuiz(boId, {
      correct: soCauDung,
      review: tongSoCauMucTieu - soCauDung,
      total: tongSoCauMucTieu,
    });

    daLuuKetQuaRef.current = true;

    async function luuKetQuaLenBackend() {
      const total = tongSoCauMucTieu;
      const review = total - soCauDung;

      try {
        await luuQuizResult({
          deck_id: boId,
          question_type: "multiple_choice",
          direction: cheDo,
          correct: soCauDung,
          review,
          total,
          progress_segments: progressSegmentsPayload,
        });

        if (studySessionId) {
          await ketThucStudySession(studySessionId, {
            correct: soCauDung,
            review,
            total,
            xp_earned: soCauDung * 10,
            max_combo: maxCombo,
            segment_size: SO_TU_MOI_TIEN_TRINH,
            segment_total: danhSachTienTrinh.length,
            segment_completed: soTienTrinhHoanThanh,
            progress_segments: progressSegmentsPayload,
          });

          if (danhSachKetQua.length > 0) {
            await luuStudyAnswers(studySessionId, danhSachKetQua);
          }

          // Fetch streak mới sau khi lưu xong
          try {
            const stats = await getUserStats();
            const newStreak = stats.current_streak ?? 0;
            const prevStreak = prevStreakRef.current;
            prevStreakRef.current = newStreak;

            // Dispatch event để BoCuc header cập nhật streak badge
            window.dispatchEvent(new CustomEvent("streak-updated", { detail: { streak: newStreak } }));

            // Nếu streak tăng thì show celebration
            if (prevStreak !== null && newStreak > prevStreak && newStreak > 0) {
              setStreakCelebration(newStreak);
            }
          } catch {
            // silent — không ảnh hưởng UX chính
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
    danhSachTienTrinh.length,
    danhSachKetQua,
    maxCombo,
    progressSegmentsPayload,
    soCauDung,
    soTienTrinhHoanThanh,
    studySessionId,
    tongSoCauMucTieu,
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

  // Đáp án nhiễu lấy từ toàn bộ danhSachGoc → chỉ cần bộ có 4+ từ và danh sách học không rỗng
  if (danhSachThe.length === 0 || danhSachGoc.length < 4) {
    if (danhSachHocLai !== null && danhSachGoc.length >= 4) {
      return (
        <div className="ui-study-empty-wrap">
          <section className="ui-study-empty-card">
            <p className="ui-study-empty-card__eyebrow">Học lại từ sai</p>
            <h2 className="ui-study-empty-card__title">Không có từ sai nào</h2>
            <p className="ui-study-empty-card__copy">Bạn đã trả lời chính xác tất cả.</p>
            <div className="ui-study-empty-card__actions">
              <button
                type="button"
                onClick={lamLai}
                className="ui-button ui-button--primary ui-study-empty-card__button"
              >
                Làm lại toàn bộ
              </button>
            </div>
          </section>
        </div>
      );
    } else {
      const dangLocYeuThich = chiHocTuYeuThich && danhSachGoc.length >= 4;
      const khongKhopBoLoc = !chiHocTuYeuThich && danhSachGoc.length >= 4;

      return (
        <div className="ui-study-empty-wrap">
          <section className="ui-study-empty-card">
            <p className="ui-study-empty-card__eyebrow">
              Quiz trắc nghiệm
            </p>
            <h2 className="ui-study-empty-card__title">
              {dangLocYeuThich
                ? "Chưa có từ yêu thích"
                : khongKhopBoLoc
                  ? "Không có từ nào khớp bộ lọc"
                  : "Cần ít nhất 4 từ để làm quiz"}
            </h2>
            <p className="ui-study-empty-card__copy">
              {dangLocYeuThich
                ? "Tắt lọc yêu thích hoặc thả tim thêm vài từ để bắt đầu."
                : khongKhopBoLoc
                  ? "Quay lại bộ từ và chọn bộ lọc khác."
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
                to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`}
                className="ui-button ui-button--primary ui-study-empty-card__button"
              >
                Quay lại bộ từ
              </Link>
            </div>
          </section>
        </div>
      );
    }
  }


  // Khai báo trước nhánh kết quả: nhánh này cũng đọc cauHienTai
  const cauHienTai = danhSachCauHoiRuntime[chiSo];

  if (daHoanThanh) {
    const soCauSai = tapCardSai.size;
    const soCauDungThucTe = tongSoCauMucTieu - soCauSai;
    // Lấy danh sách card gốc tương ứng những card đã sai
    const danhSachCardSai = danhSachGoc.filter((card) => tapCardSai.has(card.id));
    // Lấy danh sách card đúng (toàn bộ - sai) để cập nhật SRS mastery
    const danhSachCardDung = danhSachGoc.filter((card) => !tapCardSai.has(card.id));

    function hocLaiTuSai() {
      // Cho phép dù chỉ 1 từ sai — sẽ dùng danhSachGoc làm pool nhiễu
      if (danhSachCardSai.length === 0) return;
      xoaTimerChuyenCau();
      datLaiProgressReward();
      setDangChuyenCau(false);
      setDanhSachHocLai(danhSachCardSai);
      setLanLam((giaTri) => giaTri + 1);
      setChiSo(0);
      setDapAnDaChon(null);
      setDapAnSaiDaChon([]);
      setDaTungSaiOnCard(false);
      setSoCauDung(0);
      setDanhSachCauHoiRuntime([]);
      setDaHoanThanh(false);
      setHienReward(false);
      setDangChoReward(false);
      setLanReward(0);
      resetAll();
      datLaiLuuKetQua();
      datLaiTapCardSai();
    }

    return (
      <>
        {/* Streak celebration overlay — Duolingo style */}
        {streakCelebration !== null && (
          <StreakCelebration
            streak={streakCelebration}
            onClose={() => setStreakCelebration(null)}
          />
        )}
        <RewardTikTokEffect
          active={batReward && hienReward}
          lanKichHoat={lanReward}
          config={CAU_HINH_REWARD_QUIZ}
          progressOriginRef={progressOriginRef}
          progressEndpointRef={progressEndpointRef}
          onRequestClose={() => setHienReward(false)}
          onHideComplete={xuLyRewardDongXong}
          combo={combo}
          tenseExamples={getTenseExamples(cauHienTai?.the)}
        />
        <div className="ui-content-enter ui-study-session relative z-10 mx-auto max-w-2xl">
          <StudyResult
            deckTitle={bo.title}
            deckId={boId}
            tongSoCau={tongSoCauMucTieu}
            soCauDung={soCauDungThucTe}
            soCauSai={soCauSai}
            maxCombo={maxCombo}
            loiLuu={loiLuuKetQua}
            onLamLai={lamLai}
            onHocLaiTuSai={soCauSai > 0 ? hocLaiTuSai : undefined}
            danhSachCardSai={danhSachCardSai}
            danhSachCardDung={danhSachCardDung}
            mode="quiz"
          />
        </div>
      </>
    );
  }


  if (!cauHienTai && !daHoanThanh) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">Đang cập nhật...</h2>
        </section>
      </div>
    );
  }

  const daTraLoi = dapAnDaChon !== null;
  const traLoiDung = dapAnDaChon === cauHienTai?.dapAnDung;
  const tongSoCauHoi = tongSoCauMucTieu;
  const chiSoTienTrinhDangRender = Math.max(0, chiSoTienTrinhDangHoatDong);
  const tienDoTienTrinhDangHoatDong =
    cacThanhTienTrinh[chiSoTienTrinhDangRender]?.progressPercent ?? 0;
  const tienDoReward = tienDoTienTrinhDangHoatDong;

  return (
    <>
      <ChatbotTheDangHoc the={cauHienTai?.the} />
      <RewardTikTokEffect
        active={batReward && hienReward}
        lanKichHoat={lanReward}
        config={CAU_HINH_REWARD_QUIZ}
        progressOriginRef={progressOriginRef}
        progressEndpointRef={progressEndpointRef}
        onRequestClose={() => setHienReward(false)}
        onHideComplete={xuLyRewardDongXong}
        combo={combo}
        tenseExamples={getTenseExamples(cauHienTai?.the)}
      />
      <div className="ui-study-session ui-quiz-session relative z-10 mx-auto max-w-2xl">
        <div className="ui-study-toolbar mb-6">
          <Link
            to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`}
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
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="ui-mode-chip">
              {cheDo === "vi-en" ? "VI \u2192 EN" : "EN \u2192 VI"}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[var(--mau-chu-phu)]">
              Câu <span className="text-[var(--mau-chu)]">{Math.min(soCauDung + 1, tongSoCauHoi)}</span>/{tongSoCauHoi}
            </span>
          </div>
          <SegmentedRewardProgressBar
            segments={cacThanhTienTrinh}
            totalCorrect={soCauDung}
            totalTarget={tongSoCauHoi}
            activeSegmentIndex={chiSoTienTrinhDangRender}
            currentValue={soCauDung}
            totalValue={tongSoCauHoi}
            progressPercent={tienDoReward}
            phase={rewardProgressPhase}
            activeEndRef={progressOriginRef}
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
          className={`ui-question-flow ui-quiz-question-card ui-the-cau-hoi relative text-center mb-7 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-9 ${dangChuyenCau ? "ui-question-flow--leaving" : ""}`}
        >
          {cauHienTai?.__saiBuoc && (
            <span
              style={{
                position: "absolute",
                top: "0.6rem",
                left: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#b45309",
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: "0.4rem",
                padding: "0.15rem 0.5rem",
              }}
            >
              ⚠ Lỗi sai trước đây
            </span>
          )}
          <button
            type="button"
            className={`tts-speaker-btn tts-speaker-btn--corner${ttsDangDoc ? " tts-speaker-btn--active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              ttsSpeak(cauHienTai.cauHoi, cheDo === "en-vi" ? "en-US" : "vi-VN");
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
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
            const laDapAnDaChon = dapAn === dapAnDaChon;
            const laDapAnDung = dapAn === cauHienTai.dapAnDung;

            let lopTrangThai =
              "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

            if (daTraLoi) {
              if (laDapAnDung) {
                lopTrangThai = "ui-answer-correct text-[var(--mau-chu)]";
              } else if (laDapAnDaChon) {
                lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)]";
              } else {
                lopTrangThai = "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] opacity-50";
              }
            }

            return (
              <button
                key={`${cauHienTai.id}-${index}-${dapAn}`}
                type="button"
                onClick={() => chonDapAn(dapAn)}
                disabled={daTraLoi}
                className={`ui-reading-card min-h-12 w-full rounded-lg border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors ${lopTrangThai}`}
              >
                <kbd className="ui-answer-phim" aria-hidden="true">
                  {index + 1}
                </kbd>
                <span className="break-words">{dapAn}</span>
                {daTraLoi && (laDapAnDung || laDapAnDaChon) && (
                  <svg
                    className="ui-answer-dau"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    role="img"
                    aria-label={laDapAnDung ? "Đáp án đúng" : "Đáp án bạn chọn, chưa đúng"}
                  >
                    {laDapAnDung ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {daTraLoi && traLoiDung && (
          <div className="mt-5 mb-8">
            <div className="mb-3 text-center">
              <span className="ui-dau-cham ui-dau-cham--dung">
                Chính xác!
              </span>
            </div>
            <TenseExamplesCard
              card={cauHienTai.the}
              termEn={cauHienTai.the?.term_en || (cheDo === "en-vi" ? cauHienTai.cauHoi : cauHienTai.dapAnDung)}
              meaningVi={cauHienTai.the?.meaning_vi || (cheDo === "vi-en" ? cauHienTai.cauHoi : cauHienTai.dapAnDung)}
              onTiepTuc={() => chuyenCauMem()}
              showContinueButton={true}
            />
          </div>
        )}

        {daTraLoi && !traLoiDung && (
          <div className="ui-feedback-pop ui-quiz-feedback text-center mt-4 mb-6">
            <p className="text-sm font-medium text-[var(--mau-loi)] mb-3">
              Chưa đúng. Đáp án đúng là: <span className="font-bold">{cauHienTai.dapAnDung}</span>
            </p>
            <button
              type="button"
              onClick={() => chuyenCauMem()}
              className="ui-button ui-button--primary px-5 py-2 text-xs font-bold rounded-xl shadow-sm"
            >
              Tiếp tục (Enter ↵)
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function TrangQuizWrapper() {
  const { deckId } = useParams();
  return <TrangQuiz key={deckId} />;
}

export default TrangQuizWrapper;
