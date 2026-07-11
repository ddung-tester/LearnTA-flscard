import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import RewardTikTokEffect, { CAU_HINH_REWARD_QUIZ } from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useCombo from "../hooks/useCombo";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { laTuMoiThem, laTuYeuThich } from "../data/duLieuMau";
import SegmentedRewardProgressBar from "../components/common/SegmentedRewardProgressBar";
import ToggleSwitch from "../components/common/ToggleSwitch";
import ModeSwitch from "../components/common/ModeSwitch";
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

const DS_CHE_DO = [
  { key: "vi-en", nhan: "Nghĩa → Từ", shortLabel: "Nghĩa → Từ" },
  { key: "en-vi", nhan: "Từ → Nghĩa", shortLabel: "Từ → Nghĩa" },
];
const SO_TU_MOI_TIEN_TRINH = 10;

function chuanHoa(t) { return t.trim().toLowerCase().replace(/\s+/g, " "); }

function taoGoiYDapAn(dapAn) {
  const text = String(dapAn || "").trim();
  if (!text) return "";

  // Tính 30% tổng số ký tự (không đếm khoảng trắng), tối thiểu 1
  const soKyTuKhongTrang = text.replace(/\s/g, "").length;
  const soKyTuGoiY = Math.max(1, Math.ceil(soKyTuKhongTrang * 0.4));
  let soKyTuDaHien = 0;

  let ketQua = "";
  for (const kyTu of text) {
    if (/\s/.test(kyTu)) {
      // Giữ nguyên khoảng trắng
      ketQua += kyTu;
    } else if (soKyTuDaHien < soKyTuGoiY) {
      ketQua += kyTu;
      soKyTuDaHien += 1;
    } else {
      ketQua += "_";
    }
  }

  return ketQua;
}

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

