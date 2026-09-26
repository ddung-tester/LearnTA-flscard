import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import RewardTikTokEffect, { CAU_HINH_REWARD_QUIZ } from "../components/RewardTikTokEffect";
import CaiDatPhienHoc from "../components/common/CaiDatPhienHoc";
import DanhSachDapAn, { PhanHoiSaiTracNghiem } from "../components/common/DanhSachDapAn";
import PhanHoiDung from "../components/common/PhanHoiDung";
import StreakCelebration from "../components/common/StreakCelebration";
import StudyResult from "../components/common/StudyResult";
import ThanhTienDoPhien from "../components/common/ThanhTienDoPhien";
import TheCauHoiPhien from "../components/common/TheCauHoiPhien";
import TheTrangThaiPhien from "../components/common/TheTrangThaiPhien";
import { getTenseExamples } from "../data/tenseExamples";
import { ChatbotTheDangHoc } from "../contexts/ChatbotContext";
import useBoTuHoc from "../hooks/useBoTuHoc";
import useCombo from "../hooks/useCombo";
import useLuuKetQuaPhien from "../hooks/useLuuKetQuaPhien";
import usePhanThuongPhien from "../hooks/usePhanThuongPhien";
import useTTS from "../hooks/useTTS";
import useSoundEffect from "../hooks/useSoundEffect";
import { apDungBoLoc, docBoLocTuUrl, taoQueryBoLoc, sapXepTu } from "../utils/locTuVung";
import { docCaiDatHocTap, luuCaiDatHocTap } from "../utils/caiDatHocTap";
import { ganLoaiCauHonHop } from "../utils/cauHoiTracNghiem";
import {
  chonTheChoPhien,
  ganTienTrinh,
  khopDapAn,
  tachKetQuaPhien,
  taoDanhSachTienTrinh,
  taoGoiY,
  taoHatGiong,
  tinhTienTrinh,
} from "../utils/phienHoc";

const DS_CHE_DO = [
  { key: "vi-en", nhan: "Nghĩa → Từ", shortLabel: "Nghĩa → Từ" },
  { key: "en-vi", nhan: "Từ → Nghĩa", shortLabel: "Từ → Nghĩa" },
];

// Tự luận, Nghe viết và Hỗn hợp dùng chung trang này (cùng cách gõ, gợi ý, nhập lại).
const CAU_HINH_LOAI = {
  "tu-luan": {
    khoaCaiDat: "tuluan",
    mode: "written",
    questionType: "written",
    tieuDeCaiDat: "Cài đặt tự luận",
    tenHienThi: "tự luận",
    modeKetQua: "tuluan",
  },
  "nghe-viet": {
    khoaCaiDat: "ngheviet",
    mode: "listening",
    questionType: "listening",
    tieuDeCaiDat: "Cài đặt nghe viết",
    tenHienThi: "nghe viết",
    modeKetQua: "nghe-viet",
  },
  "hon-hop": {
    khoaCaiDat: "honHop",
    mode: "mixed",
    questionType: "mixed",
    tieuDeCaiDat: "Cài đặt hỗn hợp",
    tenHienThi: "hỗn hợp",
    modeKetQua: "hon-hop",
  },
};

const NHAN_LOAI_CAU = {
  "go-tu": "Gõ từ",
  "go-nghia": "Gõ nghĩa",
  nghe: "Nghe viết",
  chon: "Trắc nghiệm",
};

const GOI_Y_NHAP = {
  "go-tu": "Gõ từ tiếng Anh...",
  "go-nghia": "Gõ nghĩa tiếng Việt...",
  nghe: "Gõ từ bạn nghe được...",
};


