import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, Link } from "react-router-dom";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import RewardTikTokEffect, { CAU_HINH_REWARD_QUIZ } from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import StreakCelebration from "../components/common/StreakCelebration";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useCombo from "../hooks/useCombo";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { locTuYeuThich } from "../data/duLieuMau";
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

  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(
    () => docCaiDatHocTap("tuluan").chiHocTuYeuThich
  );
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
  const [tongSoCauMucTieu, setTongSoCauMucTieu] = useState(0);
  const [danhSachTienTrinh, setDanhSachTienTrinh] = useState([]);
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
  const [lanCanhBaoNhap, setLanCanhBaoNhap] = useState(0);
  const [shakeKey, setShakeKey] = useState(0); // tăng mỗi lần sai để retrigger animation
  const [daBoQua, setDaBoQua] = useState(false);
  const [dangChoNhanEnterSauSai, setDangChoNhanEnterSauSai] = useState(false); // đang hiện đáp án sai, chờ Enter
  const dangCooldownSaiRef = useRef(false); // đang trong cooldown flash đỏ sau khi sai

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

  const inputRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);
  const questionTransitionTimerRef = useRef(null);
  const wrongAnswerTimerRef = useRef(null);
  const postRewardContinueTimerRef = useRef(null);
  const focusTimerRef = useRef(null);
  const progressEndpointRef = useRef(null);
  const enterUnlockedTimeRef = useRef(0);
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });
  const { speak: ttsSpeak, isPlaying: ttsDangDoc } = useTTS();
  const choHoanThanhRef = useRef(false);   // true khi câu cuối đúng + có reward đang chờ
  const daLuuKetQuaRef = useRef(false);
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

  async function taiDuLieuTuLuan() {
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
    taiDuLieuTuLuan();
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

  useEffect(() => {
    xoaTatCaTimerTuLuan();
    let ds = chiHocTuYeuThich ? locTuYeuThich(danhSachGoc, true) : danhSachGoc;
    const danhSachTheoThuTu = batRandom
      ? tronMangOnDinh(
        ds,
        `written-${boId}-${lanTronTuLuan}`,
        (the, index) => the?.id ?? `${index}-${the?.term_en}-${the?.meaning_vi}`
      )
      : [...ds];
    const tongSoCau = danhSachTheoThuTu.length;
    const cacTienTrinh = taoDanhSachTienTrinh(tongSoCau);

    setTongSoCauMucTieu(tongSoCau);
    setDanhSachTienTrinh(cacTienTrinh);
    setSoCauDungTheoTienTrinh(cacTienTrinh.map(() => 0));
    setDanhSachThe(taoDanhSachTheTheoTienTrinh(danhSachTheoThuTu));
    setChiSo(0);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setDaKiemTra(false);
    setCauTraLoi("");
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDangChuyenCau(false);
    setDaBoQua(false);
    setDangChoReward(false);
    setStudySessionId(null);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
    resetAll();
  }, [boId, lanLam, chiHocTuYeuThich, batRandom, lanTronTuLuan, danhSachGoc]);

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
    danhSachTienTrinh.length,
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
    if (!daKiemTra || daHoanThanh || hienReward || dangChoReward || !ketQuaDung) {
      return undefined;
    }

    const timer = window.setTimeout(() => chuyenCauMem(), lanReward > 0 ? 1000 : 2000);
    return () => clearTimeout(timer);
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward, dangChoReward, lanReward]);

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

  function duaTheHienTaiVeCuoiTienTrinh() {
    setDanhSachThe((danhSachHienTai) => {
      if (!danhSachHienTai[chiSo]) return danhSachHienTai;

      const danhSachMoi = [...danhSachHienTai];
      const [theCanLap] = danhSachMoi.splice(chiSo, 1);
      const chiSoTienTrinh = theCanLap?.__segmentIndex ?? 0;
      let viTriChen = chiSo;

      for (let index = chiSo; index < danhSachMoi.length; index += 1) {
        if ((danhSachMoi[index]?.__segmentIndex ?? -1) === chiSoTienTrinh) {
          viTriChen = index + 1;
        } else {
          break;
        }
      }

      danhSachMoi.splice(viTriChen, 0, theCanLap);
      return danhSachMoi;
    });
  }

  function datLaiTrangThaiCauTraLoi() {
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDaBoQua(false);
    setDangChuyenCau(false);
    setDangChoNhanEnterSauSai(false);
  }

  function chuyenCauTrongTienTrinhSauKhiLapLai({ delay = 220 } = {}) {
    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = window.setTimeout(() => {
      duaTheHienTaiVeCuoiTienTrinh();
      datLaiTrangThaiCauTraLoi();
      focusInputTre();
      questionTransitionTimerRef.current = null;
    }, delay);
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

  function xuLyPhimNhanInput(event) {
    if (dangCooldownSaiRef.current) return;
    // Khi đang chờ Enter sau khi sai: Enter chuyển câu, các phím khác bỏ qua
    if (dangChoNhanEnterSauSai) {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        if (Date.now() < enterUnlockedTimeRef.current) return;
        xoaTimerTraLoiSai();
        chuyenCauTrongTienTrinhSauKhiLapLai();
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

    // Nếu đang ở trạng thái bỏ qua, Enter sẽ chuyển câu
    if (daBoQua) {
      tiepTucSauXemDapAn();
      return;
    }

    // Đang chờ Enter sau khi sai: chuyển sang câu tiếp theo
    if (dangChoNhanEnterSauSai) {
      if (Date.now() < enterUnlockedTimeRef.current) return;
      xoaTimerTraLoiSai();
      chuyenCauTrongTienTrinhSauKhiLapLai();
      return;
    }

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

    if (!cauTraLoi.trim()) {
      setHienCanhBaoNhap(true);
      setLanCanhBaoNhap((lan) => lan + 1);
      inputRef.current?.focus();
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    if (dung) {
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
            mode: hienGoiY ? "hint" : "normal",
            segment_index: theHienTai.__segmentIndex ?? 0,
            counts_toward_progress: true,
          },
        },
      ]);
    } else {
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          id: theHienTai.id,
          cauHoi: layCauHoi(theHienTai),
          dapAnDung,
          cauTraLoi: cauTraLoi.trim(),
          dung: false,
          answerMeta: {
            mode: hienGoiY ? "hint" : "normal",
            segment_index: theHienTai.__segmentIndex ?? 0,
            retry_in_segment: true,
            counts_toward_progress: false,
          },
        },
      ]);
      // Flash đỏ ngắn, sau đó chờ người dùng nhấn Enter để tiếp tục
      setDaKiemTra(true);
      setKetQuaDung(false);
      setHienGoiY(false);
      setHienCanhBaoNhap(false);
      setShakeKey((k) => k + 1);
      resetCombo();
      xoaTimerTraLoiSai();
      dangCooldownSaiRef.current = true;
      wrongAnswerTimerRef.current = window.setTimeout(() => {
        // Hết cooldown flash đỏ: chuyển sang chờ Enter
        dangCooldownSaiRef.current = false;
        wrongAnswerTimerRef.current = null;
        enterUnlockedTimeRef.current = Date.now() + 350;
        setDangChoNhanEnterSauSai(true);
        // Focus lại input để người dùng có thể nhấn Enter
        inputRef.current?.focus();
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

    if (!cauTraLoi.trim()) {
      setHienCanhBaoNhap(true);
      setLanCanhBaoNhap((lan) => lan + 1);
      inputRef.current?.focus();
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: cauTraLoi.trim(),
        dung: false,
        answerMeta: {
          mode: "reveal",
          segment_index: theHienTai.__segmentIndex ?? 0,
          retry_in_segment: true,
          revealed_answer_matched: dung,
          counts_toward_progress: false,
        },
      },
    ]);
    chuyenCauTrongTienTrinhSauKhiLapLai({ delay: dung ? 220 : 360 });
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
    return (
      <>
        {streakCelebration !== null && (
          <StreakCelebration
            streak={streakCelebration}
            onClose={() => setStreakCelebration(null)}
          />
        )}
        <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
        <div className="ui-content-enter ui-study-session relative z-10 mx-auto max-w-2xl">
          <Link
            to={`/decks/${boId}`}
            className="ui-back-link ui-back-link--quiet"
          >
            &larr; {bo.title}
          </Link>
          <section className="ui-content-enter mt-6 rounded-2xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-8 text-center shadow-[var(--bong-card)] sm:px-8 sm:py-9">
            <p className="mb-3 text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
              Tổng kết tự luận
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
                  {tongSoCauMucTieu}
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
                className="ui-button ui-button--primary w-full rounded-xl px-5 py-2.5 font-semibold sm:w-auto sm:min-w-[10rem]"
              >
                Làm lại
              </button>
            </div>
          </section>
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
      <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
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
          <button
            type="button"
            className={`tts-speaker-btn tts-speaker-btn--corner${ttsDangDoc ? " tts-speaker-btn--active" : ""}`}
            onClick={docCauHoiHienTai}
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
                Vui lòng nhập đáp án
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
                  chuyenCauTrongTienTrinhSauKhiLapLai();
                }}
                className="ui-button ui-button--danger w-full rounded-xl py-3.5 text-lg font-bold"
              >
                Tiếp tục
              </button>
            </motion.div>
          )}

          {/* Chưa kiểm tra và chưa xem đáp án: có gợi ý, xem đáp án, kiểm tra */}
          {!daKiemTra && !daBoQua && !dangChoNhanEnterSauSai && (
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

export default TrangTuLuan;