function taoDanhSachTheTheoTienTrinh(danhSach, kichThuocTienTrinh = SO_TU_MOI_TIEN_TRINH) {
  return danhSach.map((the, index) => ({
    ...the,
    __sessionKey: `${the?.id ?? "card"}-${index}`,
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

function TrangTuLuan() {
  const { deckId } = useParams();
  const { setPageDataLoading } = usePageTransition();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");

  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "tat-ca";
  const sortParam = searchParams.get("sort") || "mac-dinh";

  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    if (param === "moi-them" || param === "tat-ca") return false;
    return docCaiDatHocTap("tuluan").chiHocTuYeuThich;
  });
  const [lanLam, setLanLam] = useState(0);
  const [cheDo, setCheDo] = useState(() => docCaiDatHocTap("tuluan").cheDo ?? "vi-en");
  const [batReward, setBatReward] = useState(false);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    () => docCaiDatHocTap("tuluan").soCauDungNhanThuong ?? CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [batRandom, setBatRandom] = useState(
    () => docCaiDatHocTap("tuluan").batRandom
  );
  const [lanTronTuLuan, setLanTronTuLuan] = useState(0);

  const [danhSachThe, setDanhSachThe] = useState([]);
  const [soCauDungTheoTienTrinh, setSoCauDungTheoTienTrinh] = useState([]);
  const [chiSo, setChiSo] = useState(0);
  const [cauTraLoi, setCauTraLoi] = useState("");
  const [daKiemTra, setDaKiemTra] = useState(false);
  const [ketQuaDung, setKetQuaDung] = useState(false);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [hienGoiY, setHienGoiY] = useState(false);
  const [hienCanhBaoNhap, setHienCanhBaoNhap] = useState(false);
  const [noiDungCanhBaoNhap, setNoiDungCanhBaoNhap] = useState("Vui lòng nhập đáp án");
  const [lanCanhBaoNhap, setLanCanhBaoNhap] = useState(0);
  const [shakeKey, setShakeKey] = useState(0); // tăng mỗi lần sai để retrigger animation
  const [daBoQua, setDaBoQua] = useState(false);
  const [dangChoNhanEnterSauSai, setDangChoNhanEnterSauSai] = useState(false); // đang hiện đáp án sai, chờ Enter
  // cheDoNhapLai: trạng thái sau khi sai khi có gợi ý → hiện đáp án để nhìn vào nhập lại
  const [cheDoNhapLai, setCheDoNhapLai] = useState({ active: false, dapAnDung: "" });
  const dangCooldownSaiRef = useRef(false); // đang trong cooldown flash đỏ sau khi sai
  const dangTrongCheDoGoiYRef = useRef(false); // đang sai trong khi hienGoiY=true

  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [dangChuyenCau, setDangChuyenCau] = useState(false);
  const [dangChoReward, setDangChoReward] = useState(false);

  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [, setRewardProgressValue] = useState(0);
  const [studySessionId, setStudySessionId] = useState(null);
  const [loiLuuKetQua, setLoiLuuKetQua] = useState("");
  const [streakCelebration, setStreakCelebration] = useState(null);
  const prevStreakRef = useRef(null);
  // Set lưu card_id đã bị sai ít nhất 1 lần trong session
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  // Danh sách card chỉ để học lại từ sai (null = học tất cả)
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);

  const inputRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);
  const questionTransitionTimerRef = useRef(null);
  const wrongAnswerTimerRef = useRef(null);
  const postRewardContinueTimerRef = useRef(null);
  const focusTimerRef = useRef(null);
  const progressEndpointRef = useRef(null);
  const progressOriginRef = useRef(null);
  const enterUnlockedTimeRef = useRef(0);
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });
  const { speak: ttsSpeak, isPlaying: ttsDangDoc } = useTTS();
  const choHoanThanhRef = useRef(false);   // true khi câu cuối đúng + có reward đang chờ
  const daLuuKetQuaRef = useRef(false);
  const dataRequestRef = useRef(0);
  async function taiDuLieuTuLuan() {
    const requestId = ++dataRequestRef.current;
    await Promise.resolve();
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
        setBo(null);
        setDanhSachGoc([]);
        setLoiTaiDuLieu(error.message);
      }
    } finally {
      if (requestId === dataRequestRef.current) {
        setDangTaiDuLieu(false);
      }
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      taiDuLieuTuLuan();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boId]);

  // Baseline streak khi mount
  useEffect(() => {
    getUserStats()
      .then((stats) => { prevStreakRef.current = stats.current_streak ?? 0; })
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const loadingKey = `tu-luan-${boId}`;
    setPageDataLoading(loadingKey, dangTaiDuLieu);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [boId, dangTaiDuLieu, setPageDataLoading]);

  const danhSachLocTuLuan = useMemo(() => {
    // Nếu đang học lại từ sai, dùng danh sách đó thay vì danhSachGoc
    let ds = danhSachHocLai !== null ? danhSachHocLai : danhSachGoc;

    if (danhSachHocLai === null) {
      if (chiHocTuYeuThich) {
        ds = ds.filter(laTuYeuThich);
      } else if (filterParam === "moi-them") {
        ds = ds.filter(laTuMoiThem);
      }
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
  }, [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, filterParam, sortParam]);

  const danhSachTheGoc = useMemo(() => {
    const ds = batRandom
      ? tronMangOnDinh(
          danhSachLocTuLuan,
          `written-${boId}-${lanTronTuLuan}`,
          (the, index) => the?.id ?? `${index}-${the?.term_en}-${the?.meaning_vi}`
        )
      : [...danhSachLocTuLuan];
    return taoDanhSachTheTheoTienTrinh(ds);
  }, [danhSachLocTuLuan, batRandom, boId, lanTronTuLuan]);

  const tongSoCauMucTieu = danhSachTheGoc.length;
  const danhSachTienTrinh = useMemo(() => {
    return taoDanhSachTienTrinh(danhSachTheGoc.length);
  }, [danhSachTheGoc]);
  const chiSoTienTrinhDangHoatDong = danhSachThe[chiSo]?.__segmentIndex
    ?? soCauDungTheoTienTrinh.findIndex(
      (soCauDungTrongTienTrinh, index) =>
        soCauDungTrongTienTrinh < (danhSachTienTrinh[index]?.totalValue ?? 0)
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

  const [prevDanhSachTheGoc, setPrevDanhSachTheGoc] = useState(danhSachTheGoc);
  if (danhSachTheGoc !== prevDanhSachTheGoc) {
    setPrevDanhSachTheGoc(danhSachTheGoc);
    setDanhSachThe(danhSachTheGoc);
    setChiSo(0);
    setSoCauDung(0);
    setSoCauDungTheoTienTrinh(danhSachTienTrinh.map(() => 0));
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDaBoQua(false);
    setDangChuyenCau(false);
    setDangChoNhanEnterSauSai(false);
    setCheDoNhapLai({ active: false, dapAnDung: "" });
    setDanhSachKetQua([]);
    daLuuKetQuaRef.current = false;
    resetAll();
  }

  useEffect(() => {
    if (!bo || tongSoCauMucTieu === 0 || daHoanThanh) return;

    let daHuy = false;

    taoStudySession({
      deck_id: boId,
      mode: "written",
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
    tongSoCauMucTieu,
    danhSachTienTrinh,
    daHoanThanh,
  ]);


  function xoaTimerProgressReward() {
    if (rewardProgressTimerRef.current) {
      clearTimeout(rewardProgressTimerRef.current);
      rewardProgressTimerRef.current = null;
    }
  }

  function xoaTimerChuyenCau() {
    if (questionTransitionTimerRef.current) {
      clearTimeout(questionTransitionTimerRef.current);
      questionTransitionTimerRef.current = null;
    }
  }

  function xoaTimerTraLoiSai() {
    if (wrongAnswerTimerRef.current) {
      clearTimeout(wrongAnswerTimerRef.current);
      wrongAnswerTimerRef.current = null;
    }

    dangCooldownSaiRef.current = false;
    setDangChoNhanEnterSauSai(false);
  }

  function xoaTimerSauReward() {
    if (postRewardContinueTimerRef.current) {
      clearTimeout(postRewardContinueTimerRef.current);
      postRewardContinueTimerRef.current = null;
    }
  }

  function xoaTimerFocusInput() {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
  }

  function focusInputTre(delay = 50) {
    xoaTimerFocusInput();
    focusTimerRef.current = window.setTimeout(() => {
      inputRef.current?.focus();
      focusTimerRef.current = null;
    }, delay);
  }

  function xoaTatCaTimerTuLuan() {
    xoaTimerProgressReward();
    xoaTimerChuyenCau();
    xoaTimerTraLoiSai();
    xoaTimerSauReward();
    xoaTimerFocusInput();
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      xoaTatCaTimerTuLuan();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSachTheGoc]);

  useLayoutEffect(() => {
    daLuuKetQuaRef.current = false;
  }, [danhSachTheGoc]);

  useEffect(
    () => () => {
      [
        rewardProgressTimerRef,
        questionTransitionTimerRef,
        wrongAnswerTimerRef,
        postRewardContinueTimerRef,
        focusTimerRef,
      ].forEach((timerRef) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      });
      dangCooldownSaiRef.current = false;
    },
    []
  );

  function batDauTienTrinhReward(giaTri, coReward) {
    xoaTimerProgressReward();
    setRewardProgressValue(giaTri);
    setRewardProgressPhase("correctPulse");

    if (coReward) {
      setDangChoReward(true);
    } else {
      setDangChoReward(false);
    }

    rewardProgressTimerRef.current = window.setTimeout(() => {
      if (coReward) {
        setRewardProgressPhase("beamLaunch");
        rewardProgressTimerRef.current = window.setTimeout(() => {
          setHienReward(true);
          setLanReward(prev => prev + 1);
          rewardProgressTimerRef.current = null;
        }, 600);
      } else {
        setRewardProgressPhase("idle");
        rewardProgressTimerRef.current = null;
      }
    }, 450);
  }

  function xuLyRewardDongXong() {
    xoaTimerProgressReward();
    setDangChoReward(false);
    setRewardProgressPhase("rewardComplete");
    rewardProgressTimerRef.current = window.setTimeout(() => {
      setRewardProgressPhase("idle");
      setRewardProgressValue(0);
      rewardProgressTimerRef.current = null;
    }, 780);

    if (ketQuaDung && chiSo + 1 >= danhSachThe.length) {
      choHoanThanhRef.current = false;
      setDaHoanThanh(true);
      return;
    }

    // Nếu đây là câu cuối và đang chờ hiện màn hình hoàn thành
    if (choHoanThanhRef.current) {
      choHoanThanhRef.current = false;
      setDaHoanThanh(true);
      return;
    }

    if (ketQuaDung) {
      xoaTimerSauReward();
      postRewardContinueTimerRef.current = window.setTimeout(() => {
        chuyenCauMem({ boQuaKhoaReward: true });
        postRewardContinueTimerRef.current = null;
      }, 80);
    }
  }

  useEffect(() => {
    if (!daHoanThanh && (!daKiemTra || !ketQuaDung) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chiSo, daHoanThanh, daKiemTra, ketQuaDung]);

  useEffect(() => {
    // Không auto-advance nếu đang trong chuyển câu do nhập lại gợi ý đúng
    if (!daKiemTra || daHoanThanh || hienReward || dangChoReward || !ketQuaDung || dangChuyenCau) {
      return undefined;
    }

    const timer = window.setTimeout(() => chuyenCauMem(), lanReward > 0 ? 1000 : 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward, dangChoReward, lanReward, dangChuyenCau]);

  // Tự động đọc đáp án đúng qua TTS khi trả lời chính xác
  useEffect(() => {
    if (!daKiemTra || !ketQuaDung || !danhSachThe[chiSo]) return;
    const dapAn = cheDo === "vi-en" ? danhSachThe[chiSo].term_en : danhSachThe[chiSo].meaning_vi;
    const ngonNgu = cheDo === "vi-en" ? "en-US" : "vi-VN";
    ttsSpeak(dapAn, ngonNgu);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, chiSo]);

  useEffect(() => {
    if (!bo || !daHoanThanh || tongSoCauMucTieu === 0) return;
    if (daLuuKetQuaRef.current) return;

    daLuuKetQuaRef.current = true;

    async function luuKetQuaLenBackend() {
      const total = tongSoCauMucTieu;
      const review = total - soCauDung;
      const answers = danhSachKetQua.map((ketQua) => ({
        card_id: ketQua.id,
        question_text: ketQua.cauHoi,
        correct_answer: ketQua.dapAnDung,
        user_answer: ketQua.cauTraLoi,
        is_correct: ketQua.dung,
        answer_meta: ketQua.answerMeta ?? null,
      }));

      try {
        await luuQuizResult({
          deck_id: boId,
          question_type: "written",
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

          if (answers.length > 0) {
            await luuStudyAnswers(studySessionId, answers);
          }

          // Fetch streak mới sau khi lưu xong
          try {
            const stats = await getUserStats();
            const newStreak = stats.current_streak ?? 0;
            const prevStreak = prevStreakRef.current;
            prevStreakRef.current = newStreak;
            window.dispatchEvent(new CustomEvent("streak-updated", { detail: { streak: newStreak } }));
            if (prevStreak !== null && newStreak > prevStreak && newStreak > 0) {
              setStreakCelebration(newStreak);
            }
          } catch {
            // silent
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

  function layCauHoi(the) { return the ? (cheDo === "vi-en" ? the.meaning_vi : the.term_en) : ""; }
  function layDapAnDung(the) { return the ? (cheDo === "vi-en" ? the.term_en : the.meaning_vi) : ""; }
  function layNgonNguCauHoi() { return cheDo === "vi-en" ? "vi-VN" : "en-US"; }
  function layNgonNguDapAn() { return cheDo === "vi-en" ? "en-US" : "vi-VN"; }

  function docCauHoiHienTai() {
    ttsSpeak(layCauHoi(danhSachThe[chiSo]), layNgonNguCauHoi());
  }

  function docDapAnDungHienTai() {
    ttsSpeak(layDapAnDung(danhSachThe[chiSo]), layNgonNguDapAn());
  }

  function tangTienTrinhChoThe(theHienTai) {
    if (!theHienTai) return;

    setSoCauDung((hienTai) => {
      const diemMoi = hienTai + 1;
      const tienDoMoi = ((diemMoi - 1) % soCauDungNhanThuong) + 1;
      const coReward = batReward && diemMoi % soCauDungNhanThuong === 0;
      batDauTienTrinhReward(tienDoMoi, coReward);
      return diemMoi;
    });

    setSoCauDungTheoTienTrinh((hienTai) => {
      const danhSachMoi = [...hienTai];
      const chiSoTienTrinh = theHienTai.__segmentIndex ?? 0;
      danhSachMoi[chiSoTienTrinh] = (danhSachMoi[chiSoTienTrinh] ?? 0) + 1;
      return danhSachMoi;
    });
  }


  function hienThongBaoCanhBao(thongBao = "Vui lòng nhập đáp án") {
    setNoiDungCanhBaoNhap(thongBao);
    setHienCanhBaoNhap(true);
    setLanCanhBaoNhap((lan) => lan + 1);
    inputRef.current?.focus();
  }

  function datLaiTrangThaiCauTraLoi() {
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setNoiDungCanhBaoNhap("Vui lòng nhập đáp án");
    setDaBoQua(false);
    setDangChuyenCau(false);
    setDangChoNhanEnterSauSai(false);
    setCheDoNhapLai({ active: false, dapAnDung: "" });
  }

  // Chèn thẻ hiện tại vào 5 vị trí sau (có đánh dấu __saiBuoc) sau khi nhập đúng ở chế độ nhập lại
  function chenTheHoiLai() {
    setDanhSachThe((prev) => {
      if (!prev[chiSo]) return prev;
      const moi = [...prev];
      const [card] = moi.splice(chiSo, 1);
      const cardRetry = { ...card, __saiBuoc: true };
      const viTriChen = Math.min(chiSo + 5, moi.length);
      moi.splice(viTriChen, 0, cardRetry);
      return moi;
    });
  }

  // Chuyển sang câu kế tiếp sau khi nhập đúng ở chế độ nhập lại gợi ý (không ghi nhận tiến trình)
  function chuyenCauSauNhapLaiDung() {
    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = window.setTimeout(() => {
      chenTheHoiLai();
      datLaiTrangThaiCauTraLoi();
      focusInputTre();
      questionTransitionTimerRef.current = null;
    }, 600);
  }


  function xoaTrangThaiTraLoiSai() {
    if (!daKiemTra || ketQuaDung || dangCooldownSaiRef.current) return;
    xoaTimerTraLoiSai();
    setDaKiemTra(false);
    setKetQuaDung(false);
    setDangChoNhanEnterSauSai(false);
  }

  function capNhatCauTraLoi(value) {
    if (dangCooldownSaiRef.current) return;
    if (daKiemTra && !ketQuaDung) {
      xoaTrangThaiTraLoiSai();
    }
    setCauTraLoi(value);
    if (value.trim()) setHienCanhBaoNhap(false);
  }

  function batDauNhapLaiSauSaiThuong() {
    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    setDangChoNhanEnterSauSai(false);
    setDaKiemTra(false);
    setKetQuaDung(false);
    setCauTraLoi("");
    setCheDoNhapLai({ active: true, dapAnDung });
    hienThongBaoCanhBao("Vui lòng nhập đúng đáp án để tiếp tục");
  }

  function xuLyPhimNhanInput(event) {
    if (dangCooldownSaiRef.current) return;
    // Khi đang chờ Enter sau khi sai: Enter bắt đầu nhập lại
    if (dangChoNhanEnterSauSai) {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        if (Date.now() < enterUnlockedTimeRef.current) return;
        xoaTimerTraLoiSai();
        batDauNhapLaiSauSaiThuong();
      }
      return;
    }
    if (!daKiemTra || ketQuaDung) return;
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      xoaTrangThaiTraLoiSai();
      setCauTraLoi("");
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      xoaTrangThaiTraLoiSai();
      setCauTraLoi(event.key);
      if (event.key.trim()) setHienCanhBaoNhap(false);
    }
  }

  function xuLyDanInput(event) {
    if (dangCooldownSaiRef.current) return;
    if (!daKiemTra || ketQuaDung) return;

    event.preventDefault();
    xoaTrangThaiTraLoiSai();
    const duLieuDan = event.clipboardData?.getData("text") ?? "";
    setCauTraLoi(duLieuDan);
    if (duLieuDan.trim()) setHienCanhBaoNhap(false);
  }

  function kiemTraDapAn(event) {
    event.preventDefault();

    if (
      daKiemTra ||
      hienReward ||
      dangChoReward ||
      dangChuyenCau ||
      dangCooldownSaiRef.current ||
      danhSachThe.length === 0
    ) {
      return;
    }

    // Nếu đang ở trạng thái bỏ qua, Enter sẽ chuyển câu
    if (daBoQua) {
      tiepTucSauXemDapAn();
      return;
    }

    // Đang chờ Enter sau khi sai: bắt đầu nhập lại
    if (dangChoNhanEnterSauSai) {
      if (Date.now() < enterUnlockedTimeRef.current) return;
      xoaTimerTraLoiSai();
      batDauNhapLaiSauSaiThuong();
      return;
    }

    // --- CHẾ ĐỘ NHẬP LẠI SAU KHI GỢI Ý / XEM ĐÁP ÁN SAI ---
    if (cheDoNhapLai.active) {
      if (!cauTraLoi.trim()) {
        hienThongBaoCanhBao("Vui lòng nhập đáp án");
        return;
      }

      const theHienTai = danhSachThe[chiSo];
      const dapAnNhapLai = cheDoNhapLai.dapAnDung;
      const dungNhapLai = chuanHoa(cauTraLoi) === chuanHoa(dapAnNhapLai);

      if (dungNhapLai) {
        // Nhập đúng: sang câu kế, CHƯA ghi nhận tiến trình, chèn thẻ retry 5 câu sau
        setDaKiemTra(true);
        setKetQuaDung(true);
        setCheDoNhapLai({ active: false, dapAnDung: "" });
        setHienCanhBaoNhap(false);
        phatAmThanhDung();
        setDanhSachKetQua((hienTai) => [
          ...hienTai,
          {
            id: theHienTai.id,
            cauHoi: layCauHoi(theHienTai),
            dapAnDung: dapAnNhapLai,
            cauTraLoi: cauTraLoi.trim(),
            dung: true,
            answerMeta: {
              mode: "hint-retry-correct",
              segment_index: theHienTai.__segmentIndex ?? 0,
              counts_toward_progress: false, // chưa ghi nhận, chờ hỏi lại
            },
          },
        ]);
        chuyenCauSauNhapLaiDung(); // chèn retry 5 sau và chuyển câu
      } else {
        // Nhập sai lại: flash đỏ, ở lại chế độ nhập lại, báo lỗi
        setShakeKey((k) => k + 1);
        setDaKiemTra(true);
        setKetQuaDung(false);
        xoaTimerTraLoiSai();
        dangCooldownSaiRef.current = true;
        wrongAnswerTimerRef.current = window.setTimeout(() => {
          dangCooldownSaiRef.current = false;
          wrongAnswerTimerRef.current = null;
          setDaKiemTra(false);
          setKetQuaDung(false);
          setCauTraLoi("");
          hienThongBaoCanhBao("Vui lòng nhập đúng đáp án để tiếp tục");
        }, 520);
      }
      return;
    }
    // --- KẾT THÚC CHẾ ĐỘ NHẬP LẠI ---

    if (!cauTraLoi.trim()) {
      hienThongBaoCanhBao("Vui lòng nhập đáp án");
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    if (dung) {
      if (hienGoiY) {
        // Có dùng Gợi ý và nhập đúng: chèn câu hỏi lại vào 5 câu sau, chưa ghi nhận tiến trình
        setDaKiemTra(true);
        setKetQuaDung(true);
        setHienGoiY(false);
        setHienCanhBaoNhap(false);
        phatAmThanhDung();
        setDanhSachKetQua((hienTai) => [
          ...hienTai,
          {
            id: theHienTai.id,
            cauHoi: layCauHoi(theHienTai),
            dapAnDung,
            cauTraLoi: cauTraLoi.trim(),
            dung: true,
            answerMeta: {
              mode: "hint-correct",
              segment_index: theHienTai.__segmentIndex ?? 0,
              counts_toward_progress: false,
            },
          },
        ]);
        chuyenCauSauNhapLaiDung();
      } else {
        // Trả lời đúng bình thường (hoặc đúng thẻ retry 5 câu sau)
        setDaKiemTra(true);
        setKetQuaDung(true);
        setHienGoiY(false);
        setHienCanhBaoNhap(false);
        phatAmThanhDung();
        tangTienTrinhChoThe(theHienTai);
        incrementCombo();
        setDanhSachKetQua((hienTai) => [
          ...hienTai,
          {
            id: theHienTai.id,
            cauHoi: layCauHoi(theHienTai),
            dapAnDung,
            cauTraLoi: cauTraLoi.trim(),
            dung: true,
            answerMeta: {
              mode: theHienTai.__saiBuoc ? "retry-correct" : "normal",
              segment_index: theHienTai.__segmentIndex ?? 0,
              counts_toward_progress: true,
            },
          },
        ]);
      }
    } else {
      const daCoGoiY = hienGoiY;
      const dapAnLuuLai = dapAnDung; // capture trước khi setTimeout
      // Ghi nhận card đã sai (dùng cho tổng kết)
      setTapCardSai((prev) => {
        const next = new Set(prev);
        next.add(theHienTai.id);
        return next;
      });
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          id: theHienTai.id,
          cauHoi: layCauHoi(theHienTai),
          dapAnDung,
          cauTraLoi: cauTraLoi.trim(),
          dung: false,
          answerMeta: {
            mode: daCoGoiY ? "hint" : "normal",
            segment_index: theHienTai.__segmentIndex ?? 0,
            retry_in_segment: true,
            counts_toward_progress: false,
          },
        },
      ]);
      setDaKiemTra(true);
      setKetQuaDung(false);
      setHienGoiY(false);
      setShakeKey((k) => k + 1);
      resetCombo();
      xoaTimerTraLoiSai();
      dangCooldownSaiRef.current = true;
      dangTrongCheDoGoiYRef.current = daCoGoiY;
      wrongAnswerTimerRef.current = window.setTimeout(() => {
        dangCooldownSaiRef.current = false;
        wrongAnswerTimerRef.current = null;
        if (dangTrongCheDoGoiYRef.current) {
          // Gợi ý + sai: vào chế độ nhập lại, hiện đáp án để người dùng nhìn vào nhập
          dangTrongCheDoGoiYRef.current = false;
          setDaKiemTra(false);
          setKetQuaDung(false);
          setCauTraLoi("");
          setCheDoNhapLai({ active: true, dapAnDung: dapAnLuuLai });
          hienThongBaoCanhBao("Vui lòng nhập đúng đáp án để tiếp tục");
        } else {
          // Thường: chờ Enter để chuyển câu
          enterUnlockedTimeRef.current = Date.now() + 350;
          setDangChoNhanEnterSauSai(true);
          inputRef.current?.focus();
        }
      }, 520);
    }
  }

  function xemDapAn() {
    if (dangChuyenCau || hienReward || dangChoReward) return;
    setDaBoQua(true);
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    resetCombo();
    focusInputTre();
  }

  function tiepTucSauXemDapAn() {
    if (dangChuyenCau || hienReward || dangChoReward) return;
    if (dangCooldownSaiRef.current) return; // block trong cooldown flash đỏ

    if (!cauTraLoi.trim()) {
      hienThongBaoCanhBao("Vui lòng nhập đáp án");
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    if (dung) {
      // Nhập đúng: sang câu kế, CHƯA ghi nhận tiến trình, chèn thẻ retry 5 câu sau
      setDaKiemTra(true);
      setKetQuaDung(true);
      setHienCanhBaoNhap(false);
      phatAmThanhDung();
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          id: theHienTai.id,
          cauHoi: layCauHoi(theHienTai),
          dapAnDung,
          cauTraLoi: cauTraLoi.trim(),
          dung: true,
          answerMeta: {
            mode: "reveal-retry-correct",
            segment_index: theHienTai.__segmentIndex ?? 0,
            counts_toward_progress: false,
          },
        },
      ]);
      chuyenCauSauNhapLaiDung(); // chèn retry 5 sau và chuyển câu
    } else {
      // Nhập sai: flash đỏ, ở lại, xóa input sau cooldown để nhập lại, báo lỗi
      setShakeKey((k) => k + 1);
      setDaKiemTra(true);
      setKetQuaDung(false);
      xoaTimerTraLoiSai();
      dangCooldownSaiRef.current = true;
      wrongAnswerTimerRef.current = window.setTimeout(() => {
        dangCooldownSaiRef.current = false;
        wrongAnswerTimerRef.current = null;
        setDaKiemTra(false);
        setKetQuaDung(false);
        setCauTraLoi("");
        hienThongBaoCanhBao("Vui lòng nhập đúng đáp án để tiếp tục");
      }, 520);
    }
  }

  function hienThiGoiY() {
    if (dangChuyenCau || hienReward || dangChoReward || ketQuaDung) return;
    setHienGoiY(true);
    inputRef.current?.focus();
  }

  function sangCauTiepTheo({ boQuaCau = false } = {}) {
    if (ketQuaDung || boQuaCau) {
      if (chiSo + 1 >= danhSachThe.length) {
        // Câu cuối: nếu reward đang hiển thị, defer hoàn thành đến sau khi reward đóng
        if (!boQuaCau && (hienReward || dangChoReward)) {
          choHoanThanhRef.current = true;
          return;
        }
        setDaHoanThanh(true);
        return;
      }
      setChiSo((h) => h + 1);
    }
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDangChuyenCau(false);
    setDaBoQua(false);
  }

  function chuyenCauMem({ boQuaKhoaReward = false, boQuaCau = false } = {}) {
    if (!boQuaKhoaReward && (hienReward || dangChoReward)) return;

    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = window.setTimeout(() => {
      sangCauTiepTheo({ boQuaCau });
      questionTransitionTimerRef.current = null;
    }, 220);
  }

  function lamLai() {
    xoaTatCaTimerTuLuan();
    setDanhSachHocLai(null);
    setLanLam((g) => g + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDaBoQua(false);
    setDangChoNhanEnterSauSai(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setLanReward(0);
    setDangChuyenCau(false);
    setDangChoReward(false);
    resetAll();
    setStudySessionId(null);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
    setTapCardSai(new Set());
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    setCheDo(key);
    luuCaiDatHocTap("tuluan", { cheDo: key, chiHocTuYeuThich, batRandom, soCauDungNhanThuong });
    lamLai();
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) {
        setHienReward(false);
        setDangChoReward(false);
        xoaTimerProgressReward();
        setRewardProgressPhase("idle");
        setRewardProgressValue(0);
      }

      return !dangBat;
    });
  }

  function doiRandom() {
    xoaTatCaTimerTuLuan();
    setBatRandom((prev) => {
      const moi = !prev;
      luuCaiDatHocTap("tuluan", { cheDo, chiHocTuYeuThich, batRandom: moi, soCauDungNhanThuong });
      if (moi) setLanTronTuLuan((lanHienTai) => lanHienTai + 1);
      return moi;
    });
  }

  function capNhatMocReward(e) {
    const v = Math.max(1, Number(e.target.value) || 1);
    xoaTimerProgressReward();
    setSoCauDungNhanThuong(v);
    luuCaiDatHocTap("tuluan", { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong: v });
    setDangChoReward(false);
    setHienReward(false);
    setRewardProgressPhase("idle");
    setRewardProgressValue(0);
  }

  function doiChiHocTuYeuThich() {
    xoaTatCaTimerTuLuan();
    setChiHocTuYeuThich((p) => {
      const moi = !p;
      luuCaiDatHocTap("tuluan", { cheDo, chiHocTuYeuThich: moi, batRandom, soCauDungNhanThuong });
      return moi;
    });
    setLanLam(g => g + 1);
    setChiSo(0);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDaBoQua(false);
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDangChoNhanEnterSauSai(false);
    setDangChoReward(false);
    setHienReward(false);
    resetAll();
  }

  if (dangTaiDuLieu) return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h2 className="ui-study-empty-card__title">Đang tải dữ liệu...</h2>
      </section>
    </div>
  );

  if (loiTaiDuLieu) return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h2 className="ui-study-empty-card__title">
          Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
        </h2>
        <div className="ui-study-empty-card__actions">
          <button
            type="button"
            onClick={taiDuLieuTuLuan}
            className="ui-button ui-button--primary ui-study-empty-card__button"
          >
            Thử lại
          </button>
        </div>
      </section>
    </div>
  );

  if (!bo) return null;

  if (danhSachGoc.length === 0 || danhSachThe.length === 0) {
    const dangThieuTuYeuThich = chiHocTuYeuThich && danhSachGoc.length > 0;

    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">
            {dangThieuTuYeuThich ? "Chưa có từ yêu thích" : "Bộ từ này chưa có từ nào"}
          </h2>
          <p className="ui-study-empty-card__copy">
            {dangThieuTuYeuThich
              ? "Tắt lọc yêu thích hoặc thả tim thêm vài từ trước khi học tự luận."
              : "Thêm một vài cặp từ Anh Việt trước khi bắt đầu."}
          </p>
          <div className="ui-study-empty-card__actions">
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
    const danhSachCardSai = danhSachGoc.filter((card) => tapCardSai.has(card.id));
    // Lấy danh sách card đúng để cập nhật SRS mastery
    const danhSachCardDung = danhSachGoc.filter((card) => !tapCardSai.has(card.id));

    function hocLaiTuSai() {
      if (danhSachCardSai.length === 0) return;
      xoaTatCaTimerTuLuan();
      // Set trước, sau đó tăng lanLam để useEffect pick up đúng danhSachHocLai
      setDanhSachHocLai(danhSachCardSai);
      setLanLam((g) => g + 1);
      setChiSo(0);
      setCauTraLoi("");
      setDaKiemTra(false);
      setHienGoiY(false);
      setHienCanhBaoNhap(false);
      setDaBoQua(false);
      setDangChoNhanEnterSauSai(false);
      setSoCauDung(0);
      setDaHoanThanh(false);
      setDanhSachKetQua([]);
      setLanReward(0);
      setDangChuyenCau(false);
      setDangChoReward(false);
      resetAll();
      setStudySessionId(null);
      setLoiLuuKetQua("");
      daLuuKetQuaRef.current = false;
      setTapCardSai(new Set());
    }

    return (
      <>
        {streakCelebration !== null && (
          <StreakCelebration
            streak={streakCelebration}
            onClose={() => setStreakCelebration(null)}
          />
        )}
        <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressOriginRef={progressOriginRef} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
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
            mode="tuluan"
          />
        </div>
      </>
    );
  }

  const tongSoCauHoi = tongSoCauMucTieu;
  const chiSoTienTrinhDangRender = Math.max(0, chiSoTienTrinhDangHoatDong);
  const tienDoTienTrinhDangHoatDong =
    cacThanhTienTrinh[chiSoTienTrinhDangRender]?.progressPercent
    ?? 0;

  if (!danhSachThe[chiSo] && !daHoanThanh) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">Đang cập nhật...</h2>
        </section>
      </div>
    );
  }

  return (
    <>
      <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressOriginRef={progressOriginRef} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
      <div className="ui-study-session relative z-10 mx-auto max-w-2xl px-4 py-3">
        <div className="ui-study-toolbar mb-4">
          <Link to={`/decks/${boId}`} className="ui-back-btn">
            <span className="ui-back-btn__arrow">&larr;</span> Trở về
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
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Chỉ từ yêu thích</span>
                  <span className="ui-settings-popover__hint">Chỉ hỏi các từ đã thả tim</span>
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
                  <span className="ui-settings-popover__hint">Xáo trộn thứ tự từ khi bắt đầu</span>
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

        <div className="ui-written-progress mb-4">
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
            phase={rewardProgressPhase}
            activeEndRef={progressOriginRef}
            endpointRef={progressEndpointRef}
            combo={combo}
          />
          <div className="mt-1.5 flex justify-end">
            <ComboDisplay
              combo={combo}
              phase={comboPhase}
              progressPercent={tienDoTienTrinhDangHoatDong}
            />
          </div>
        </div>

          {/* Card câu hỏi */}
        <section
          key={danhSachThe[chiSo]?.id}
          className={`ui-question-flow relative mb-6 text-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-10 ${dangChuyenCau ? "ui-question-flow--leaving" : ""}`}
        >
          {danhSachThe[chiSo]?.__saiBuoc && (
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
              docCauHoiHienTai();
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
            {layCauHoi(danhSachThe[chiSo])}
          </h2>
        </section>

        <form onSubmit={kiemTraDapAn} className="space-y-3">
          <div className="relative">
            {hienCanhBaoNhap && (
              <div
                key={lanCanhBaoNhap}
                className="ui-input-tooltip absolute bottom-full left-4 z-20 mb-2 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-3 py-2 text-sm font-semibold text-[var(--mau-chu)] shadow-[var(--bong-nut-phu)]"
                role="alert"
              >
                {noiDungCanhBaoNhap}
              </div>
            )}
            <input
              key={`${shakeKey}-${lanCanhBaoNhap}`}
              ref={inputRef}
              type="text"
              value={cauTraLoi}
              onKeyDown={xuLyPhimNhanInput}
              onChange={(e) => capNhatCauTraLoi(e.target.value)}
              onPaste={xuLyDanInput}
              disabled={daKiemTra && ketQuaDung}
              readOnly={dangChoNhanEnterSauSai}
              placeholder="Nhập đáp án..."
              className={`ui-written-answer-input ${daBoQua || (daKiemTra && !ketQuaDung) ? "ui-written-answer-input--answer-review" : ""} w-full rounded-xl border p-4 text-xl outline-none ${
                daKiemTra
                  ? (ketQuaDung
                    ? "ui-written-answer-input--correct border-[var(--mau-thanh-cong)] bg-[var(--mau-thanh-cong)]/10 transition-all focus:ring-2 focus:ring-[var(--mau-chinh)]"
                    : "ui-written-answer-input--wrong ui-input-flash-red")
                  : hienCanhBaoNhap
                    ? "ui-input-flash-red"
                    : "border-[var(--mau-vien)] bg-[var(--mau-input)] transition-all focus:ring-2 focus:ring-[var(--mau-chinh)]"
              }`}
            />
          </div>

          <AnimatePresence initial={false} mode="wait">
            {daBoQua ? (
              <motion.button
                type="button"
                key="answer"
                layout
                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0 }}
                onClick={docDapAnDungHienTai}
                className="relative w-full overflow-hidden rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat-2)] px-4 py-3 pr-12 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                aria-label={`Đọc đáp án ${layDapAnDung(danhSachThe[chiSo])}`}
                title="Đọc đáp án"
              >
                <span className="pointer-events-none absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--mau-chinh)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </span>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--mau-chinh)]">
                  Đáp án
                </p>
                <span
                  className="whitespace-pre-wrap break-words text-xl font-bold tracking-tight text-[var(--mau-chinh)]"
                  style={{ wordSpacing: "0.35em" }}
                >
                  {layDapAnDung(danhSachThe[chiSo])}
                </span>
              </motion.button>
            ) : dangChoNhanEnterSauSai ? (
              <motion.div
                key="wrong-answer-reveal"
                layout
                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0 }}
                className="overflow-hidden rounded-xl border border-[oklch(75%_0.10_24)] bg-[oklch(98%_0.015_24)] px-5 py-4 text-center shadow-[var(--bong-nut-phu)]"
              >
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-[oklch(45%_0.14_24)]">Đáp án đúng</p>
                <button
                  type="button"
                  onClick={docDapAnDungHienTai}
                  className="inline-flex flex-col items-center gap-1 focus-visible:outline-none"
                  title="Đọc đáp án"
                >
                  <span
                    className="whitespace-pre-wrap break-words text-2xl font-bold tracking-tight text-[oklch(35%_0.16_24)]"
                    style={{ wordSpacing: "0.35em" }}
                  >
                    {layDapAnDung(danhSachThe[chiSo])}
                  </span>
                </button>
                <p className="mt-2.5 text-xs text-[oklch(45%_0.03_24)] font-medium">Nhấn Enter để tiếp tục</p>
              </motion.div>
            ) : cheDoNhapLai.active ? (
              // Chế độ nhập lại sau khi gợi ý sai: hiện đáp án đúng để nhìn vào nhập
              <motion.div
                key="nhap-lai-hint"
                layout
                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0 }}
                className="overflow-hidden rounded-xl border border-[oklch(80%_0.12_55)] bg-[oklch(98%_0.02_55)] px-5 py-4 text-center shadow-[var(--bong-nut-phu)]"
              >
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-[oklch(50%_0.18_55)]">Đáp án đúng — nhập lại</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ttsSpeak(cheDoNhapLai.dapAnDung, layNgonNguDapAn());
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex flex-col items-center gap-1 focus-visible:outline-none"
                  title="Đọc đáp án"
                >
                  <span
                    className="whitespace-pre-wrap break-words text-2xl font-bold tracking-tight text-[oklch(40%_0.18_55)]"
                    style={{ wordSpacing: "0.35em" }}
                  >
                    {cheDoNhapLai.dapAnDung}
                  </span>
                </button>
                <p className="mt-2 text-xs text-[oklch(50%_0.06_55)] font-medium">Nhìn vào đây và nhập đúng để tiếp tục</p>
              </motion.div>
            ) : hienGoiY && !ketQuaDung ? (
              <motion.div
                key="hint"
                layout
                initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0 }}
                className="overflow-hidden rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat-2)] px-4 py-3 text-center"
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--mau-chinh)]">
                  Gợi ý
                </p>
                <span
                  className="whitespace-pre-wrap break-words text-xl font-bold tracking-tight text-[var(--mau-chinh)]"
                  style={{ wordSpacing: "0.35em" }}
                >
                  {taoGoiYDapAn(layDapAnDung(danhSachThe[chiSo]))}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Xem đáp án: nút tiếp tục sẽ validate input */}
          {daBoQua && (
            <motion.div
              layout
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={tiepTucSauXemDapAn}
                className="ui-button ui-button--ghost w-full rounded-xl border border-[var(--mau-vien)] py-3.5 text-lg font-bold text-[var(--mau-chu-phu)]"
              >
                Tiếp tục
              </button>
            </motion.div>
          )}

          {/* Đang chờ Enter sau khi sai: nút Tiếp tục */}
          {dangChoNhanEnterSauSai && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => {
                  if (Date.now() < enterUnlockedTimeRef.current) return;
                  xoaTimerTraLoiSai();
                  batDauNhapLaiSauSaiThuong();
                }}
                className="ui-button ui-button--danger w-full rounded-xl py-3.5 text-lg font-bold"
              >
                Nhập lại đáp án
              </button>
            </motion.div>
          )}

          {/* Chưa kiểm tra và chưa xem đáp án: có gợi ý, xem đáp án, kiểm tra */}
          {!daKiemTra && !daBoQua && !dangChoNhanEnterSauSai && !cheDoNhapLai.active && (
            <motion.div
              layout
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-3 sm:grid-cols-3"
            >
              <button
                type="button"
                onClick={hienThiGoiY}
                disabled={hienGoiY}
                className="ui-button ui-button--ghost rounded-xl border border-[var(--mau-vien)] py-3 font-semibold text-[var(--mau-chu-phu)] disabled:cursor-default disabled:opacity-60"
              >
                Gợi ý
              </button>
              <button
                type="button"
                onClick={xemDapAn}
                className="ui-button ui-button--ghost rounded-xl border border-[var(--mau-vien)] py-3 font-semibold text-[var(--mau-chu-phu)]"
              >
                Xem đáp án
              </button>
              <button
                type="submit"
                className="ui-button ui-button--primary rounded-xl py-3 font-bold"
              >
                Kiểm tra
              </button>
            </motion.div>
          )}

          {/* Chế độ nhập lại: chỉ hiện nút Kiểm tra */}
          {cheDoNhapLai.active && !daKiemTra && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="submit"
                className="ui-button ui-button--primary w-full rounded-xl py-3.5 text-lg font-bold"
              >
                Kiểm tra lại
              </button>
            </motion.div>
          )}

          {/* Trả lời sai: đang trong cooldown flash đỏ, không hiện nút nào thêm */}

          {/* Đúng rồi: hiện thông báo */}
          {daKiemTra && ketQuaDung && (
            <div className="py-2 text-center">
              <span className="text-[var(--mau-thanh-cong)] font-bold text-lg">Chính xác!</span>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

function TrangTuLuanWrapper() {
  const { deckId } = useParams();
  return <TrangTuLuan key={deckId} />;
}

export default TrangTuLuanWrapper;
