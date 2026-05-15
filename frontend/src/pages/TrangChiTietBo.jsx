import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AnimatedModal from "../components/common/AnimatedModal";
import ToastMessage from "../components/common/ToastMessage";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import {
  laTuMoiThem,
  laTuYeuThich,
} from "../data/duLieuMau";
import { layDeckTheoId } from "../services/deckApi";
import {
  capNhatCard,
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

function NutIconQuanLyTu({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ui-icon-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
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
  const { navigateWithLoading } = usePageTransition();
  const { isAuthenticated, user } = useAuth();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSach, setDanhSach] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [dangLuuTu, setDangLuuTu] = useState(false);
  const [dangMoForm, setDangMoForm] = useState(false);
  const [theDangSua, setTheDangSua] = useState(null);
  const [formTu, setFormTu] = useState(FORM_TU_RONG);
  const [dangMoImport, setDangMoImport] = useState(false);
  const [noiDungImport, setNoiDungImport] = useState("");
  const [ketQuaImport, setKetQuaImport] = useState(null);
  const [toast, setToast] = useState("");
  const [filterTu, setFilterTu] = useState("tat-ca");
  const [dangXacNhanXoa, setDangXacNhanXoa] = useState(null); // id của từ đang chờ xóa
  const [successInfo, setSuccessInfo] = useState({ open: false, message: "" });

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
    setDangMoImport(false);
    setNoiDungImport("");
    setKetQuaImport(null);
    setFilterTu("tat-ca");
    setDangXacNhanXoa(null);
    taiDuLieuBo();
  }, [boId]);

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
      setToast("Chỉ có thể sửa bộ từ của bạn");
    }

    return false;
  }

  function moFormThemTu() {
    if (!yeuCauQuyenChinhSua()) return;

    setTheDangSua(null);
    setFormTu(FORM_TU_RONG);
    setDangMoForm(true);
  }

  function moFormSuaTu(the) {
    if (!yeuCauQuyenChinhSua()) return;

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
    if (!yeuCauQuyenChinhSua()) return;

    setNoiDungImport("");
    setKetQuaImport(null);
    setDangMoImport(true);
  }

  function dongFormImport() {
    setDangMoImport(false);
  }

  function capNhatFormTu(event) {
    const { name, value } = event.target;
    setFormTu((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  async function luuTu(event) {
    event.preventDefault();

    if (!yeuCauQuyenChinhSua()) return;

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
      setToast(error.message);
    } finally {
      setDangLuuTu(false);
    }
  }

  async function importTu(event) {
    event.preventDefault();

    if (!yeuCauQuyenChinhSua()) return;

    const cacDong = noiDungImport.split(/\r?\n/);
    const danhSachHopLe = [];
    let soDongBoQua = 0;

    cacDong.forEach((dong) => {
      if (!dong.trim()) return;

      const ketQua = parseDongImport(dong);
      if (!ketQua) {
        soDongBoQua += 1;
        return;
      }

      danhSachHopLe.push(ketQua);
    });

    if (danhSachHopLe.length === 0) {
      setToast("Không có từ hợp lệ");
      return;
    }

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

      setDanhSach((hienTai) => [...ketQua.cards, ...hienTai]);

    setNoiDungImport("");
    setKetQuaImport(null);
    setDangMoImport(false);
    showSuccess(`Đã thêm ${danhSachHopLe.length} từ`);
    } catch (error) {
      setToast(error.message);
    }
  }

  function xoaTu(id) {
    if (!yeuCauQuyenChinhSua()) return;

    setDangXacNhanXoa(id);
  }

  async function thucHienXoaTu() {
    if (!dangXacNhanXoa) return;
    if (!yeuCauQuyenChinhSua()) return;

    try {
      await xoaCard(dangXacNhanXoa);
      setDanhSach((hienTai) => hienTai.filter((the) => the.id !== dangXacNhanXoa));
      setDangXacNhanXoa(null);
    showSuccess("Đã xóa");
    } catch (error) {
      setToast(error.message);
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
      setToast(error.message);
      return;
    }
    setToast(yeuThichMoi ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích");
  }

  if (dangTaiDuLieu) {
    return (
      <div className="ui-empty-panel border-dashed">
        <p className="text-[var(--mau-chu-phu)]">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (loiTaiDuLieu) {
    return (
      <div className="ui-empty-panel border-dashed">
        <p className="font-medium text-[var(--mau-chu)] mb-2">
          Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
        </p>
        <button
          type="button"
          onClick={taiDuLieuBo}
          className="ui-button ui-button--ghost rounded-lg border border-[var(--mau-vien)] px-4 py-2 text-sm"
        >
          Thử lại
        </button>
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

  const soTu = danhSach.length;
  const danhSachDaLoc = locDanhSachTu(danhSach);
  const soTuYeuThich = danhSach.filter(laTuYeuThich).length;
  const soTuMoiThem = danhSach.filter(laTuMoiThem).length;
  const streak = bo.streak ?? 0;
  const coTheQuiz = soTu >= 4;
  const coTheQuanLy = coQuyenQuanLyBo();

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
        <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat)]">
          <p className="ui-stat-label mb-1">
            Streak
          </p>
          <p className="ui-stat-value text-[var(--mau-chu)]">
            {streak > 0 ? streak : "-"}
          </p>
        </div>
      </div>

      <div className="ui-action-grid">
        <Link
          to={`/decks/${boId}/flashcard`}
          className="ui-action-card flex min-h-14 items-center justify-center border border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/5 rounded-xl px-4 py-4 hover:bg-[var(--mau-chinh)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          <span className="font-semibold text-[var(--mau-chinh)]">Học Flashcard</span>
        </Link>

        {coTheQuiz ? (
          <Link
            to={`/decks/${boId}/quiz`}
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
          to={`/decks/${boId}/tu-luan`}
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
            <div className="ui-control-cluster">
              <NutIconQuanLyTu label="Thêm từ" onClick={moFormThemTu}>
                <IconPlus />
              </NutIconQuanLyTu>
              <NutIconQuanLyTu label="Import từ" onClick={moFormImport}>
                <IconUpload />
              </NutIconQuanLyTu>
            </div>
          )}
        </div>

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
                aria-pressed={filterTu === filter.key}
                className="ui-filter-tab"
              >
                <span>{filter.label}</span>
                <span className="ui-filter-tab__count">{soLuong}</span>
              </button>
            );
          })}
        </div>

        {danhSach.length === 0 ? (
          <div className="ui-empty-panel border-dashed">
            <p className="text-[var(--mau-chu-phu)]">Chưa có từ nào.</p>
            {coTheQuanLy && (
              <button
                type="button"
                onClick={moFormThemTu}
                className="ui-link mt-3 text-sm text-[var(--mau-chinh)] hover:underline"
              >
                + Thêm từ vựng đầu tiên
              </button>
            )}
          </div>
        ) : danhSachDaLoc.length === 0 ? (
          <div className="ui-empty-panel border-dashed">
            <p className="text-[var(--mau-chu-phu)]">
              Chưa có từ phù hợp với bộ lọc này.
            </p>
          </div>
        ) : (
          <ul className="ui-card-list">
            {danhSachDaLoc.map((the, i) => {
              const dangYeuThich = laTuYeuThich(the);

              return (
                <li
                  key={the.id}
                  className="ui-reading-card border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-4 py-3.5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex flex-wrap items-baseline gap-2 sm:gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mau-vien)] bg-[var(--mau-input)] text-xs font-semibold text-[var(--mau-chinh)]">
                        {i + 1}
                      </span>
                      <span className="break-words font-semibold text-[var(--mau-chu)]">
                        {the.term_en}
                      </span>
                      <span className="hidden sm:inline text-[var(--mau-vien)] shrink-0">-</span>
                      <span className="break-words text-[var(--mau-chu)]">
                        {the.meaning_vi}
                      </span>
                    </div>
                    {coTheQuanLy && (
                      <div className="flex shrink-0 items-center gap-2">
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
                        <NutIconQuanLyTu
                          label={`Sửa từ ${the.term_en}`}
                          onClick={() => moFormSuaTu(the)}
                        >
                          <IconEdit />
                        </NutIconQuanLyTu>
                        <NutIconQuanLyTu
                          label={`Xóa từ ${the.term_en}`}
                          onClick={() => xoaTu(the.id)}
                        >
                          <IconTrash />
                        </NutIconQuanLyTu>
                      </div>
                    )}
                  </div>

                  {the.example_sentence && (
                    <p className="text-sm text-[var(--mau-chu-phu)] mt-1.5 ml-8 italic">
                      {the.example_sentence}
                    </p>
                  )}

                </li>
              );
            })}
          </ul>
        )}
      </div>

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
          <div>
            <label htmlFor="word" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
              Word
            </label>
            <input
              id="word"
              name="word"
              value={formTu.word}
              onChange={capNhatFormTu}
              required
              className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="example"
            />
          </div>

          <div>
            <label htmlFor="meaning" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
              Meaning
            </label>
            <input
              id="meaning"
              name="meaning"
              value={formTu.meaning}
              onChange={capNhatFormTu}
              required
              className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
              placeholder="nghĩa tiếng Việt"
            />
          </div>

          <div>
            <label htmlFor="example" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
              Example (optional)
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

      <ToastMessage message={toast} onDone={() => setToast("")} />
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

export default TrangChiTietBo;
