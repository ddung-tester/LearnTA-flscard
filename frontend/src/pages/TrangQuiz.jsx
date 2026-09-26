import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import CaiDatPhienHoc from "../components/common/CaiDatPhienHoc";
import DanhSachDapAn, { PhanHoiSaiTracNghiem } from "../components/common/DanhSachDapAn";
import PhanHoiDung from "../components/common/PhanHoiDung";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import ThanhTienDoPhien from "../components/common/ThanhTienDoPhien";
import TheCauHoiPhien from "../components/common/TheCauHoiPhien";
import TheTrangThaiPhien from "../components/common/TheTrangThaiPhien";
import { getTenseExamples } from "../data/tenseExamples";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import { ChatbotTheDangHoc } from "../contexts/ChatbotContext";
import useBoTuHoc from "../hooks/useBoTuHoc";
import useCombo from "../hooks/useCombo";
import useLuuKetQuaPhien from "../hooks/useLuuKetQuaPhien";
import usePhanThuongPhien from "../hooks/usePhanThuongPhien";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { apDungBoLoc, docBoLocTuUrl, taoQueryBoLoc } from "../utils/locTuVung";
import { luuTienDoQuiz } from "../utils/tienDoHocTap";
import { docCaiDatHocTap, luuCaiDatHocTap } from "../utils/caiDatHocTap";
import {
  CHE_DO_MAC_DINH_QUIZ,
  taoDanhSachCauHoi,
  taoDanhSachCauHoiNguCanh,
} from "../utils/cauHoiTracNghiem";
import {
  cheTuTrongCau,
  chonTheChoPhien,
  ganTienTrinh,
  O_TRONG,
  tachKetQuaPhien,
  taoDanhSachTienTrinh,
  taoHatGiong,
  tinhTienTrinh,
} from "../utils/phienHoc";

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

// Trắc nghiệm và Ngữ cảnh dùng chung trang này, khác nhau ở cách sinh câu hỏi.
const CAU_HINH_LOAI = {
  quiz: {
    khoaCaiDat: "quiz",
    mode: "quiz",
    questionType: "multiple_choice",
    tieuDeCaiDat: "Cài đặt trắc nghiệm",
    eyebrow: "Quiz trắc nghiệm",
  },
  "ngu-canh": {
    khoaCaiDat: "nguCanh",
    mode: "context",
    questionType: "context",
    tieuDeCaiDat: "Cài đặt ngữ cảnh",
    eyebrow: "Ngữ cảnh",
  },
};

