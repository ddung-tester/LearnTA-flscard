import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import ToggleSwitch from "../components/common/ToggleSwitch";
import SegmentedRewardProgressBar from "../components/common/SegmentedRewardProgressBar";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useCombo from "../hooks/useCombo";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { laTuMoiThem, laTuYeuThich } from "../data/duLieuMau";
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
  const filterParam = searchParams.get("filter") || "tat-ca";
  const sortParam = searchParams.get("sort") || "mac-dinh";

  const [cheDo, setCheDo] = useState(() => docCaiDatHocTap("quiz").cheDo ?? CHE_DO_MAC_DINH_QUIZ);
  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    if (param === "moi-them" || param === "tat-ca") return false;
    return docCaiDatHocTap("quiz").chiHocTuYeuThich;
  });
  const [batRandom, setBatRandom] = useState(
    () => docCaiDatHocTap("quiz").batRandom
  );
  const [lanTronQuiz, setLanTronQuiz] = useState(0);
  const [lanLam, setLanLam] = useState(0);
  const [soCauDungTheoTienTrinh, setSoCauDungTheoTienTrinh] = useState([]);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [dapAnSaiDaChon, setDapAnSaiDaChon] = useState([]);
  const [daTungSaiOnCard, setDaTungSaiOnCard] = useState(false);
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
  // Set lưu card_id nào đã bị trả lời sai ít nhất 1 lần trong session này
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  // Danh sách card gốc chỉ để học lại (null = học tất cả, mảng = học lại từ sai)
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);
  const chiSoTienTrinhDangHoatDong = danhSachCauHoiRuntime[chiSo]?.__segmentIndex
    ?? soCauDungTheoTienTrinh.findIndex(
      (soDungTrongTienTrinh, index) =>
        soDungTrongTienTrinh < (danhSachTienTrinh[index]?.totalValue ?? 0)
    );
  const cacThanhTienTrinh = danhSachTienTrinh.map((tienTrinh, index) => {
    const currentValue = soCauDungTheoTienTrinh[index] ?? 0;
    const totalValue = tienTrinh.totalValue || 1;

    return {
      index,
      currentValue,
      totalValue,
      progressPercent: (currentValue / totalValue) * 100,
    };
  });
  const soTienTrinhHoanThanh = cacThanhTienTrinh.filter(
    (tienTrinh) => tienTrinh.currentValue >= tienTrinh.totalValue
  ).length;
  const progressSegmentsPayload = cacThanhTienTrinh.map((tienTrinh) => ({
    segment_index: tienTrinh.index,
    current: tienTrinh.currentValue,
    total: tienTrinh.totalValue,
    is_completed: tienTrinh.currentValue >= tienTrinh.totalValue,
  }));

  async function taiDuLieuQuiz() {
    await Promise.resolve();
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
    Promise.resolve().then(() => {
      taiDuLieuQuiz();
    });
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
      // Nếu đang học lại từ sai thì dùng thẳng danhSachHocLai, bỏ qua filter yêu thích
      if (danhSachHocLai !== null) return danhSachHocLai;

      let ds = danhSachGoc;
      if (chiHocTuYeuThich) {
        ds = ds.filter(laTuYeuThich);
      } else if (filterParam === "moi-them") {
        ds = ds.filter(laTuMoiThem);
      }

      if (sortParam && sortParam !== "mac-dinh") {
        const copy = [...ds];
        if (sortParam === "ten") {
          copy.sort((a, b) =>
            a.term_en.localeCompare(b.term_en, "en", { sensitivity: "base" })
          );
        } else if (sortParam === "ngay-them") {
          copy.sort((a, b) => {
            const da = new Date(a.created_at || 0).getTime();
            const db = new Date(b.created_at || 0).getTime();
            return da - db;
          });
        } else if (sortParam === "so-cau-sai") {
          copy.sort((a, b) => (b.wrong_count || 0) - (a.wrong_count || 0));
        } else if (sortParam === "chua-hoc") {
          copy.sort((a, b) => {
            const aNew = (a.correct_count || 0) < 5 ? 0 : 1;
            const bNew = (b.correct_count || 0) < 5 ? 0 : 1;
            return aNew - bNew;
          });
        }
        return copy;
      }

      return ds;
    },
    [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, filterParam, sortParam]
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
    // Khi học lại từ sai: dùng toàn bộ danhSachGoc làm pool nhiễu để luôn đủ 3 đáp án sai dù chỉ có 1 từ sai
    () => taoDanhSachCauHoi(
      danhSachThe,
      cheDo,
      `quiz-${boId}-${cheDo}-${lanLam}`,
      danhSachHocLai !== null ? danhSachGoc : null
    ),
    [boId, danhSachThe, danhSachGoc, danhSachHocLai, cheDo, lanLam]
  );

  const tongSoCauMucTieu = danhSachCauHoi.length;
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
    setSoCauDungTheoTienTrinh(danhSachTienTrinh.map(() => 0));
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

  function tangTienTrinhChoCau(cauDangTraLoi) {
    if (!cauDangTraLoi) return;

    setSoCauDung((diemHienTai) => {
      const diemMoi = diemHienTai + 1;
      const tienDoMoi = ((diemMoi - 1) % soCauDungNhanThuong) + 1;
      const coReward = batReward && diemMoi % soCauDungNhanThuong === 0;

      batDauTienTrinhReward(tienDoMoi, coReward);

      return diemMoi;
    });

    setSoCauDungTheoTienTrinh((hienTai) => {
      const danhSachMoi = [...hienTai];
      const chiSoTienTrinh = cauDangTraLoi.__segmentIndex ?? 0;
      danhSachMoi[chiSoTienTrinh] = (danhSachMoi[chiSoTienTrinh] ?? 0) + 1;
      return danhSachMoi;
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
    setSoCauDungTheoTienTrinh(danhSachTienTrinh.map(() => 0));
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

  // Chèn câu hiện tại vào 5 vị trí sau (có đánh dấu __saiBuoc) sau khi trả lời sai rồi mới chọn đúng.
  // Đảm bảo câu retry KHÔNG vượt qua ranh giới sang segment khác —
  // nếu vị trí chiSo+5 đã thuộc segment khác thì chèn vào cuối segment hiện tại.
  function chenTheHoiLai() {
    setDanhSachCauHoiRuntime((prev) => {
      if (!prev[chiSo]) return prev;
      const moi = [...prev];
      const [cau] = moi.splice(chiSo, 1);
      const cauRetry = { ...cau, __saiBuoc: true };
      const segmentHienTai = cau.__segmentIndex ?? 0;

      // Tìm vị trí muốn chèn (chiSo + 5 sau khi đã splice)
      const viTriMong = Math.min(chiSo + 5, moi.length);

      // Tìm ranh giới cuối segment hiện tại: vị trí cuối cùng (exclusive) của
      // câu có cùng __segmentIndex tính từ chiSo trở đi.
      let viTriCuoiSegment = chiSo; // ít nhất chèn ngay sau vị trí hiện tại
      for (let i = chiSo; i < moi.length; i += 1) {
        if ((moi[i]?.__segmentIndex ?? -1) === segmentHienTai) {
          viTriCuoiSegment = i + 1;
        } else {
          break;
        }
      }

      // Chèn vào min(chiSo+5, cuối segment) để không tràn sang segment khác
      const viTriChen = Math.min(viTriMong, viTriCuoiSegment);
      moi.splice(viTriChen, 0, cauRetry);
      return moi;
    });
  }

  function chuyenCauSauNhapLaiDung() {
    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = setTimeout(() => {
      chenTheHoiLai();
      setDapAnDaChon(null);
      setDapAnSaiDaChon([]);
      setDaTungSaiOnCard(false);
      setDangChuyenCau(false);
      questionTransitionTimerRef.current = null;
    }, 760);
  }

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null || dangChuyenCau || hienReward || dangChoReward) return;
    if (dapAnSaiDaChon.includes(dapAn)) return;

    const cauDangTraLoi = danhSachCauHoiRuntime[chiSo];
    const traLoiDungMoi = dapAn === cauDangTraLoi.dapAnDung;

    if (traLoiDungMoi) {
      setDapAnDaChon(dapAn);
      phatAmThanhDung();

      if (daTungSaiOnCard || dapAnSaiDaChon.length > 0) {
        // Chọn đúng sau khi đã bấm sai trên thẻ này: chèn lại 5 câu sau, CHƯA ghi nhận tiến trình
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
              counts_toward_progress: false,
            },
          },
        ]);
        chuyenCauSauNhapLaiDung();
      } else {
        // Chọn đúng ngay lần đầu (hoặc đúng thẻ retry 5 câu sau)
        tangTienTrinhChoCau(cauDangTraLoi);
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
      }
    } else {
      // Chọn sai: tô đỏ đáp án sai, giữ nguyên giao diện cho chọn tiếp
      setDapAnSaiDaChon((prev) => [...prev, dapAn]);
      setDaTungSaiOnCard(true);
      resetCombo();
      // Ghi nhận card này đã bị sai (dùng cho tổng kết)
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
    }
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachCauHoiRuntime.length) {
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

    const timer = setTimeout(() => {
      chuyenCauMem();
    }, 760);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dapAnDaChon, daHoanThanh, hienReward, dangChoReward, dangChuyenCau]);

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

  if (danhSachThe.length < 4) {
    // Trường hợp đặc biệt: đang học lại từ sai
    // Nếu danhSachGoc đủ 4+ thì luôn có đủ pool nhiễu — không nên bị block
    // Chỉ block khi cả hai danhSachThe và danhSachGoc đều < 4
    if (danhSachHocLai !== null && danhSachGoc.length >= 4 && danhSachThe.length === 0) {
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
    }

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
          progressEndpointRef={progressEndpointRef}
          onRequestClose={() => setHienReward(false)}
          onHideComplete={xuLyRewardDongXong}
          combo={combo}
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


  const cauHienTai = danhSachCauHoiRuntime[chiSo];

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
          <div className="mb-1.5 flex items-center gap-2">
            <span className="ui-mode-chip">
              {cheDo === "vi-en" ? "VI → EN" : "EN → VI"}
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
            const laDapAnDungChon = dapAn === dapAnDaChon;
            const laDapAnSaiChon = dapAnSaiDaChon.includes(dapAn);

            let lopTrangThai =
              "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

            if (laDapAnDungChon) {
              lopTrangThai = "ui-answer-correct text-[var(--mau-chu)]";
            } else if (laDapAnSaiChon) {
              lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)] opacity-75 cursor-not-allowed";
            }

            return (
              <button
                key={`${cauHienTai.id}-${index}-${dapAn}`}
                type="button"
                onClick={() => chonDapAn(dapAn)}
                disabled={laDapAnSaiChon || dapAnDaChon !== null}
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

function TrangQuizWrapper() {
  const { deckId } = useParams();
  return <TrangQuiz key={deckId} />;
}

export default TrangQuizWrapper;
