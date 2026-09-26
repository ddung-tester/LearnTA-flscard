import { useEffect, useLayoutEffect, useRef, useState } from "react";
import StreakBadge from "../components/common/StreakBadge";
import { useParams, Link, useSearchParams } from "react-router-dom";
import AnimatedModal from "../components/common/AnimatedModal";
import NhapNhanhTu from "../components/NhapNhanhTu";
import DeckDetailSkeleton from "../components/common/DeckDetailSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useTTS from "../hooks/useTTS";
import { laTuYeuThich } from "../data/duLieuMau";
import {
  FILTER_TU,
  SORT_TU,
  apDungBoLoc,
  demTheoFilter,
  docBoLocTuUrl,
} from "../utils/locTuVung";
import { cheTuTrongCau } from "../utils/phienHoc";
import { layDeckTheoId } from "../services/deckApi";
import { getUserStats } from "../services/userApi";
import {
  capNhatCard,
  doiThuTuCards,
  importCards,
  layCardsTheoDeck,
  taoCard,
  toggleFavoriteCard,
  xoaCard,
} from "../services/cardApi";

const FORM_TU_RONG = {
  word: "",
  meaning: "",
  example: "",
};

function IconPlus() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function IconGrip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}

function IconHeart({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}


function TrangChiTietBo() {
  const { deckId } = useParams();
  const { navigateWithLoading, setPageDataLoading } = usePageTransition();
  const { isAuthenticated, user } = useAuth();
  const { speak: ttsSpeak, isPlaying: ttsDangDoc } = useTTS();
  const [currentPlayingWordId, setCurrentPlayingWordId] = useState(null);
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSach, setDanhSach] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [dangLuuTu, setDangLuuTu] = useState(false);
  const [dangMoForm, setDangMoForm] = useState(false);
  const [theDangSua, setTheDangSua] = useState(null);
  const [formTu, setFormTu] = useState(FORM_TU_RONG);
  const [dangChinhSua, setDangChinhSua] = useState(false);
  const [dangMoImport, setDangMoImport] = useState(false);
  const toast = useToast();
  // Bộ lọc lưu trên URL → quay lại từ trang học vẫn giữ nguyên, chia sẻ link được
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter: filterTu, sort: sortTu, tuKhoa } = docBoLocTuUrl(searchParams);
  // Ô tìm kiếm giữ state cục bộ để gõ tiếng Việt (IME) mượt; URL cập nhật sau 250ms
  const [oTimKiem, setOTimKiem] = useState(tuKhoa);
  const tuKhoaHienTai = oTimKiem.trim();
  const [chiTietTu, setChiTietTu] = useState(null); // từ đang xem chi tiết
  const [theDangKeoId, setTheDangKeoId] = useState(null);
  const [dangLuuThuTu, setDangLuuThuTu] = useState(false);
  const [banSaoKeoTu, setBanSaoKeoTu] = useState(null);
  const [dangXacNhanXoa, setDangXacNhanXoa] = useState(null); // id của từ đang chờ xóa
  const [successInfo, setSuccessInfo] = useState({ open: false, message: "" });
  const meaningInputRef = useRef(null);
  const danhSachRef = useRef([]);
  const danhSachTruocKhiKeoRef = useRef([]);
  const phienKeoRef = useRef(null);
  const listTuRef = useRef(null);
  const banSaoKeoTuRef = useRef(null);
  const frameKeoRef = useRef(null);
  const yKeoRef = useRef(0);
  const viTriHangTuRef = useRef([]);
  const autoScrollRef = useRef({ frameId: null, tocDo: 0, clientY: 0 });
  const cleanupPointerKeoRef = useRef(null);
  const phienLuuThuTuRef = useRef(0);
  const [userStreak, setUserStreak] = useState(0);
  const [studiedToday, setStudiedToday] = useState(false);
  // streak bị vỡ: đã từng có streak nhưng bỏ học >= 2 ngày liên tiếp
  const [streakBroken, setStreakBroken] = useState(false);
  const dataRequestRef = useRef(0);

  // Đọc từ params mới nhất (không dùng closure) để lần ghi trễ của ô tìm kiếm không đè bộ lọc vừa chọn
  function capNhatBoLoc(thayDoi) {
    setSearchParams((hienTai) => {
      const tiepTheo = { ...docBoLocTuUrl(hienTai), ...thayDoi };
      const params = new URLSearchParams();
      if (tiepTheo.filter !== "tat-ca") params.set("filter", tiepTheo.filter);
      if (tiepTheo.sort !== "mac-dinh") params.set("sort", tiepTheo.sort);
      if (tiepTheo.tuKhoa) params.set("q", tiepTheo.tuKhoa);
      return params;
    }, { replace: true });
  }

  useEffect(() => {
    if (oTimKiem.trim() === tuKhoa) return undefined;
    const timer = setTimeout(() => capNhatBoLoc({ tuKhoa: oTimKiem.trim() }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ khi ô tìm kiếm đổi
  }, [oTimKiem]);

  const filterTabsRef = useRef(null);
  const [filterConTheCuonPhai, setFilterConTheCuonPhai] = useState(false);

  useEffect(() => {
    const el = filterTabsRef.current;
    if (!el) return undefined;

    function capNhatTrangThaiCuonFilter() {
      setFilterConTheCuonPhai(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    }

    capNhatTrangThaiCuonFilter();
    el.addEventListener("scroll", capNhatTrangThaiCuonFilter, { passive: true });
    window.addEventListener("resize", capNhatTrangThaiCuonFilter);
    return () => {
      el.removeEventListener("scroll", capNhatTrangThaiCuonFilter);
      window.removeEventListener("resize", capNhatTrangThaiCuonFilter);
    };
  }, [danhSach.length, dangTaiDuLieu]);

  async function taiDuLieuBo() {
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
        setDanhSach(cards);
      }
    } catch (error) {
      if (requestId === dataRequestRef.current) {
        setBo(null);
        setDanhSach([]);
        setLoiTaiDuLieu(error.message);
      }
    } finally {
      if (requestId === dataRequestRef.current) {
        setDangTaiDuLieu(false);
      }
    }
  }

  useEffect(() => {
    setDangMoForm(false);
    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangChinhSua(false);
    setDangMoImport(false);
    setTheDangKeoId(null);
    setDangXacNhanXoa(null);
    taiDuLieuBo();
  }, [boId]);

  useEffect(() => {
    danhSachRef.current = danhSach;
  }, [danhSach]);

  useLayoutEffect(() => {
    const loadingKey = `deck-detail-${boId}`;
    setPageDataLoading(loadingKey, dangTaiDuLieu);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [boId, dangTaiDuLieu, setPageDataLoading]);

  useEffect(() => () => {
    cleanupPointerKeoRef.current?.();
    // eslint-disable-next-line react-hooks/immutability -- function declaration is hoisted, safe to call before source-order declaration
    dungAutoScroll();
    if (frameKeoRef.current) {
      window.cancelAnimationFrame(frameKeoRef.current);
    }
  }, []);

  // Fetch streak từ user stats (đồng bộ với header)
  useEffect(() => {
    if (!isAuthenticated) return;
    getUserStats()
      .then((stats) => {
        setUserStreak(stats.current_streak ?? 0);
        // Tính ngày hôm nay và hôm qua theo giờ Việt Nam (UTC+7)
        const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const todayVN = nowVN.toISOString().slice(0, 10);
        const yesterdayVN = new Date(nowVN - 86400000).toISOString().slice(0, 10);
        const lastStudy = stats.last_study_date
          ? String(stats.last_study_date).slice(0, 10)
          : null;
        const daHocHomNay = lastStudy === todayVN;
        const daHocHomQua = lastStudy === yesterdayVN;
        setStudiedToday(daHocHomNay);
        // Streak bị vỡ khi: đã từng học (lastStudy tồn tại) nhưng bỏ >= 2 ngày
        // (không phải hôm nay và không phải hôm qua)
        setStreakBroken(!!lastStudy && !daHocHomNay && !daHocHomQua);
      })
      .catch(() => {});
  }, [isAuthenticated, boId]);

  // Lắng nghe event streak-updated khi vừa hoàn thành bài học
  useEffect(() => {
    function onStreakUpdated(e) {
      const newStreak = e.detail?.streak ?? 0;
      setUserStreak(newStreak);
      // Vừa học xong → đánh dấu đã học hôm nay → lửa cháy lên, bỏ broken
      if (newStreak > 0) {
        setStudiedToday(true);
        setStreakBroken(false);
      }
    }
    window.addEventListener("streak-updated", onStreakUpdated);
    return () => window.removeEventListener("streak-updated", onStreakUpdated);
  }, []);
  function showSuccess(msg) {
    setSuccessInfo({ open: true, message: msg });
    setTimeout(() => setSuccessInfo({ open: false, message: "" }), 1200);
  }

  function coQuyenQuanLyBo() {
    return (
      isAuthenticated &&
      bo?.user_id !== null &&
      String(bo?.user_id) === String(user?.id)
    );
  }

  function yeuCauQuyenChinhSua() {
    if (coQuyenQuanLyBo()) return true;

    if (!isAuthenticated) {
      navigateWithLoading("/login", { state: { from: { pathname: `/decks/${boId}` } } });
    } else {
      toast.warning("Chỉ có thể sửa bộ từ của bạn");
    }

    return false;
  }

  function yeuCauCheDoChinhSua() {
    if (!yeuCauQuyenChinhSua()) return false;
    if (dangChinhSua) return true;

    toast.info("Bật chế độ sửa để quản lý từ");
    return false;
  }

  function tatCheDoChinhSua() {
    huyKeoTu();
    setDangMoForm(false);
    setDangMoImport(false);
    setDangXacNhanXoa(null);
    setDangChinhSua(false);
  }

  function batTatCheDoChinhSua() {
    if (!yeuCauQuyenChinhSua()) return;

    if (dangChinhSua) {
      tatCheDoChinhSua();
      return;
    }

    setDangChinhSua(true);
  }

  function moFormThemTu() {
    if (!yeuCauCheDoChinhSua()) return;

    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangMoForm(true);
  }

  function moFormSuaTu(the) {
    if (!yeuCauCheDoChinhSua()) return;

    setTheDangSua(the);
    setFormTu({
      word: the.term_en,
      meaning: the.meaning_vi,
      example: the.example_sentence || "",
    });
    setDangMoForm(true);
  }

  function dongFormTu() {
    setDangMoForm(false);
  }

  function moFormImport() {
    if (!yeuCauCheDoChinhSua()) return;

    setDangMoImport(true);
  }

  function dongFormImport() {
    setDangMoImport(false);
  }

  function hoiDoiTu() {
    setFormTu((prev) => ({ ...prev, word: prev.meaning, meaning: prev.word }));
  }

  async function hoiDoiNghiaTrongThe(the) {
    if (!yeuCauCheDoChinhSua()) return;
    try {
      const cardDaLuu = await capNhatCard(the.id, {
        term_en: the.meaning_vi,
        meaning_vi: the.term_en,
        example_sentence: the.example_sentence || "",
      });
      setDanhSach((hienTai) =>
        hienTai.map((item) => (item.id === the.id ? cardDaLuu : item))
      );
      showSuccess("Đã hoán đổi");
    } catch (error) {
      toast.error(error.message);
    }
  }

  function capNhatFormTu(event) {
    const { name, value } = event.target;
    setFormTu((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  function xuLyPhimNhapTu(event) {
    if (event.key !== "Enter" || event.isComposing) return;

    if (event.currentTarget.name === "word") {
      event.preventDefault();
      meaningInputRef.current?.focus();
    }
  }

  async function luuTu(event) {
    event.preventDefault();

    if (dangLuuTu) return;
    if (!yeuCauCheDoChinhSua()) return;

    const word = formTu.word.trim();
    const meaning = formTu.meaning.trim();
    const example = formTu.example.trim();

    if (!word || !meaning) return;

    setDangLuuTu(true);

    try {
      const payload = {
        term_en: word,
        meaning_vi: meaning,
        example_sentence: example,
      };

      if (theDangSua) {
        const cardDaLuu = await capNhatCard(theDangSua.id, payload);

        setDanhSach((hienTai) =>
          hienTai.map((the) => (the.id === theDangSua.id ? cardDaLuu : the))
        );
      } else {
        const cardMoi = await taoCard(boId, payload);

        setDanhSach((hienTai) => [cardMoi, ...hienTai]);
      }

    showSuccess(theDangSua ? "Đã cập nhật" : "Đã thêm từ");
    dongFormTu();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDangLuuTu(false);
    }
  }

  // Nhận danh sách từ đã phân tích / AI tạo từ NhapNhanhTu và lưu một lần
  async function nhapTuNhanh(cards) {
    if (dangLuuTu) return;
    if (!yeuCauCheDoChinhSua()) return;

    setDangLuuTu(true);

    try {
      const ketQua = await importCards(
        boId,
        cards.map((the) => ({
          term_en: the.term_en,
          meaning_vi: the.meaning_vi,
          example_sentence: the.example_sentence || "",
          note: the.note || "",
          pronunciation: the.pronunciation || null,
          part_of_speech: the.part_of_speech || null,
        }))
      );

      setDanhSach((hienTai) => [...hienTai, ...ketQua.cards]);
      setDangMoImport(false);
      showSuccess(`Đã thêm ${ketQua.inserted_count} từ`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDangLuuTu(false);
    }
  }

  function xoaTu(id) {
    if (!yeuCauCheDoChinhSua()) return;

    setDangXacNhanXoa(id);
  }

  async function thucHienXoaTu() {
    if (!dangXacNhanXoa) return;
    if (!yeuCauCheDoChinhSua()) return;

    try {
      await xoaCard(dangXacNhanXoa);
      setDanhSach((hienTai) => hienTai.filter((the) => the.id !== dangXacNhanXoa));
      setDangXacNhanXoa(null);
    showSuccess("Đã xóa");
    } catch (error) {
      toast.error(error.message);
    }
  }

  function sapXepTheoViTri(danhSachCanSap, cardId, viTriMoi) {
    const viTriHienTai = danhSachCanSap.findIndex((the) => the.id === cardId);

    if (viTriHienTai < 0 || viTriMoi < 0 || viTriMoi >= danhSachCanSap.length) {
      return null;
    }

    if (viTriHienTai === viTriMoi) return null;

    const danhSachMoi = [...danhSachCanSap];
    const [theBiKeo] = danhSachMoi.splice(viTriHienTai, 1);
    danhSachMoi.splice(viTriMoi, 0, theBiKeo);
    return danhSachMoi;
  }

  function capNhatViTriHangTu() {
    const listTu = listTuRef.current;
    if (!listTu) return;

    viTriHangTuRef.current = Array.from(
      listTu.querySelectorAll("[data-card-id]")
    ).map((hang) => {
      const rect = hang.getBoundingClientRect();
      return {
        id: Number(hang.dataset.cardId),
        midY: rect.top + rect.height / 2,
      };
    });
  }

  async function luuThuTuTu(danhSachMoi, danhSachCu = danhSach) {
    const phienLuu = phienLuuThuTuRef.current + 1;
    phienLuuThuTuRef.current = phienLuu;
    danhSachRef.current = danhSachMoi;
    setDanhSach(danhSachMoi);
    setDangLuuThuTu(true);

    try {
      const danhSachDaLuu = await doiThuTuCards(
        boId,
        danhSachMoi.map((the) => the.id)
      );
      if (phienLuu !== phienLuuThuTuRef.current) return;
      danhSachRef.current = danhSachDaLuu;
      setDanhSach(danhSachDaLuu);
    } catch (error) {
      if (phienLuu !== phienLuuThuTuRef.current) return;
      danhSachRef.current = danhSachCu;
      setDanhSach(danhSachCu);
      toast.error(error.message);
    } finally {
      if (phienLuu === phienLuuThuTuRef.current) {
        setDangLuuThuTu(false);
      }
    }
  }

  function capNhatViTriKeo(clientY) {
    const phienKeo = phienKeoRef.current;
    if (!phienKeo) return;

    yKeoRef.current = clientY - phienKeo.offsetY;

    if (frameKeoRef.current) return;

    frameKeoRef.current = window.requestAnimationFrame(() => {
      frameKeoRef.current = null;

      if (!banSaoKeoTuRef.current) return;
      banSaoKeoTuRef.current.style.transform =
        `translate3d(0, ${yKeoRef.current}px, 0) scale(1.012)`;
    });
  }

  function tinhTocDoCuon(clientY) {
    const vungBien = Math.min(96, window.innerHeight * 0.18);

    if (clientY < vungBien) {
      return -Math.ceil((1 - clientY / vungBien) * 18);
    }

    if (window.innerHeight - clientY < vungBien) {
      return Math.ceil((1 - (window.innerHeight - clientY) / vungBien) * 18);
    }

    return 0;
  }

  function dungAutoScroll() {
    if (autoScrollRef.current.frameId) {
      window.cancelAnimationFrame(autoScrollRef.current.frameId);
    }

    autoScrollRef.current = { frameId: null, tocDo: 0, clientY: 0 };
  }

  function chayAutoScroll() {
    const { tocDo, clientY } = autoScrollRef.current;

    if (!tocDo) {
      dungAutoScroll();
      return;
    }

    window.scrollBy({ top: tocDo, behavior: "auto" });
    capNhatViTriKeo(clientY);
    capNhatViTriHangTu();
    sapXepKhiKeo(clientY);

    autoScrollRef.current.frameId = window.requestAnimationFrame(chayAutoScroll);
  }

  function capNhatAutoScroll(clientY) {
    const tocDo = tinhTocDoCuon(clientY);
    autoScrollRef.current.tocDo = tocDo;
    autoScrollRef.current.clientY = clientY;

    if (tocDo && !autoScrollRef.current.frameId) {
      autoScrollRef.current.frameId = window.requestAnimationFrame(chayAutoScroll);
    }

    if (!tocDo) dungAutoScroll();
  }

  function sapXepKhiKeo(clientY) {
    const phienKeo = phienKeoRef.current;
    if (!phienKeo) return;

    const hangKhac = viTriHangTuRef.current.filter(
      (hang) => Number(hang.id) !== Number(phienKeo.cardId)
    );
    let viTriMoi = hangKhac.length;

    for (let index = 0; index < hangKhac.length; index += 1) {
      if (clientY < hangKhac[index].midY) {
        viTriMoi = index;
        break;
      }
    }

    const danhSachMoi = sapXepTheoViTri(
      danhSachRef.current,
      phienKeo.cardId,
      viTriMoi
    );

    if (!danhSachMoi) return;

    danhSachRef.current = danhSachMoi;
    setDanhSach(danhSachMoi);
    window.requestAnimationFrame(capNhatViTriHangTu);
  }

  function huyKeoTu({ khoiPhuc = false } = {}) {
    cleanupPointerKeoRef.current?.();
    cleanupPointerKeoRef.current = null;
    dungAutoScroll();
    if (frameKeoRef.current) {
      window.cancelAnimationFrame(frameKeoRef.current);
      frameKeoRef.current = null;
    }
    phienKeoRef.current = null;
    viTriHangTuRef.current = [];
    setBanSaoKeoTu(null);
    setTheDangKeoId(null);

    if (khoiPhuc) {
      danhSachRef.current = danhSachTruocKhiKeoRef.current;
      setDanhSach(danhSachTruocKhiKeoRef.current);
    }
  }

  function batDauKeoTu(event, the) {
    if (!dangChinhSua) return;

    event.preventDefault();
    huyKeoTu();
    const hangTu = event.currentTarget.closest("[data-card-id]");
    if (!hangTu) return;

    const rect = hangTu.getBoundingClientRect();
    yKeoRef.current = rect.top;
    capNhatViTriHangTu();
    danhSachTruocKhiKeoRef.current = danhSachRef.current;
    phienKeoRef.current = {
      cardId: the.id,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    };

    const xuLyMove = (moveEvent) => keoTu(moveEvent);
    const xuLyKetThuc = (endEvent) => ketThucKeoTu(endEvent);
    const xuLyHuy = () => huyKeoTu({ khoiPhuc: true });

    window.addEventListener("pointermove", xuLyMove, { passive: false });
    window.addEventListener("pointerup", xuLyKetThuc);
    window.addEventListener("pointercancel", xuLyHuy);
    cleanupPointerKeoRef.current = () => {
      window.removeEventListener("pointermove", xuLyMove);
      window.removeEventListener("pointerup", xuLyKetThuc);
      window.removeEventListener("pointercancel", xuLyHuy);
    };

    setTheDangKeoId(the.id);
    setBanSaoKeoTu({
      id: the.id,
      term_en: the.term_en,
      meaning_vi: the.meaning_vi,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  function keoTu(event) {
    const phienKeo = phienKeoRef.current;
    if (!phienKeo || phienKeo.pointerId !== event.pointerId) return;

    event.preventDefault();
    capNhatViTriKeo(event.clientY);
    capNhatAutoScroll(event.clientY);
    sapXepKhiKeo(event.clientY);
  }

  function ketThucKeoTu(event) {
    const phienKeo = phienKeoRef.current;
    if (!phienKeo || phienKeo.pointerId !== event.pointerId) return;

    const danhSachMoi = danhSachRef.current;
    const danhSachCu = danhSachTruocKhiKeoRef.current;
    const daDoiThuTu =
      danhSachMoi.map((the) => the.id).join(",") !==
      danhSachCu.map((the) => the.id).join(",");

    huyKeoTu();

    if (daDoiThuTu) {
      luuThuTuTu(danhSachMoi, danhSachCu);
    }
  }

  function diChuyenTuBangPhim(event, the, huong) {
    if (!dangChinhSua) return;

    event.preventDefault();
    const viTriHienTai = danhSach.findIndex((item) => item.id === the.id);
    const danhSachMoi = sapXepTheoViTri(danhSach, the.id, viTriHienTai + huong);
    if (!danhSachMoi) return;

    luuThuTuTu(danhSachMoi);
  }

  async function toggleYeuThich(the) {
    if (!yeuCauQuyenChinhSua()) return;

    const yeuThichMoi = !laTuYeuThich(the);

    setDanhSach((hienTai) =>
      hienTai.map((item) =>
        item.id === the.id
          ? {
            ...item,
            is_favorite: yeuThichMoi,
            isFavorite: yeuThichMoi,
          }
          : item
      )
    );
    try {
      const cardDaLuu = await toggleFavoriteCard(the.id, yeuThichMoi);
      setDanhSach((hienTai) =>
        hienTai.map((item) => (item.id === the.id ? cardDaLuu : item))
      );
    } catch (error) {
      setDanhSach((hienTai) =>
        hienTai.map((item) =>
          item.id === the.id
            ? {
              ...item,
              is_favorite: !yeuThichMoi,
              isFavorite: !yeuThichMoi,
            }
            : item
        )
      );
      toast.error(error.message);
      return;
    }
    toast.success(yeuThichMoi ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích");
  }

  if (dangTaiDuLieu) {
    return <DeckDetailSkeleton />;
  }

  if (loiTaiDuLieu) {
    return (
      <EmptyState
        icon="error"
        title="Không thể tải dữ liệu"
        description="Kiểm tra kết nối mạng hoặc thử lại."
        action="Thử lại"
        onAction={taiDuLieuBo}
      />
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
          Kiểm tra lại đường dẫn hoặc quay về Dashboard để chọn một bộ khác.
        </p>
        <Link
          to="/dashboard"
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về Dashboard
        </Link>
      </div>
    );
  }

  const soTu = danhSach.length;
  const danhSachDaLoc = apDungBoLoc(danhSach, { filter: filterTu, sort: sortTu, tuKhoa: tuKhoaHienTai });
  const soTuTheoFilter = demTheoFilter(danhSach);
  const soTuYeuThich = soTuTheoFilter["yeu-thich"];
  const soTuChuaHoc = soTuTheoFilter["chua-hoc-filter"];
  const soTuDaHoc = soTuTheoFilter["da-hoc"];
  const dangLoc = filterTu !== "tat-ca" || tuKhoaHienTai !== "";
  const soTuSeHoc = danhSachDaLoc.length;
  // Chế độ Ngữ cảnh chỉ dùng được từ có câu ví dụ chứa chính từ đó
  const soTuCoNguCanh = danhSachDaLoc.filter((the) =>
    cheTuTrongCau(the.example_sentence, the.term_en)
  ).length;
  // Luôn gửi filter tường minh để trang học không rơi về cài đặt "chỉ học yêu thích" đã lưu
  const queryHoc = `?filter=${filterTu}&sort=${sortTu}${tuKhoaHienTai ? `&q=${encodeURIComponent(tuKhoaHienTai)}` : ""}`;
  const streak = userStreak;
  const coTheQuanLy = coQuyenQuanLyBo();
  const dangBatChinhSua = dangChinhSua && coTheQuanLy;
  // Chỉ cho kéo thứ tự khi đang ở chế độ sắp xếp mặc định
  const dangChoMoveTu = dangBatChinhSua && sortTu === "mac-dinh" && !dangLoc;

  return (
    <div className="ui-page-stack ui-page-stack--deck-detail">
      <div className="ui-deck-detail-top">
        <Link
          to={isAuthenticated ? "/dashboard" : "/decks"}
          className="ui-back-link ui-back-link--quiet ui-deck-detail-top__back"
        >
          ← {isAuthenticated ? "Dashboard" : "Bộ từ vựng"}
        </Link>
        <h2 className="ui-deck-detail-top__heading">
          {bo.title}
        </h2>
      </div>

      <div className="ui-stat-grid ui-stat-grid--deck">
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">Tổng từ</p>
          <p className="ui-stat-value text-[var(--mau-chu)]">{soTu}</p>
        </div>
        {isAuthenticated ? (
          /* Thẻ Streak: 3 trạng thái — cháy / đóng băng / vỡ */
          <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)] !p-0 overflow-hidden">
            <StreakBadge
              streak={streak}
              size="lg"
              showZero
              label="Streak"
              fullCard
              frozen={!studiedToday && !streakBroken}
              broken={streakBroken}
            />
          </div>
        ) : (
          <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
            <p className="ui-stat-label mb-1">Đã học</p>
            <p className="ui-stat-value text-[var(--mau-thanh-cong)]">{soTuDaHoc}</p>
          </div>
        )}
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">Yêu thích</p>
          <p className="ui-stat-value" style={{ color: "oklch(51% 0.15 24)" }}>{soTuYeuThich}</p>
        </div>
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">Chưa học</p>
          <p className="ui-stat-value text-[var(--mau-chinh)]">{soTuChuaHoc}</p>
        </div>
      </div>

      <section className="ui-study-launch" aria-labelledby="study-launch-scope">
        <p id="study-launch-scope" className="ui-study-launch__scope" aria-live="polite">
          {soTuSeHoc === 0
            ? "Không có từ nào để học với bộ lọc này"
            : dangLoc
              ? <>Học <strong>{soTuSeHoc}</strong> từ đang lọc</>
              : <>Học cả <strong>{soTu}</strong> từ trong bộ</>}
        </p>
        <div className="ui-action-grid ui-action-grid--3col">
          {[
            { key: "flashcard", label: "Flashcard", path: "flashcard", primary: true },
            { key: "quiz", label: "Trắc nghiệm", path: "quiz", lyDoKhoa: soTu < 4 ? "Cần ít nhất 4 từ trong bộ để làm trắc nghiệm" : "" },
            { key: "tu-luan", label: "Tự luận", path: "tu-luan" },
            { key: "nghe-viet", label: "Nghe viết", path: "nghe-viet" },
            {
              key: "ngu-canh",
              label: "Ngữ cảnh",
              path: "ngu-canh",
              lyDoKhoa: soTu < 4
                ? "Cần ít nhất 4 từ trong bộ để làm ngữ cảnh"
                : soTuCoNguCanh === 0
                  ? "Cần câu ví dụ có chứa chính từ đang học"
                  : "",
            },
            { key: "noi-tu", label: "Nối từ", path: "noi-tu" },
            { key: "hon-hop", label: "Hỗn hợp", path: "hon-hop" },
          ].map((cach) => {
            const lyDoKhoa = soTuSeHoc === 0 ? "Không có từ nào khớp bộ lọc" : cach.lyDoKhoa;
            const lop = `ui-action-card ui-study-launch__btn${cach.primary ? " ui-study-launch__btn--primary" : ""}`;

            return lyDoKhoa ? (
              <span key={cach.key} className={`${lop} ui-study-launch__btn--disabled`} aria-disabled="true" title={lyDoKhoa}>
                {cach.label}
              </span>
            ) : (
              <Link key={cach.key} to={`/decks/${boId}/${cach.path}${queryHoc}`} className={lop}>
                {cach.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="ui-section-stack">
        {/* ---- Toolbar row 1: tiêu đề + actions ---- */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-[var(--mau-chu)] shrink-0">
            Từ vựng
            <span className="ml-1.5 text-[var(--mau-chu-phu)] font-normal">
              ({danhSachDaLoc.length}/{soTu})
            </span>
          </h3>

          <div className="flex items-center gap-2">
            {coTheQuanLy && dangBatChinhSua && (
              <>
                <button
                  type="button"
                  onClick={moFormThemTu}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/8 px-3 py-1.5 text-xs font-semibold text-[var(--mau-chinh)] transition-colors hover:bg-[var(--mau-chinh)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)]"
                >
                  <IconPlus />
                  Thêm từ
                </button>
                <button
                  type="button"
                  onClick={moFormImport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-3 py-1.5 text-xs font-semibold text-[var(--mau-chu-phu)] transition-colors hover:border-[var(--mau-chinh)] hover:text-[var(--mau-chinh)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)]"
                >
                  <IconUpload />
                  Thêm nhanh
                </button>
              </>
            )}

            {coTheQuanLy && (
              dangBatChinhSua ? (
                <button
                  type="button"
                  onClick={tatCheDoChinhSua}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mau-nguy-hiem,#ef4444)]/40 bg-[var(--mau-nguy-hiem,#ef4444)]/8 px-3 py-1.5 text-xs font-semibold text-[var(--mau-nguy-hiem,#ef4444)] transition-colors hover:bg-[var(--mau-nguy-hiem,#ef4444)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-nguy-hiem,#ef4444)]"
                  aria-label="Thoát chế độ sửa"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Thoát sửa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={batTatCheDoChinhSua}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-3 py-1.5 text-xs font-semibold text-[var(--mau-chu-phu)] transition-colors hover:border-[var(--mau-chinh)] hover:text-[var(--mau-chinh)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)]"
                  aria-label="Bật chế độ sửa"
                >
                  <IconEdit />
                  Sửa
                </button>
              )
            )}
          </div>
        </div>

        {/* ---- Toolbar row 2: filter tabs (cuộn ngang trên mobile) ---- */}
        <div
          ref={filterTabsRef}
          className={`ui-filter-tabs ui-filter-tabs--deck${filterConTheCuonPhai ? " ui-filter-tabs--co-the-cuon-phai" : ""}`}
          role="group"
          aria-label="Lọc từ vựng"
        >
          {FILTER_TU.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => capNhatBoLoc({ filter: filter.key })}
              aria-pressed={filterTu === filter.key}
              className="ui-filter-tab"
            >
              <span>{filter.label}</span>
              <span className="ui-filter-tab__count">{soTuTheoFilter[filter.key]}</span>
            </button>
          ))}
        </div>

        {/* ---- Toolbar row 3: tìm kiếm + sắp xếp ---- */}
        <div className="ui-word-toolbar">
          <label className="ui-word-search">
            <span className="sr-only">Tìm từ vựng</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-word-search__icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={oTimKiem}
              onChange={(e) => setOTimKiem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && oTimKiem) {
                  e.preventDefault();
                  setOTimKiem("");
                }
              }}
              placeholder="Tìm từ, nghĩa"
              className="ui-word-search__input"
              autoComplete="off"
              spellCheck={false}
            />
            {oTimKiem && (
              <button
                type="button"
                onClick={() => setOTimKiem("")}
                className="ui-word-search__clear"
                aria-label="Xóa từ khóa"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </label>

          <label className="ui-word-sort">
            <span className="ui-word-sort__label">Sắp xếp</span>
            <select
              value={sortTu}
              onChange={(e) => capNhatBoLoc({ sort: e.target.value })}
              className="ui-word-sort__select"
            >
              {SORT_TU.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {dangBatChinhSua && (dangLoc || sortTu !== "mac-dinh") && (
          <p className="ui-word-toolbar__hint">
            Kéo đổi thứ tự chỉ dùng được khi xem tất cả từ theo thứ tự mặc định.
          </p>
        )}

        {danhSach.length === 0 ? (
          <EmptyState
            icon="card"
            title="Chưa có từ nào"
            description="Thêm từ vựng đầu tiên để bắt đầu học."
            action={coTheQuanLy ? "Thêm từ vựng" : undefined}
            onAction={coTheQuanLy ? moFormThemTu : undefined}
          />
        ) : danhSachDaLoc.length === 0 ? (
          <EmptyState
            icon={filterTu === "yeu-thich" && !tuKhoaHienTai ? "favorite" : "search"}
            title={
              tuKhoaHienTai
                ? `Không có từ nào chứa “${tuKhoaHienTai}”`
                : filterTu === "yeu-thich"
                  ? "Chưa có từ yêu thích"
                  : "Không có từ nào khớp bộ lọc"
            }
            description={
              tuKhoaHienTai
                ? "Thử từ khóa ngắn hơn. Tìm kiếm không phân biệt dấu."
                : filterTu === "yeu-thich"
                  ? "Nhấn ♥ cạnh một từ để thêm vào yêu thích."
                  : "Chọn bộ lọc khác để xem thêm từ."
            }
            action="Xem tất cả từ"
            onAction={() => {
              setOTimKiem("");
              capNhatBoLoc({ filter: "tat-ca", tuKhoa: "" });
            }}
          />
        ) : (
          <ul ref={listTuRef} className={`ui-card-list ui-card-list--deck-detail${dangBatChinhSua ? " ui-card-list--editing" : ""}`}>
            {danhSachDaLoc.map((the, i) => {
              const dangYeuThich = laTuYeuThich(the);

              return (
                <li
                  key={the.id}
                  data-card-id={the.id}
                  className={`ui-reading-card ui-word-row border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-4 py-3.5 ${dangBatChinhSua ? "ui-word-row--editing" : ""} ${dangChoMoveTu ? "ui-word-row--move" : ""} ${theDangKeoId === the.id ? "ui-word-row--dragging" : ""}${!dangBatChinhSua ? " ui-word-row--clickable" : ""}`}
                  onClick={dangBatChinhSua ? (e) => {
                    if (e.target.closest("button")) return;
                    moFormSuaTu(the);
                  } : (e) => {
                    if (e.target.closest("button")) return;
                    setChiTietTu(the);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="ui-word-row__inner">
                    <div className="ui-word-main">
                      {dangChoMoveTu && (
                        <button
                          type="button"
                          disabled={dangLuuThuTu}
                          onPointerDown={(event) => batDauKeoTu(event, the)}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowUp") diChuyenTuBangPhim(event, the, -1);
                            if (event.key === "ArrowDown") diChuyenTuBangPhim(event, the, 1);
                          }}
                          aria-label={`Di chuyển ${the.term_en}`}
                          title={dangLuuThuTu ? "Đang lưu thứ tự" : "Giữ và kéo để đổi thứ tự"}
                          className="ui-word-move-handle"
                        >
                          <IconGrip />
                        </button>
                      )}
                      <span className="ui-word-index">
                        {i + 1}
                      </span>
                      <div className={`ui-word-pair${dangBatChinhSua ? " ui-word-pair--editing" : ""}`}>
                        <div className="flex items-center gap-1 w-full min-w-0">
                          <span className="ui-word-card ui-word-card--term flex-1">
                            {the.term_en}
                          </span>
                          <button
                            type="button"
                            className={`tts-speaker-btn${ttsDangDoc && currentPlayingWordId === the.id ? " tts-speaker-btn--active" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentPlayingWordId(the.id);
                              ttsSpeak(the.term_en, "en-US");
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            aria-label={`Đọc ${the.term_en}`}
                            title="Đọc từ vựng"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                          </button>
                        </div>
                        {dangBatChinhSua && (
                          <button
                            type="button"
                            onClick={() => hoiDoiNghiaTrongThe(the)}
                            title="Hoán đổi từ ↔ nghĩa"
                            aria-label={`Hoán đổi "${the.term_en}" và "${the.meaning_vi}"`}
                            className="inline-flex h-6 w-6 flex-shrink-0 self-center items-center justify-center rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chinh)] transition-all hover:border-[var(--mau-chinh)] hover:bg-[var(--mau-mat-hover)] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] active:scale-95"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 7h18M16 3l4 4-4 4" />
                              <path d="M22 17H4M8 21l-4-4 4-4" />
                            </svg>
                          </button>
                        )}
                        <span className="ui-word-card ui-word-card--meaning">
                          {the.meaning_vi}
                        </span>
                      </div>
                    </div>
                    {coTheQuanLy && (
                      <div
                        className={`ui-word-actions ${dangBatChinhSua ? "ui-word-actions--editing" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleYeuThich(the)}
                          aria-pressed={dangYeuThich}
                          aria-label={
                            dangYeuThich
                              ? `Bỏ yêu thích ${the.term_en}`
                              : `Yêu thích ${the.term_en}`
                          }
                          title={dangYeuThich ? "Bỏ yêu thích" : "Yêu thích"}
                          className={`ui-favorite-button ${dangYeuThich ? "ui-favorite-button--active" : ""
                            }`}
                        >
                          <IconHeart filled={dangYeuThich} />
                        </button>
                        {dangBatChinhSua && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moFormSuaTu(the); }}
                              title="Sửa từ"
                              aria-label={`Sửa từ ${the.term_en}`}
                              className="ui-card-action-btn"
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); xoaTu(the.id); }}
                              title="Xóa từ"
                              aria-label={`Xóa từ ${the.term_en}`}
                              className="ui-card-action-btn ui-card-action-btn--danger"
                            >
                              <IconTrash />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {the.example_sentence && (
                    <p className="ui-word-example" lang="en">
                      <span lang="vi" className="not-italic font-medium">Ví dụ: </span>
                      {the.example_sentence}
                    </p>
                  )}

                  {!dangBatChinhSua && (
                    <div className="ui-card-status-row">
                      {(the.correct_count || 0) === 0 && (
                        <span className="ui-card-badge ui-card-badge--new">Mới</span>
                      )}
                      {(the.correct_count || 0) > 0 && (the.correct_count || 0) < 5 && (
                        <span className="ui-card-badge ui-card-badge--progress">
                          {the.correct_count}/5
                        </span>
                      )}
                      {(the.correct_count || 0) >= 5 && (
                        <span className="ui-card-badge ui-card-badge--learned">✓ Đã học</span>
                      )}
                      {(the.wrong_count || 0) > 0 && (
                        <span className="ui-card-badge ui-card-badge--wrong">
                          {the.wrong_count} sai
                        </span>
                      )}
                    </div>
                  )}

                </li>
              );
            })}
          </ul>
        )}
      </div>

      {banSaoKeoTu && (
        <div
          ref={banSaoKeoTuRef}
          className="ui-word-drag-preview"
          style={{
            left: `${banSaoKeoTu.x}px`,
            top: 0,
            width: `${banSaoKeoTu.width}px`,
            minHeight: `${banSaoKeoTu.height}px`,
            transform: `translate3d(0, ${banSaoKeoTu.y}px, 0) scale(1.012)`,
          }}
          aria-hidden="true"
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mau-vien)] bg-[var(--mau-input)] text-xs font-semibold text-[var(--mau-chinh)]">
            <IconGrip />
          </span>
          <span className="ui-word-drag-preview__pair">
            <span className="ui-word-card ui-word-card--term">
              {banSaoKeoTu.term_en}
            </span>
            <span className="ui-word-card ui-word-card--meaning">
              {banSaoKeoTu.meaning_vi}
            </span>
          </span>
        </div>
      )}

      <AnimatedModal
        open={dangMoForm}
        onClose={dongFormTu}
        className="ui-form-panel max-w-lg shadow-[var(--bong-modal)]"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
              Từ vựng
            </p>
            <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
              {theDangSua ? "Sửa từ" : "Thêm từ"}
            </h3>
          </div>
          <button
            type="button"
            onClick={dongFormTu}
            className="ui-button ui-button--ghost rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            Đóng
          </button>
        </div>

        <form onSubmit={luuTu} className="space-y-4">
          <div className="flex items-stretch gap-2">
            <div className="ui-word-input-card flex-1 min-w-0">
              <label htmlFor="word" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                Từ vựng
              </label>
              <input
                id="word"
                name="word"
                value={formTu.word}
                onChange={capNhatFormTu}
                onKeyDown={xuLyPhimNhapTu}
                required
                autoFocus
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="example"
              />
            </div>

            <div className="flex items-center justify-center flex-shrink-0 pt-6">
              <button
                type="button"
                onClick={hoiDoiTu}
                title="Hoán đổi từ vựng và nghĩa"
                aria-label="Hoán đổi từ vựng và nghĩa"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chinh)] shadow-sm transition-all hover:border-[var(--mau-chinh)] hover:bg-[var(--mau-mat-hover)] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7h18M16 3l4 4-4 4" />
                  <path d="M22 17H4M8 21l-4-4 4-4" />
                </svg>
              </button>
            </div>

            <div className="ui-word-input-card flex-1 min-w-0">
              <label htmlFor="meaning" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                Ý nghĩa
              </label>
              <input
                ref={meaningInputRef}
                id="meaning"
                name="meaning"
                value={formTu.meaning}
                onChange={capNhatFormTu}
                onKeyDown={xuLyPhimNhapTu}
                required
                className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                placeholder="nghĩa tiếng Việt"
              />
            </div>
          </div>

          <div>
            <label htmlFor="example" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
              Câu ví dụ tiếng Anh (tuỳ chọn)
            </label>
            <textarea
              id="example"
              name="example"
              value={formTu.example}
              onChange={capNhatFormTu}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="I study English every day."
              aria-describedby="example-help"
            />
            <p id="example-help" className="mt-2 text-sm text-[var(--mau-chu-phu)]">Dùng hiện tại đơn, hiện tại tiếp diễn hoặc quá khứ đơn. Ví dụ: I am studying English now.</p>
          </div>

          <div className="ui-form-actions">
            <button
              type="button"
              onClick={dongFormTu}
              className="ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={dangLuuTu}
              className="ui-button ui-button--primary w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              {theDangSua ? "Lưu thay đổi" : "Thêm từ"}
            </button>
          </div>
        </form>
      </AnimatedModal>

      <AnimatedModal
        open={dangMoImport}
        onClose={dongFormImport}
        className="ui-form-panel max-w-xl shadow-[var(--bong-modal)]"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
              Thêm nhanh
            </p>
            <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
              Thêm nhiều từ
            </h3>
          </div>
          <button
            type="button"
            onClick={dongFormImport}
            className="ui-button ui-button--ghost rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            Đóng
          </button>
        </div>

        {dangMoImport && (
          <NhapNhanhTu
            danhSachHienCo={danhSach}
            dangLuu={dangLuuTu}
            onNhap={nhapTuNhanh}
            onHuy={dongFormImport}
          />
        )}
      </AnimatedModal>
      <AnimatedModal
        open={!!dangXacNhanXoa}
        onClose={() => setDangXacNhanXoa(null)}
        className="ui-form-panel max-w-[320px] shadow-[var(--bong-modal)] p-0 overflow-hidden border-none"
      >
        <div className="flex flex-col">
          {/* Accent Header */}
          <div className="h-1.5 w-full bg-[var(--mau-loi)] opacity-80" />
          
          <div className="p-6 text-center">
            {/* Soft Icon Backdrop */}
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--mau-loi)]/10 flex items-center justify-center text-[var(--mau-loi)] mb-4">
              <IconTrash />
            </div>

            <h3 className="text-xl font-bold text-[var(--mau-chu)] mb-8">
              Xóa từ này?
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDangXacNhanXoa(null)}
                className="ui-button ui-button--ghost py-3 rounded-xl border border-[var(--mau-vien)] text-sm font-semibold text-[var(--mau-chu-phu)] hover:bg-[var(--mau-mat-hover)] transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={thucHienXoaTu}
                className="ui-button ui-button--danger py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.95]"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        open={successInfo.open}
        onClose={() => { }}
        className="ui-feedback-simple max-w-[180px] rounded-full bg-[var(--mau-chinh)] py-3 shadow-xl border-none"
      >
        <div className="flex items-center justify-center gap-2 text-[var(--mau-chu-tren-chinh)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-bold text-sm tracking-tight">{successInfo.message}</span>
        </div>
      </AnimatedModal>

      {/* Modal chi tiết từ */}
      <AnimatedModal
        open={!!chiTietTu}
        onClose={() => setChiTietTu(null)}
        className="ui-form-panel max-w-md shadow-[var(--bong-modal)] p-0 overflow-hidden"
      >
        {chiTietTu && (
          <div className="flex flex-col">
            {/* Header gradient */}
            <div style={{
              background: "linear-gradient(135deg, var(--mau-chinh) 0%, color-mix(in srgb, var(--mau-chinh) 70%, #7c3aed) 100%)",
              padding: "1.25rem 1.5rem 1rem",
              position: "relative",
            }}>
              {/* Số thứ tự */}
              <span style={{
                position: "absolute",
                top: "0.75rem",
                left: "1rem",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}>
                Từ vựng
              </span>
              {/* Nút sửa góc trên phải */}
              {coTheQuanLy && (
                <button
                  type="button"
                  onClick={() => {
                    const tuCanSua = chiTietTu;
                    setChiTietTu(null);
                    setTimeout(() => {
                      if (!dangChinhSua) setDangChinhSua(true);
                      setTimeout(() => moFormSuaTu(tuCanSua), 80);
                    }, 180);
                  }}
                  aria-label={`Sửa từ ${chiTietTu.term_en}`}
                  title="Sửa từ này"
                  style={{
                    position: "absolute",
                    top: "0.6rem",
                    right: "0.6rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    color: "#fff",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "background 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.32)"; e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <IconEdit />
                </button>
              )}
              {/* Từ chính */}
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "1.7rem",
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    wordBreak: "break-word",
                  }}>
                    {chiTietTu.term_en}
                  </span>
                  <button
                    type="button"
                    onClick={() => ttsSpeak(chiTietTu.term_en, "en-US")}
                    aria-label={`Đọc ${chiTietTu.term_en}`}
                    title="Nghe phát âm"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.35)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  </button>
                </div>
                <p style={{
                  fontSize: "1.05rem",
                  color: "rgba(255,255,255,0.85)",
                  marginTop: "0.35rem",
                  fontWeight: 500,
                }}>
                  {chiTietTu.meaning_vi}
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Câu ví dụ */}
              {chiTietTu.example_sentence && (
                <div style={{
                  background: "var(--mau-input)",
                  borderRadius: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderLeft: "3px solid var(--mau-chinh)",
                }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mau-chinh)", marginBottom: "0.4rem" }}>Ví dụ</p>
                  <p style={{ fontSize: "0.92rem", color: "var(--mau-chu)", lineHeight: 1.6, fontStyle: "italic" }} lang="en">{chiTietTu.example_sentence}</p>
                </div>
              )}

              {/* Trạng thái học */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--mau-chu-phu)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tiến độ:</span>
                {(chiTietTu.correct_count || 0) === 0 && (
                  <span className="ui-card-badge ui-card-badge--new">Chưa học</span>
                )}
                {(chiTietTu.correct_count || 0) > 0 && (chiTietTu.correct_count || 0) < 5 && (
                  <span className="ui-card-badge ui-card-badge--progress">
                    Đang học · {chiTietTu.correct_count}/5
                  </span>
                )}
                {(chiTietTu.correct_count || 0) >= 5 && (
                  <span className="ui-card-badge ui-card-badge--learned">✓ Đã học</span>
                )}
                {(chiTietTu.wrong_count || 0) > 0 && (
                  <span className="ui-card-badge ui-card-badge--wrong">{chiTietTu.wrong_count} lần sai</span>
                )}
                {laTuYeuThich(chiTietTu) && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.25rem",
                    fontSize: "0.72rem", fontWeight: 600, color: "oklch(51% 0.15 24)",
                    background: "oklch(51% 0.15 24 / 0.1)", borderRadius: "9999px",
                    padding: "0.15rem 0.6rem",
                  }}>
                    ♥ Yêu thích
                  </span>
                )}
              </div>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setChiTietTu(null)}
                style={{
                  marginTop: "0.25rem",
                  width: "100%",
                  padding: "0.65rem",
                  borderRadius: "0.65rem",
                  border: "1.5px solid var(--mau-vien)",
                  background: "var(--mau-mat)",
                  color: "var(--mau-chu-phu)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--mau-mat-hover)"; e.currentTarget.style.color = "var(--mau-chu)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--mau-mat)"; e.currentTarget.style.color = "var(--mau-chu-phu)"; }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>


    </div>
  );
}

function IconEdit() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function TrangChiTietBoWrapper() {
  const { deckId } = useParams();
  return <TrangChiTietBo key={deckId} />;
}

export default TrangChiTietBoWrapper;