function TrangQuiz({ loai }) {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const cauHinh = CAU_HINH_LOAI[loai];
  const laNguCanh = loai === "ngu-canh";
  const {
    bo,
    danhSachGoc,
    dangTai: dangTaiDuLieu,
    loi: loiTaiDuLieu,
    taiLai: taiDuLieuQuiz,
  } = useBoTuHoc(boId, loai);
  const { speak: ttsSpeak, isPlaying: ttsDangDoc } = useTTS();

  const [searchParams] = useSearchParams();
  const boLocUrl = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);

  const [cheDo, setCheDo] = useState(() => docCaiDatHocTap(cauHinh.khoaCaiDat).cheDo ?? CHE_DO_MAC_DINH_QUIZ);
  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    // Có bộ lọc khác từ trang bộ từ → ưu tiên bộ lọc đó
    if (param) return false;
    return docCaiDatHocTap(cauHinh.khoaCaiDat).chiHocTuYeuThich;
  });
  const [batRandom, setBatRandom] = useState(
    () => boLocUrl.ngauNhien ?? docCaiDatHocTap(cauHinh.khoaCaiDat).batRandom
  );
  const [lanTronQuiz, setLanTronQuiz] = useState(taoHatGiong);
  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [batReward, setBatReward] = useState(
    () => docCaiDatHocTap(cauHinh.khoaCaiDat).batReward ?? false
  );
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    () => docCaiDatHocTap(cauHinh.khoaCaiDat).soCauDungNhanThuong ?? CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [dangChuyenCau, setDangChuyenCau] = useState(false);
  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const phanThuong = usePhanThuongPhien({ batReward, soCauDungNhanThuong });
  const progressEndpointRef = useRef(null);
  const progressOriginRef = useRef(null);
  const phatAmThanhDung = useSoundEffect("/sound/bigo.mp3", { volume: 0.9 });
  const questionTransitionTimerRef = useRef(null);
  const postRewardContinueTimerRef = useRef(null);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [danhSachCauHoiRuntime, setDanhSachCauHoiRuntime] = useState([]);
  // Set lưu card_id nào đã bị trả lời sai ít nhất 1 lần trong session này
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  // Danh sách card gốc chỉ để học lại (null = học tất cả, mảng = học lại từ sai)
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);

  const danhSachLocQuiz = useMemo(
    () => {
      if (danhSachHocLai !== null) return danhSachHocLai;
      const ds = apDungBoLoc(danhSachGoc, {
        filter: chiHocTuYeuThich ? "yeu-thich" : boLocUrl.filter === "yeu-thich" ? "tat-ca" : boLocUrl.filter,
        sort: boLocUrl.sort,
        tuKhoa: boLocUrl.tuKhoa,
      });
      // Ngữ cảnh: chỉ lấy từ có câu ví dụ che được, trước khi cắt theo số lượng
      return laNguCanh ? ds.filter((the) => cheTuTrongCau(the.example_sentence, the.term_en)) : ds;
    },
    [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, boLocUrl, laNguCanh]
  );
  const danhSachThe = useMemo(
    () => chonTheChoPhien(danhSachLocQuiz, {
      ngauNhien: batRandom,
      seed: `quiz-order-${boId}-${lanTronQuiz}`,
      // Làm lại câu sai thì giữ đủ các câu sai
      soLuong: danhSachHocLai !== null ? 0 : boLocUrl.soLuong,
    }),
    [batRandom, boId, lanTronQuiz, danhSachLocQuiz, danhSachHocLai, boLocUrl.soLuong]
  );

  const danhSachCauHoi = useMemo(
    () => laNguCanh
      ? taoDanhSachCauHoiNguCanh(danhSachThe, `ngu-canh-${boId}-${lanLam}`, danhSachGoc)
      : taoDanhSachCauHoi(
        danhSachThe,
        cheDo,
        `quiz-${boId}-${cheDo}-${lanLam}`,
        // Đáp án nhiễu lấy từ cả bộ → học được cả khi bộ lọc chỉ còn 1–3 từ
        danhSachGoc
      ),
    [boId, danhSachThe, danhSachGoc, cheDo, lanLam, laNguCanh]
  );

  const tongSoCauMucTieu = danhSachCauHoi.length;
  const tienTrinh = useMemo(
    () => tinhTienTrinh(taoDanhSachTienTrinh(tongSoCauMucTieu), soCauDung),
    [tongSoCauMucTieu, soCauDung]
  );

  const [prevDanhSachCauHoi, setPrevDanhSachCauHoi] = useState(danhSachCauHoi);
  if (danhSachCauHoi !== prevDanhSachCauHoi) {
    setPrevDanhSachCauHoi(danhSachCauHoi);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDanhSachCauHoiRuntime(ganTienTrinh(danhSachCauHoi));
    setDaHoanThanh(false);
    resetAll();
    setDanhSachKetQua([]);
    setTapCardSai(new Set());
  }

  const { loiLuuKetQua, streakCelebration, dongStreakCelebration } = useLuuKetQuaPhien({
    bo,
    boId,
    mode: cauHinh.mode,
    questionType: cauHinh.questionType,
    // Ngữ cảnh hỏi bằng câu tiếng Anh
    direction: laNguCanh ? "en-vi" : cheDo,
    onlyFavorite: chiHocTuYeuThich,
    randomOrder: batRandom,
    tongSoCau: tongSoCauMucTieu,
    lanLam: `${lanLam}.${lanTronQuiz}`,
    daHoanThanh,
    ketQua: {
      soCauDung,
      maxCombo,
      soTienTrinhHoanThanh: tienTrinh.soHoanThanh,
      progressSegments: tienTrinh.payload,
      answers: danhSachKetQua,
    },
    onHoanThanh: (ketQua) => {
      // Tiến độ quiz gần nhất theo bộ từ chỉ dành cho Trắc nghiệm
      if (laNguCanh) return;
      luuTienDoQuiz(boId, {
        correct: ketQua.soCauDung,
        review: tongSoCauMucTieu - ketQua.soCauDung,
        total: tongSoCauMucTieu,
      });
    },
  });

  function xoaTimerSauReward() {
    if (postRewardContinueTimerRef.current) {
      clearTimeout(postRewardContinueTimerRef.current);
      postRewardContinueTimerRef.current = null;
    }
  }

  function xoaTimerChuyenCau() {
    if (questionTransitionTimerRef.current) {
      clearTimeout(questionTransitionTimerRef.current);
      questionTransitionTimerRef.current = null;
    }
  }

  function datLaiPhanThuong() {
    xoaTimerSauReward();
    phanThuong.datLai();
  }

  useEffect(() => {
    xoaTimerChuyenCau();
    Promise.resolve().then(() => {
      datLaiPhanThuong();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSachCauHoi]);

  function xuLyRewardDongXong() {
    phanThuong.ketThucReward();

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
      xoaTimerChuyenCau();
      xoaTimerSauReward();
    },
    []
  );

  // Đưa phiên về câu đầu; tăng lanLam để sinh lại câu hỏi và mở study session mới.
  function batDauLai() {
    xoaTimerChuyenCau();
    datLaiPhanThuong();
    setDangChuyenCau(false);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDanhSachCauHoiRuntime([]);
    setDaHoanThanh(false);
    resetAll();
    setDanhSachKetQua([]);
    setTapCardSai(new Set());
  }

  function lamLai() {
    setDanhSachHocLai(null);
    batDauLai();
  }

  function hocLaiTuSai(danhSachCardSai) {
    // Cho phép dù chỉ 1 từ sai — đáp án nhiễu lấy từ cả bộ
    if (danhSachCardSai.length === 0) return;
    setDanhSachHocLai(danhSachCardSai);
    batDauLai();
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    setCheDo(key);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo: key, chiHocTuYeuThich, batRandom, soCauDungNhanThuong });
    batDauLai();
  }

  function doiCheDoReward() {
    const moi = !batReward;
    if (!moi) datLaiPhanThuong();
    setBatReward(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong, batReward: moi });
  }

  function capNhatMocReward(event) {
    const giaTriMoi = Math.max(1, Number(event.target.value) || 1);
    datLaiPhanThuong();
    setSoCauDungNhanThuong(giaTriMoi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong: giaTriMoi });
  }

  function doiChiHocTuYeuThich() {
    const moi = !chiHocTuYeuThich;
    setChiHocTuYeuThich(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich: moi, batRandom, soCauDungNhanThuong });
    batDauLai();
  }

  function doiRandom() {
    const moi = !batRandom;
    setBatRandom(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom: moi, soCauDungNhanThuong });
    if (moi) setLanTronQuiz((n) => n + 1);
    batDauLai();
  }

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null || dangChuyenCau || phanThuong.dangBan) return;

    const cauDangTraLoi = danhSachCauHoiRuntime[chiSo];
    if (!cauDangTraLoi) return;
    const traLoiDungMoi = dapAn === cauDangTraLoi.dapAnDung;

    setDapAnDaChon(dapAn);
    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        card_id: cauDangTraLoi.id,
        question_text: cauDangTraLoi.cauHoi,
        correct_answer: cauDangTraLoi.dapAnDung,
        user_answer: dapAn,
        is_correct: traLoiDungMoi,
        answer_meta: {
          segment_index: cauDangTraLoi.__segmentIndex ?? 0,
          counts_toward_progress: traLoiDungMoi,
        },
      },
    ]);

    if (traLoiDungMoi) {
      const soCauDungMoi = soCauDung + 1;
      phatAmThanhDung();
      setSoCauDung(soCauDungMoi);
      phanThuong.ghiNhanCauDung(soCauDungMoi);
      incrementCombo();
    } else {
      // Chọn sai: không tăng tiến trình, ghi nhận sai và tự động chuyển câu tiếp theo sau phản hồi
      resetCombo();
      setTapCardSai((prev) => new Set(prev).add(cauDangTraLoi.id));
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
    setDangChuyenCau(false);
  }

  function chuyenCauMem({ boQuaKhoaReward = false } = {}) {
    if (!boQuaKhoaReward && phanThuong.dangBan) return;

    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = setTimeout(() => {
      sangCauTiepTheo();
      questionTransitionTimerRef.current = null;
    }, 220);
  }

  useEffect(() => {
    if (dapAnDaChon === null || daHoanThanh || phanThuong.dangBan || dangChuyenCau) {
      return undefined;
    }

    const cauDangTraLoi = danhSachCauHoiRuntime[chiSo];
    const traLoiDung = dapAnDaChon === cauDangTraLoi?.dapAnDung;

    // Khi trả lời đúng: hiển thị câu mẫu + ví dụ các thì để người học đọc kỹ.
    // Người học chủ động nhấn nút "Tiếp tục" hoặc bấm Enter để chuyển câu.
    if (traLoiDung) {
      return undefined;
    }

    const timer = setTimeout(() => {
      chuyenCauMem();
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dapAnDaChon, daHoanThanh, phanThuong.dangBan, dangChuyenCau]);

  // Hỗ trợ phím tắt Enter để chuyển câu khi đã trả lời
  useEffect(() => {
    if (dapAnDaChon === null || dangChuyenCau || phanThuong.dangBan) {
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
  }, [dapAnDaChon, dangChuyenCau, phanThuong.dangBan]);

  if (dangTaiDuLieu) {
    return <TheTrangThaiPhien tieuDe="Đang tải dữ liệu..." />;
  }

  if (loiTaiDuLieu) {
    return (
      <TheTrangThaiPhien tieuDe="Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.">
        <button
          type="button"
          onClick={taiDuLieuQuiz}
          className="ui-button ui-button--primary ui-study-empty-card__button"
        >
          Thử lại
        </button>
      </TheTrangThaiPhien>
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
        <TheTrangThaiPhien
          eyebrow="Học lại từ sai"
          tieuDe="Không có từ sai nào"
          moTa="Bạn đã trả lời chính xác tất cả."
        >
          <button
            type="button"
            onClick={lamLai}
            className="ui-button ui-button--primary ui-study-empty-card__button"
          >
            Làm lại toàn bộ
          </button>
        </TheTrangThaiPhien>
      );
    }

    const dangLocYeuThich = chiHocTuYeuThich && danhSachGoc.length >= 4;
    const khongKhopBoLoc = !chiHocTuYeuThich && danhSachGoc.length >= 4;

    return (
      <TheTrangThaiPhien
        eyebrow={cauHinh.eyebrow}
        tieuDe={
          dangLocYeuThich
            ? "Chưa có từ yêu thích"
            : khongKhopBoLoc
              ? "Không có từ nào khớp bộ lọc"
              : "Cần ít nhất 4 từ để làm quiz"
        }
        moTa={
          dangLocYeuThich
            ? "Tắt lọc yêu thích hoặc thả tim thêm vài từ để bắt đầu."
            : khongKhopBoLoc
              ? "Quay lại bộ từ và chọn bộ lọc khác."
              : "Mỗi câu cần 1 đáp án đúng và 3 đáp án nhiễu."
        }
      >
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
      </TheTrangThaiPhien>
    );
  }

  if (danhSachCauHoi.length === 0) {
    return (
      <TheTrangThaiPhien
        eyebrow={cauHinh.eyebrow}
        tieuDe="Chưa có câu ví dụ phù hợp"
        moTa="Chế độ ngữ cảnh cần câu ví dụ có chứa chính từ đang học. Thêm câu ví dụ cho các từ trong bộ rồi quay lại."
      >
        <Link
          to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`}
          className="ui-button ui-button--primary ui-study-empty-card__button"
        >
          Quay lại bộ từ
        </Link>
      </TheTrangThaiPhien>
    );
  }

  // Khai báo trước nhánh kết quả: nhánh này cũng đọc cauHienTai
  const cauHienTai = danhSachCauHoiRuntime[chiSo];
  const hieuUngThuong = (
    <RewardTikTokEffect
      active={batReward && phanThuong.hienReward}
      lanKichHoat={phanThuong.lanReward}
      config={CAU_HINH_REWARD_QUIZ}
      progressOriginRef={progressOriginRef}
      progressEndpointRef={progressEndpointRef}
      onRequestClose={phanThuong.dongReward}
      onHideComplete={xuLyRewardDongXong}
      combo={combo}
      tenseExamples={getTenseExamples(cauHienTai?.the)}
    />
  );

  if (daHoanThanh) {
    const { danhSachCardDung, danhSachCardSai } = tachKetQuaPhien(
      danhSachCauHoi.map((cauHoi) => cauHoi.the),
      tapCardSai
    );

    return (
      <>
        {/* Streak celebration overlay — Duolingo style */}
        {streakCelebration !== null && (
          <StreakCelebration streak={streakCelebration} onClose={dongStreakCelebration} />
        )}
        {hieuUngThuong}
        <div className="ui-content-enter ui-study-session relative z-10 mx-auto max-w-2xl">
          <StudyResult
            deckTitle={bo.title}
            deckId={boId}
            tongSoCau={tongSoCauMucTieu}
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
            mode={loai}
          />
        </div>
      </>
    );
  }

  if (!cauHienTai) {
    return <TheTrangThaiPhien tieuDe="Đang cập nhật..." />;
  }

  const daTraLoi = dapAnDaChon !== null;
  const traLoiDung = dapAnDaChon === cauHienTai?.dapAnDung;

  return (
    <>
      <ChatbotTheDangHoc the={cauHienTai?.the} />
      {hieuUngThuong}
      <div className="ui-study-session ui-quiz-session relative z-10 mx-auto max-w-2xl">
        <div className="ui-study-toolbar mb-6">
          <Link
            to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`}
            className="ui-back-btn"
          >
            <span className="ui-back-btn__arrow">&larr;</span> Trở về
          </Link>
          <CaiDatPhienHoc
            label={cauHinh.tieuDeCaiDat}
            idMocReward={`moc-reward-${loai}`}
            dsCheDo={laNguCanh ? undefined : DS_CHE_DO_QUIZ}
            cheDo={cheDo}
            onDoiCheDo={doiCheDoHoc}
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
          className="ui-quiz-progress mb-8"
          nhanCheDo={laNguCanh ? "Ngữ cảnh" : cheDo === "vi-en" ? "VI → EN" : "EN → VI"}
          soCauDung={soCauDung}
          tongSoCau={tongSoCauMucTieu}
          tienTrinh={tienTrinh}
          phase={phanThuong.phase}
          originRef={progressOriginRef}
          endpointRef={progressEndpointRef}
          combo={combo}
          comboPhase={comboPhase}
        />

        <TheCauHoiPhien
          key={cauHienTai.id}
          className="ui-quiz-question-card mb-7 sm:py-9"
          cauHoi={cauHienTai.cauHoi}
          laCauHoiLai={cauHienTai.__saiBuoc}
          dangRoiDi={dangChuyenCau}
          dangDoc={ttsDangDoc}
          cauHoiNho={laNguCanh}
          onDoc={() =>
            laNguCanh
              ? ttsSpeak(cauHienTai.cauHoi.replaceAll(O_TRONG, "..."), "en-US")
              : ttsSpeak(cauHienTai.cauHoi, cheDo === "en-vi" ? "en-US" : "vi-VN")
          }
        />

        <DanhSachDapAn
          key={`answers-${cauHienTai.id}`}
          khoa={cauHienTai.id}
          danhSachDapAn={cauHienTai.danhSachDapAn}
          dapAnDung={cauHienTai.dapAnDung}
          dapAnDaChon={dapAnDaChon}
          onChon={chonDapAn}
          dangRoiDi={dangChuyenCau}
        />

        {daTraLoi && traLoiDung && (
          <PhanHoiDung
            className="mt-5 mb-8"
            the={cauHienTai.the}
            termEn={cauHienTai.the?.term_en || (cheDo === "en-vi" ? cauHienTai.cauHoi : cauHienTai.dapAnDung)}
            meaningVi={cauHienTai.the?.meaning_vi || (cheDo === "vi-en" ? cauHienTai.cauHoi : cauHienTai.dapAnDung)}
            onTiepTuc={() => chuyenCauMem()}
          />
        )}

        {daTraLoi && !traLoiDung && (
          <PhanHoiSaiTracNghiem dapAnDung={cauHienTai.dapAnDung} onTiepTuc={() => chuyenCauMem()} />
        )}
      </div>
    </>
  );
}

function TrangQuizWrapper({ loai = "quiz" }) {
  const { deckId } = useParams();
  return <TrangQuiz key={`${loai}-${deckId}`} loai={loai} />;
}

export default TrangQuizWrapper;
