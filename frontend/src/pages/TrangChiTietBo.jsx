import { useEffect, useLayoutEffect, useRef, useState } from "react";
import StreakBadge from "../components/common/StreakBadge";
import { useParams, Link } from "react-router-dom";
import AnimatedModal from "../components/common/AnimatedModal";
import DeckDetailSkeleton from "../components/common/DeckDetailSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import useTTS from "../hooks/useTTS";
import {
  laTuMoiThem,
  laTuYeuThich,
} from "../data/duLieuMau";
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

const FILTER_TU = [
  { key: "tat-ca", label: "Tất cả" },
  { key: "yeu-thich", label: "Yêu thích" },
  { key: "moi-them", label: "Mới thêm" },
];

const SORT_TU = [
  { key: "mac-dinh", label: "Mặc định" },
  { key: "ten", label: "Theo tên" },
  { key: "ngay-them", label: "Ngày thêm" },
  { key: "so-cau-sai", label: "Số câu sai" },
  { key: "chua-hoc", label: "Chưa học" },
];

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

function NutIconQuanLyTu({ label, onClick, active = false, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`ui-icon-action ${active ? "ui-icon-action--active" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]`}
    >
      {children}
      <span className="ui-action-tooltip">{label}</span>
    </button>
  );
}

function parseDongImport(dong) {
  const noiDung = dong.trim();
  if (!noiDung) return null;

  const match = noiDung.match(/^(.+?)\s*(?:\s-\s|,|\|)\s*(.+)$/);
  if (!match) return null;

  const word = match[1].trim();
  const meaning = match[2].trim();

  if (!word || !meaning) return null;

  return { word, meaning };
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
  const [noiDungImport, setNoiDungImport] = useState("");
  const toast = useToast();
  const [filterTu, setFilterTu] = useState("tat-ca");
  const [sortTu, setSortTu] = useState("mac-dinh");
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

  async function taiDuLieuBo() {
    setDangTaiDuLieu(true);
    setLoiTaiDuLieu("");

    try {
      const [deck, cards] = await Promise.all([
        layDeckTheoId(boId),
        layCardsTheoDeck(boId),
      ]);

      setBo(deck);
      setDanhSach(cards);
    } catch (error) {
      setBo(null);
      setDanhSach([]);
      setLoiTaiDuLieu(error.message);
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    setDangMoForm(false);
    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangChinhSua(false);
    setDangMoImport(false);
    setNoiDungImport("");
    setFilterTu("tat-ca");
    setSortTu("mac-dinh");
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
    setFilterTu("tat-ca");
    setSortTu("mac-dinh");
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

    setNoiDungImport("");
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

  async function importTu(event) {
    event.preventDefault();

    if (dangLuuTu) return;
    if (!yeuCauCheDoChinhSua()) return;

    const cacDong = noiDungImport.split(/\r?\n/);
    const danhSachHopLe = [];

    cacDong.forEach((dong) => {
      if (!dong.trim()) return;

      const ketQua = parseDongImport(dong);
      if (!ketQua) {
        return;
      }

      danhSachHopLe.push(ketQua);
    });

    if (danhSachHopLe.length === 0) {
      toast.warning("Không có từ hợp lệ");
      return;
    }

    setDangLuuTu(true);

    try {
      const ketQua = await importCards(
        boId,
        danhSachHopLe.map((the) => ({
          term_en: the.word,
          meaning_vi: the.meaning,
          example_sentence: "",
          note: "",
        }))
      );

      setDanhSach((hienTai) => [...hienTai, ...ketQua.cards]);

      setNoiDungImport("");
      setDangMoImport(false);
      showSuccess(`Đã thêm ${danhSachHopLe.length} từ`);
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

  function locDanhSachTu(danhSachCanLoc) {
    if (filterTu === "yeu-thich") {
      return danhSachCanLoc.filter(laTuYeuThich);
    }

    if (filterTu === "moi-them") {
      return danhSachCanLoc.filter(laTuMoiThem);
    }

    return danhSachCanLoc;
  }

  function sapXepDanhSachTu(danhSachCanSap) {
    if (sortTu === "mac-dinh") return danhSachCanSap;

    const copy = [...danhSachCanSap];

    if (sortTu === "ten") {
      copy.sort((a, b) =>
        a.term_en.localeCompare(b.term_en, "en", { sensitivity: "base" })
      );
    } else if (sortTu === "ngay-them") {
      copy.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return da - db; // cũ nhất lên đầu
      });
    } else if (sortTu === "so-cau-sai") {
      copy.sort((a, b) => (b.wrong_count || 0) - (a.wrong_count || 0));
    } else if (sortTu === "chua-hoc") {
      // Từ chưa học (correct_count < 5) lên trên, sau đó theo sort_order
      copy.sort((a, b) => {
        const aNew = (a.correct_count || 0) < 5 ? 0 : 1;
        const bNew = (b.correct_count || 0) < 5 ? 0 : 1;
        return aNew - bNew;
      });
    }

    return copy;
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

  const soTu = danhSach.length;
  const danhSachDaLoc = sapXepDanhSachTu(locDanhSachTu(danhSach));
  const soTuYeuThich = danhSach.filter(laTuYeuThich).length;
  const soTuMoiThem = danhSach.filter(laTuMoiThem).length;
  const soTuChuaHoc = danhSach.filter((t) => (t.correct_count || 0) < 5).length;
  const streak = userStreak;
  const coTheQuiz = soTu >= 4;
  const coTheQuanLy = coQuyenQuanLyBo();
  const dangBatChinhSua = dangChinhSua && coTheQuanLy;
  // Chỉ cho kéo thứ tự khi đang ở chế độ sắp xếp mặc định
  const dangChoMoveTu = dangBatChinhSua && sortTu === "mac-dinh";

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title ui-deck-detail-header__title">
          <Link
            to="/decks"
            className="ui-back-link ui-back-link--quiet ui-back-link--wide"
          >
            ← Danh sách bộ từ
          </Link>
          <h2 className="ui-deck-detail-header__heading text-2xl font-semibold text-[var(--mau-chu)]">
            {bo.title}
          </h2>
        </div>
      </div>

      <div className="ui-stat-grid">
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">
            Tổng từ
          </p>
          <p className="ui-stat-value text-[var(--mau-chu)]">
            {soTu}
          </p>
        </div>
        {/* Thẻ Streak: 3 trạng thái — cháy (học hôm nay) / đóng băng (chưa học hôm nay) / vỡ (bỏ ≥2 ngày) */}
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



      </div>

      <div className="ui-action-grid">
        <Link
          to={`/decks/${boId}/flashcard?filter=${filterTu}&sort=${sortTu}`}
          className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Học Flashcard</span>
        </Link>

        {coTheQuiz ? (
          <Link
            to={`/decks/${boId}/quiz?filter=${filterTu}&sort=${sortTu}`}
            className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            <span className="font-semibold text-[var(--mau-chinh)]">Làm trắc nghiệm</span>
          </Link>
        ) : (
          <div
            className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-4 cursor-not-allowed opacity-60"
            title="Cần ít nhất 4 từ để làm trắc nghiệm"
          >
            <span className="font-semibold text-[var(--mau-chu-phu)]">Làm trắc nghiệm</span>
          </div>
        )}

        <Link
          to={`/decks/${boId}/tu-luan?filter=${filterTu}&sort=${sortTu}`}
          className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Tự luận</span>
        </Link>

      </div>

      <div className="ui-section-stack">
        <div className="ui-section-header">
          <h3 className="text-sm font-semibold text-[var(--mau-chu)]">
            Từ vựng ({danhSachDaLoc.length}/{soTu})
          </h3>
          {coTheQuanLy && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {dangBatChinhSua ? (
                <>
                  <div className="ui-control-cluster">
                    <NutIconQuanLyTu label="Thêm từ" onClick={moFormThemTu}>
                      <IconPlus />
                    </NutIconQuanLyTu>
                    <NutIconQuanLyTu label="Import từ" onClick={moFormImport}>
                      <IconUpload />
                    </NutIconQuanLyTu>
                  </div>
                  <button
                    type="button"
                    onClick={tatCheDoChinhSua}
                    aria-label="Thoát chế độ sửa"
                    title="Thoát chế độ sửa"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      border: "1.5px solid var(--mau-vien)",
                      background: "var(--mau-mat)",
                      color: "var(--mau-chu-phu)",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 0.15s, color 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "color-mix(in srgb, var(--mau-nguy-hiem, #ef4444) 12%, var(--mau-mat))";
                      e.currentTarget.style.color = "var(--mau-nguy-hiem, #ef4444)";
                      e.currentTarget.style.borderColor = "var(--mau-nguy-hiem, #ef4444)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "var(--mau-mat)";
                      e.currentTarget.style.color = "var(--mau-chu-phu)";
                      e.currentTarget.style.borderColor = "var(--mau-vien)";
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <NutIconQuanLyTu
                  label="Sửa"
                  onClick={batTatCheDoChinhSua}
                  active={false}
                >
                  <IconEdit />
                </NutIconQuanLyTu>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="ui-filter-tabs" aria-label="Lọc từ vựng">
            {FILTER_TU.map((filter) => {
              const soLuong =
                filter.key === "yeu-thich"
                  ? soTuYeuThich
                  : filter.key === "moi-them"
                    ? soTuMoiThem
                    : soTu;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setFilterTu(filter.key)}
                  disabled={dangBatChinhSua}
                  aria-pressed={filterTu === filter.key}
                  className="ui-filter-tab"
                >
                  <span>{filter.label}</span>
                  <span className="ui-filter-tab__count">{soLuong}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <span className="text-xs text-[var(--mau-chu-phu)] font-medium hidden sm:inline">Sắp xếp:</span>
            <select
              value={sortTu}
              onChange={(e) => setSortTu(e.target.value)}
              disabled={dangBatChinhSua}
              aria-label="Sắp xếp từ vựng"
              className="rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-2.5 py-1.5 text-xs font-medium text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] cursor-pointer"
            >
              {SORT_TU.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                  {s.key === "chua-hoc" ? ` (${soTuChuaHoc})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            icon={filterTu === "yeu-thich" ? "favorite" : "search"}
            title={filterTu === "yeu-thich" ? "Chưa có từ yêu thích" : "Không tìm thấy"}
            description={filterTu === "yeu-thich" ? "Nhấn ♥ để đánh dấu từ yêu thích." : "Chưa có từ phù hợp với bộ lọc này."}
          />
        ) : (
          <ul ref={listTuRef} className="ui-card-list">
            {danhSachDaLoc.map((the, i) => {
              const dangYeuThich = laTuYeuThich(the);

              return (
                <li
                  key={the.id}
                  data-card-id={the.id}
                  className={`ui-reading-card ui-word-row border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-4 py-3.5 ${dangBatChinhSua ? "ui-word-row--editing" : ""} ${dangChoMoveTu ? "ui-word-row--move" : ""} ${theDangKeoId === the.id ? "ui-word-row--dragging" : ""}`}
                  onClick={dangBatChinhSua ? (e) => {
                    if (e.target.closest("button")) return;
                    moFormSuaTu(the);
                  } : undefined}
                  style={dangBatChinhSua ? { cursor: "pointer" } : undefined}
                >
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
                  <div className="ui-word-row__inner">
                    <div className="ui-word-main">
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
                          <NutIconQuanLyTu
                            label={`Xóa từ ${the.term_en}`}
                            onClick={(e) => { e.stopPropagation(); xoaTu(the.id); }}
                          >
                            <IconTrash />
                          </NutIconQuanLyTu>
                        )}
                      </div>
                    )}
                  </div>

                  {the.example_sentence && (
                    <p className="ui-word-example">
                      {the.example_sentence}
                    </p>
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
              Ví dụ (tuỳ chọn)
            </label>
            <textarea
              id="example"
              name="example"
              value={formTu.example}
              onChange={capNhatFormTu}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="I use this word in a sentence."
            />
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
        className="ui-form-panel max-w-lg shadow-[var(--bong-modal)]"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
              Import nhanh
            </p>
            <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
              Import từ
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

        <form onSubmit={importTu} className="space-y-4">
          <div>
            <label
              htmlFor="import-tu"
              className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5"
            >
              Danh sách từ
            </label>
            <textarea
              id="import-tu"
              value={noiDungImport}
              onChange={(event) => setNoiDungImport(event.target.value)}
              rows={9}
              className="ui-import-zone w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder={"apple - quả táo\nbook, quyển sách\ncat | con mèo"}
            />
            <p className="mt-2 text-xs text-[var(--mau-chu-phu)]">
              Mỗi dòng một từ. Hỗ trợ: word - meaning, word, meaning, word | meaning.
            </p>
          </div>

          <div className="ui-form-actions">
            <button
              type="button"
              onClick={dongFormImport}
              className="ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="ui-button ui-button--primary w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Import từ
            </button>
          </div>
        </form>
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