function TrangTuLuan({ loai }) {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const cauHinh = CAU_HINH_LOAI[loai];
  const {
    bo,
    danhSachGoc,
    dangTai: dangTaiDuLieu,
    loi: loiTaiDuLieu,
    taiLai: taiDuLieuTuLuan,
  } = useBoTuHoc(boId, loai);

  const [searchParams] = useSearchParams();
  const boLocUrl = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);

  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(() => {
    const param = searchParams.get("filter");
    if (param === "yeu-thich") return true;
    // Có bộ lọc khác từ trang bộ từ → ưu tiên bộ lọc đó
    if (param) return false;
    return docCaiDatHocTap(cauHinh.khoaCaiDat).chiHocTuYeuThich;
  });
  const [lanLam, setLanLam] = useState(0);
  const [cheDo, setCheDo] = useState(() => docCaiDatHocTap(cauHinh.khoaCaiDat).cheDo ?? "vi-en");
  const [batReward, setBatReward] = useState(() => docCaiDatHocTap(cauHinh.khoaCaiDat).batReward ?? false);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    () => docCaiDatHocTap(cauHinh.khoaCaiDat).soCauDungNhanThuong ?? CAU_HINH_REWARD_QUIZ.triggerCount
  );
  const [batRandom, setBatRandom] = useState(
    () => boLocUrl.ngauNhien ?? docCaiDatHocTap(cauHinh.khoaCaiDat).batRandom
  );
  const [lanTronTuLuan, setLanTronTuLuan] = useState(taoHatGiong);

  const [danhSachThe, setDanhSachThe] = useState([]);
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
  // Đáp án đã chọn ở câu trắc nghiệm (chỉ có trong Hỗn hợp)
  const [luaChon, setLuaChon] = useState(null);
  const dangCooldownSaiRef = useRef(false); // đang trong cooldown flash đỏ sau khi sai
  const dangTrongCheDoGoiYRef = useRef(false); // đang sai trong khi hienGoiY=true

  const [dangChuyenCau, setDangChuyenCau] = useState(false);

  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const phanThuong = usePhanThuongPhien({ batReward, soCauDungNhanThuong });
  const { hienReward, dangChoReward } = phanThuong;
  // Set lưu card_id đã bị sai ít nhất 1 lần trong session
  const [tapCardSai, setTapCardSai] = useState(() => new Set());
  // Danh sách card chỉ để học lại từ sai (null = học tất cả)
  const [danhSachHocLai, setDanhSachHocLai] = useState(null);

  const inputRef = useRef(null);
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
  // true khi đang chờ user nhấn Enter/Tiếp tục sau khi đúng ở chế độ nhập lại (hint/retry/revealAnswer)
  // — thay vì auto-chuyển sau 600ms, ta giữ TenseExamplesCard để user đọc câu mẫu
  const pendingRetryCardRef = useRef(false);
  // Lưu vị trí scroll trước khi check đáp án — không dể browser cuộn xuống TenseExamplesCard
  const scrollBeforeCheckRef = useRef(0);
  // Ngăn gọi chuyenCauMem() 2 lần trong cùng một sự kiện (window keydown + button click)
  const chuyenCauMemLockRef = useRef(false);

  const danhSachLocTuLuan = useMemo(() => {
    // Nếu đang học lại từ sai, dùng danh sách đó thay vì danhSachGoc (vẫn giữ thứ tự sắp xếp)
    if (danhSachHocLai !== null) return sapXepTu(danhSachHocLai, boLocUrl.sort);
    return apDungBoLoc(danhSachGoc, {
      filter: chiHocTuYeuThich ? "yeu-thich" : boLocUrl.filter === "yeu-thich" ? "tat-ca" : boLocUrl.filter,
      sort: boLocUrl.sort,
      tuKhoa: boLocUrl.tuKhoa,
    });
  }, [danhSachGoc, danhSachHocLai, chiHocTuYeuThich, boLocUrl]);

  // Thẻ của phiên (chưa gắn thông tin câu hỏi) — màn kết quả tính đúng/sai trên danh sách này
  const danhSachThePhien = useMemo(
    () => chonTheChoPhien(danhSachLocTuLuan, {
      ngauNhien: batRandom,
      seed: `written-${boId}-${lanTronTuLuan}-${lanLam}`,
      // Làm lại câu sai thì giữ đủ các câu sai
      soLuong: danhSachHocLai !== null ? 0 : boLocUrl.soLuong,
    }),
    [danhSachLocTuLuan, batRandom, boId, lanTronTuLuan, lanLam, danhSachHocLai, boLocUrl.soLuong]
  );

  const danhSachTheGoc = useMemo(
    () => ganTienTrinh(
      loai === "hon-hop"
        ? ganLoaiCauHonHop(danhSachThePhien, `mixed-${boId}-${lanTronTuLuan}-${lanLam}`, danhSachGoc)
        : danhSachThePhien
    ),
    [danhSachThePhien, loai, boId, lanTronTuLuan, lanLam, danhSachGoc]
  );

  const tongSoCauMucTieu = danhSachTheGoc.length;
  // Thanh tiến trình lấp đầy tuyến tính từ soCauDung, không bị hổng/nhảy cóc
  const tienTrinh = useMemo(
    () => tinhTienTrinh(taoDanhSachTienTrinh(tongSoCauMucTieu), soCauDung),
    [tongSoCauMucTieu, soCauDung]
  );

  const [prevDanhSachTheGoc, setPrevDanhSachTheGoc] = useState(danhSachTheGoc);
  if (danhSachTheGoc !== prevDanhSachTheGoc) {
    setPrevDanhSachTheGoc(danhSachTheGoc);
    setDanhSachThe(danhSachTheGoc);
    setChiSo(0);
    setSoCauDung(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDaBoQua(false);
    setDangChuyenCau(false);
    setDangChoNhanEnterSauSai(false);
    setCheDoNhapLai({ active: false, dapAnDung: "" });
    setLuaChon(null);
    setDanhSachKetQua([]);
    pendingRetryCardRef.current = false;
    resetAll();
  }

  const { loiLuuKetQua, streakCelebration, dongStreakCelebration } = useLuuKetQuaPhien({
    bo,
    boId,
    mode: cauHinh.mode,
    questionType: cauHinh.questionType,
    // Nghe viết và Hỗn hợp không có một chiều hỏi cố định
    direction: loai === "tu-luan" ? cheDo : "en-vi",
    onlyFavorite: chiHocTuYeuThich,
    randomOrder: batRandom,
    tongSoCau: tongSoCauMucTieu,
    lanLam: `${lanLam}.${lanTronTuLuan}`,
    daHoanThanh,
    ketQua: {
      soCauDung,
      maxCombo,
      soTienTrinhHoanThanh: tienTrinh.soHoanThanh,
      progressSegments: tienTrinh.payload,
      answers: danhSachKetQua.map((ketQua) => ({
        card_id: ketQua.id,
        question_text: ketQua.cauHoi,
        correct_answer: ketQua.dapAnDung,
        user_answer: ketQua.cauTraLoi,
        is_correct: ketQua.dung,
        answer_meta: ketQua.answerMeta ?? null,
      })),
    },
  });

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
    xoaTimerChuyenCau();
    xoaTimerTraLoiSai();
    xoaTimerSauReward();
    xoaTimerFocusInput();
  }

  function datLaiPhanThuong() {
    xoaTimerSauReward();
    phanThuong.datLai();
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      xoaTatCaTimerTuLuan();
      phanThuong.datLai();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSachTheGoc]);

  // Khôi phục scroll khi TenseExamplesCard hiện ra — tránh browser tự cuộn xuống nút Tiếp tục
  useLayoutEffect(() => {
    if (daKiemTra && ketQuaDung) {
      window.scrollTo({ top: scrollBeforeCheckRef.current, behavior: "instant" });
    }
  }, [daKiemTra, ketQuaDung]);

  useEffect(
    () => () => {
      [
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

  function xuLyRewardDongXong() {
    phanThuong.ketThucReward();

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
    // Khi trả lời đúng: hiển thị câu mẫu 3 thì kèm cấu trúc ngữ pháp để người học đọc kỹ.
    // Người học nhấn "Tiếp tục" hoặc bấm Enter để chuyển câu.
    if (!daKiemTra || daHoanThanh || hienReward || dangChoReward || !ketQuaDung || dangChuyenCau) {
      return undefined;
    }

    return undefined;
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward, dangChoReward, dangChuyenCau]);

  const theDangHoc = danhSachThe[chiSo];
  const laCauChon = loaiCauCua(theDangHoc) === "chon";

  // Hỗ trợ phím tắt Enter khi đã trả lời đúng (hoặc đã chọn ở câu trắc nghiệm) để sang câu mới
  useEffect(() => {
    if (!daKiemTra || (!ketQuaDung && !laCauChon) || dangChuyenCau || hienReward || dangChoReward) {
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
  }, [daKiemTra, ketQuaDung, laCauChon, dangChuyenCau, hienReward, dangChoReward]);

  // Tự động đọc đáp án đúng qua TTS khi trả lời chính xác
  useEffect(() => {
    if (!daKiemTra || !ketQuaDung || !danhSachThe[chiSo]) return;
    ttsSpeak(layDapAnDung(danhSachThe[chiSo]), layNgonNguDapAn(danhSachThe[chiSo]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, chiSo]);

  // Nghe viết: tự đọc từ khi sang câu mới
  const khoaCauNghe =
    !daHoanThanh && loaiCauCua(theDangHoc) === "nghe" ? theDangHoc?.__sessionKey : null;
  useEffect(() => {
    if (!khoaCauNghe) return undefined;
    const timer = setTimeout(() => docCauHoiHienTai(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaCauNghe]);

  // Dạng câu của từng thẻ: gõ từ (VI → EN), gõ nghĩa (EN → VI), nghe viết,
  // trắc nghiệm (chỉ có trong Hỗn hợp, chiều hỏi lưu ở __chieuChon)
  function loaiCauCua(the) {
    if (the?.__loaiCau) return the.__loaiCau;
    if (loai === "nghe-viet") return "nghe";
    return cheDo === "vi-en" ? "go-tu" : "go-nghia";
  }
  function hoiBangTiengViet(the) {
    const loaiCau = loaiCauCua(the);
    return loaiCau === "go-tu" || (loaiCau === "chon" && the.__chieuChon === "vi-en");
  }
  function dapAnLaTiengAnh(the) {
    return hoiBangTiengViet(the) || loaiCauCua(the) === "nghe";
  }
  function layCauHoi(the) { return the ? (hoiBangTiengViet(the) ? the.meaning_vi : the.term_en) : ""; }
  function layDapAnDung(the) { return the ? (dapAnLaTiengAnh(the) ? the.term_en : the.meaning_vi) : ""; }
  function layNgonNguCauHoi(the) { return hoiBangTiengViet(the) ? "vi-VN" : "en-US"; }
  function layNgonNguDapAn(the) { return dapAnLaTiengAnh(the) ? "en-US" : "vi-VN"; }

  function docCauHoiHienTai() {
    ttsSpeak(layCauHoi(danhSachThe[chiSo]), layNgonNguCauHoi(danhSachThe[chiSo]));
  }

  function docDapAnDungHienTai() {
    ttsSpeak(layDapAnDung(danhSachThe[chiSo]), layNgonNguDapAn(danhSachThe[chiSo]));
  }

  function tangTienTrinhChoThe() {
    const soCauDungMoi = soCauDung + 1;
    setSoCauDung(soCauDungMoi);
    phanThuong.ghiNhanCauDung(soCauDungMoi);
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
    setLuaChon(null);
    pendingRetryCardRef.current = false;
    chuyenCauMemLockRef.current = false;
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
  // Không auto-chuyển — đặt cờ pendingRetry để hiện TenseExamplesCard, chờ user nhấn Enter hoặc Tiếp tục
  function chuyenCauSauNhapLaiDung() {
    pendingRetryCardRef.current = true;
    // daKiemTra=true, ketQuaDung=true đã được caller set, TenseExamplesCard sẽ hiện
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
    event?.preventDefault?.();
    scrollBeforeCheckRef.current = window.scrollY; // Lưu scroll trước khi re-render

    // Nếu đã trả lời đúng và đang xem card 3 thì, Enter sẽ chuyển sang câu tiếp theo
    if (daKiemTra && ketQuaDung) {
      chuyenCauMem();
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
      const dungNhapLai = khopDapAn(cauTraLoi, dapAnNhapLai);

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
    const dung = khopDapAn(cauTraLoi, dapAnDung);

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
    scrollBeforeCheckRef.current = window.scrollY; // Lưu scroll trước khi re-render
    if (dangChuyenCau || hienReward || dangChoReward) return;
    if (dangCooldownSaiRef.current) return; // block trong cooldown flash đỏ

    if (!cauTraLoi.trim()) {
      hienThongBaoCanhBao("Vui lòng nhập đáp án");
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = khopDapAn(cauTraLoi, dapAnDung);

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

  // Câu trắc nghiệm trong Hỗn hợp: đúng → tính tiến độ như gõ đúng;
  // sai → ghi nhận sai, Tiếp tục sẽ đưa câu này về hỏi lại sau 5 câu.
  function chonDapAnLuaChon(dapAn) {
    if (daKiemTra || hienReward || dangChoReward || dangChuyenCau) return;

    const theHienTai = danhSachThe[chiSo];
    if (!theHienTai) return;
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = dapAn === dapAnDung;

    scrollBeforeCheckRef.current = window.scrollY;
    setLuaChon(dapAn);
    setDaKiemTra(true);
    setKetQuaDung(dung);
    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: dapAn,
        dung,
        answerMeta: {
          mode: dung && theHienTai.__saiBuoc ? "retry-correct" : "choice",
          segment_index: theHienTai.__segmentIndex ?? 0,
          counts_toward_progress: dung,
        },
      },
    ]);

    if (dung) {
      phatAmThanhDung();
      tangTienTrinhChoThe();
      incrementCombo();
    } else {
      resetCombo();
      setTapCardSai((prev) => new Set(prev).add(theHienTai.id));
      pendingRetryCardRef.current = true;
    }
  }

  function hienThiGoiY() {
    if (dangChuyenCau || hienReward || dangChoReward || ketQuaDung) return;
    setHienGoiY(true);
    inputRef.current?.focus();
  }

  function sangCauTiepTheo({ boQuaCau = false, dungRoi = false } = {}) {
    if (dungRoi || boQuaCau) {
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
    setDangChoNhanEnterSauSai(false);
    setCheDoNhapLai({ active: false, dapAnDung: "" });
    setLuaChon(null);
  }

  function chuyenCauMem({ boQuaKhoaReward = false, boQuaCau = false } = {}) {
    // Ngăn gọi 2 lần liên tiếp (window keydown + button click trong cùng một sự kiện)
    if (chuyenCauMemLockRef.current) return;
    if (!boQuaKhoaReward && (hienReward || dangChoReward)) return;

    chuyenCauMemLockRef.current = true;
    const isRetry = pendingRetryCardRef.current;
    pendingRetryCardRef.current = false;

    xoaTimerChuyenCau();
    setDangChuyenCau(true);

    if (isRetry) {
      // Đúng ở chế độ nhập lại (hint/retry/revealAnswer): chèn thẻ hỏi lại 5 câu sau rồi reset
      questionTransitionTimerRef.current = window.setTimeout(() => {
        chuyenCauMemLockRef.current = false;
        chenTheHoiLai();
        datLaiTrangThaiCauTraLoi();
        focusInputTre();
        questionTransitionTimerRef.current = null;
      }, 220);
    } else {
      // capture ketQuaDung tại thời điểm gọi (tránh stale closure sau 220ms)
      const dungRoi = ketQuaDung;
      questionTransitionTimerRef.current = window.setTimeout(() => {
        chuyenCauMemLockRef.current = false;
        sangCauTiepTheo({ boQuaCau, dungRoi });
        questionTransitionTimerRef.current = null;
      }, 220);
    }
  }

  // Đưa phiên về câu đầu; tăng lanLam để xếp lại câu hỏi và mở study session mới.
  function batDauLai() {
    xoaTatCaTimerTuLuan();
    datLaiPhanThuong();
    pendingRetryCardRef.current = false;
    chuyenCauMemLockRef.current = false;
    setLanLam((g) => g + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setHienGoiY(false);
    setHienCanhBaoNhap(false);
    setDaBoQua(false);
    setDangChoNhanEnterSauSai(false);
    setLuaChon(null);
    setSoCauDung(0);
    setDanhSachThe([]);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setDangChuyenCau(false);
    resetAll();
    setTapCardSai(new Set());
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

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    setCheDo(key);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo: key, chiHocTuYeuThich, batRandom, soCauDungNhanThuong });
    lamLai();
  }

  function doiCheDoReward() {
    const moi = !batReward;
    if (!moi) datLaiPhanThuong();
    setBatReward(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong, batReward: moi });
  }

  function doiRandom() {
    const moi = !batRandom;
    setBatRandom(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom: moi, soCauDungNhanThuong });
    if (moi) setLanTronTuLuan((lanHienTai) => lanHienTai + 1);
    batDauLai();
  }

  function capNhatMocReward(e) {
    const v = Math.max(1, Number(e.target.value) || 1);
    datLaiPhanThuong();
    setSoCauDungNhanThuong(v);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich, batRandom, soCauDungNhanThuong: v });
  }

  function doiChiHocTuYeuThich() {
    const moi = !chiHocTuYeuThich;
    setChiHocTuYeuThich(moi);
    luuCaiDatHocTap(cauHinh.khoaCaiDat, { cheDo, chiHocTuYeuThich: moi, batRandom, soCauDungNhanThuong });
    batDauLai();
  }

  if (dangTaiDuLieu) return <TheTrangThaiPhien tieuDe="Đang tải dữ liệu..." />;

  if (loiTaiDuLieu) return (
    <TheTrangThaiPhien tieuDe="Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.">
      <button
        type="button"
        onClick={taiDuLieuTuLuan}
        className="ui-button ui-button--primary ui-study-empty-card__button"
      >
        Thử lại
      </button>
    </TheTrangThaiPhien>
  );

  if (!bo) return null;

  if (danhSachGoc.length === 0 || danhSachThe.length === 0) {
    const dangThieuTuYeuThich = chiHocTuYeuThich && danhSachGoc.length > 0;
    const khongKhopBoLoc = !chiHocTuYeuThich && danhSachGoc.length > 0;

    return (
      <TheTrangThaiPhien
        tieuDe={
          dangThieuTuYeuThich
            ? "Chưa có từ yêu thích"
            : khongKhopBoLoc
              ? "Không có từ nào khớp bộ lọc"
              : "Bộ từ này chưa có từ nào"
        }
        moTa={
          dangThieuTuYeuThich
            ? `Tắt lọc yêu thích hoặc thả tim thêm vài từ trước khi học ${cauHinh.tenHienThi}.`
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

  const theHienTai = danhSachThe[chiSo];
  const hieuUngThuong = (
    <RewardTikTokEffect
      active={batReward && hienReward}
      lanKichHoat={phanThuong.lanReward}
      config={CAU_HINH_REWARD_QUIZ}
      progressOriginRef={progressOriginRef}
      progressEndpointRef={progressEndpointRef}
      onRequestClose={phanThuong.dongReward}
      onHideComplete={xuLyRewardDongXong}
      combo={combo}
      tenseExamples={daHoanThanh ? null : getTenseExamples(theHienTai)}
    />
  );

  if (daHoanThanh) {
    const { danhSachCardDung, danhSachCardSai } = tachKetQuaPhien(danhSachThePhien, tapCardSai);

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
            mode={cauHinh.modeKetQua}
          />
        </div>
      </>
    );
  }

  if (!theHienTai) {
    return <TheTrangThaiPhien tieuDe="Đang cập nhật..." />;
  }

  return (
    <>
      <ChatbotTheDangHoc the={theHienTai} />
      {hieuUngThuong}
      <div className="ui-study-session relative z-10 mx-auto max-w-2xl px-4 py-3">
        <div className="ui-study-toolbar mb-4">
          <Link to={`/decks/${boId}${taoQueryBoLoc(boLocUrl)}`} className="ui-back-btn">
            <span className="ui-back-btn__arrow">&larr;</span> Trở về
          </Link>
          <CaiDatPhienHoc
            label={cauHinh.tieuDeCaiDat}
            idMocReward={`moc-reward-${loai}`}
            dsCheDo={loai === "tu-luan" ? DS_CHE_DO : undefined}
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
          className="ui-written-progress mb-4"
          nhanCheDo={
            loai === "tu-luan"
              ? cheDo === "vi-en" ? "VI \u2192 EN" : "EN \u2192 VI"
              : NHAN_LOAI_CAU[loaiCauCua(theHienTai)]
          }
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
          key={theHienTai.id}
          className="mb-6 sm:py-10"
          cauHoi={layCauHoi(theHienTai)}
          laCauHoiLai={theHienTai.__saiBuoc}
          dangRoiDi={dangChuyenCau}
          dangDoc={ttsDangDoc}
          onDoc={docCauHoiHienTai}
          cheDoNghe={loaiCauCua(theHienTai) === "nghe"}
        />

        {laCauChon ? (
          <>
            <DanhSachDapAn
              key={`answers-${theHienTai.__sessionKey}`}
              khoa={theHienTai.id}
              danhSachDapAn={theHienTai.__dapAnLuaChon}
              dapAnDung={layDapAnDung(theHienTai)}
              dapAnDaChon={luaChon}
              onChon={chonDapAnLuaChon}
              dangRoiDi={dangChuyenCau}
            />
            {daKiemTra && !ketQuaDung && (
              <PhanHoiSaiTracNghiem
                dapAnDung={layDapAnDung(theHienTai)}
                onTiepTuc={() => chuyenCauMem()}
              />
            )}
          </>
        ) : (
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
              placeholder={loai === "tu-luan" ? "Nhập đáp án..." : GOI_Y_NHAP[loaiCauCua(theHienTai)]}
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
                <p className="mb-1 text-xs font-bold text-[oklch(45%_0.14_24)]">Đáp án đúng</p>
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
                <p className="mb-1 text-xs font-bold text-[oklch(50%_0.18_55)]">Đáp án đúng — nhập lại</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ttsSpeak(cheDoNhapLai.dapAnDung, layNgonNguDapAn(danhSachThe[chiSo]));
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
                  {taoGoiY(layDapAnDung(danhSachThe[chiSo]))}
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
                className="ui-button ui-button--primary w-full rounded-xl py-3.5 text-lg font-bold"
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
        </form>
        )}

        {/* Đúng rồi: hiện câu mẫu + ví dụ các thì — nằm NGOÀI form để tránh browser tự focus và scroll */}
        {daKiemTra && ketQuaDung && (
          <PhanHoiDung
            className="pt-2 pb-4 text-center"
            the={theHienTai}
            termEn={theHienTai?.term_en}
            meaningVi={theHienTai?.meaning_vi}
            onTiepTuc={() => chuyenCauMem()}
          />
        )}
      </div>
    </>
  );
}

function TrangTuLuanWrapper({ loai = "tu-luan" }) {
  const { deckId } = useParams();
  return <TrangTuLuan key={`${loai}-${deckId}`} loai={loai} />;
}

export default TrangTuLuanWrapper;
