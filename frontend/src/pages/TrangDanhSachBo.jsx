import { useEffect, useState } from "react";
import AnimatedModal from "../components/common/AnimatedModal";
import ToastMessage from "../components/common/ToastMessage";
import { useAuth } from "../contexts/AuthContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import { layTienDoDeck } from "../utils/tienDoHocTap";
import {
  capNhatDeck,
  layDanhSachDeck,
  taoDeck,
  xoaDeck,
} from "../services/deckApi";

const FORM_BO_RONG = {
  name: "",
  description: "",
};

function chuanHoaTenBo(name) {
  return String(name || "").trim().toLocaleLowerCase("vi-VN");
}

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

function IconMoreVertical() {
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
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function TrangDanhSachBo() {
  const { navigateWithLoading } = usePageTransition();
  const { isAuthReady, isAuthenticated, user } = useAuth();
  const [danhSachDeck, setDanhSachDeck] = useState([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [loiTaiDecks, setLoiTaiDecks] = useState("");
  const [dangLuuBo, setDangLuuBo] = useState(false);
  const [dangMoForm, setDangMoForm] = useState(false);
  const [boDangSua, setBoDangSua] = useState(null);
  const [boDangXoa, setBoDangXoa] = useState(null);
  const [dangXoaBo, setDangXoaBo] = useState(false);
  const [menuBoDangMo, setMenuBoDangMo] = useState(null);
  const [formBo, setFormBo] = useState(FORM_BO_RONG);
  const [loiFormBo, setLoiFormBo] = useState("");
  const [toast, setToast] = useState("");

  async function taiDanhSachDeck() {
    setIsLoadingDecks(true);
    setLoiTaiDecks("");

    try {
      const decks = await layDanhSachDeck();
      setDanhSachDeck(decks);
    } catch (error) {
      setLoiTaiDecks(error.message);
    } finally {
      setIsLoadingDecks(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady) return;

    taiDanhSachDeck();
  }, [isAuthReady, isAuthenticated, user?.id]);

  useEffect(() => {
    if (menuBoDangMo === null) return undefined;

    function dongMenuDangMo() {
      setMenuBoDangMo(null);
    }

    function dongMenuBangEscape(event) {
      if (event.key === "Escape") {
        setMenuBoDangMo(null);
      }
    }

    document.addEventListener("click", dongMenuDangMo);
    document.addEventListener("keydown", dongMenuBangEscape);

    return () => {
      document.removeEventListener("click", dongMenuDangMo);
      document.removeEventListener("keydown", dongMenuBangEscape);
    };
  }, [menuBoDangMo]);

  function laBoCuaUser(bo) {
    return (
      isAuthenticated &&
      bo.user_id !== null &&
      String(bo.user_id) === String(user?.id)
    );
  }

  function chuyenSangDangNhap() {
    navigateWithLoading("/login", { state: { from: { pathname: "/decks" } } });
  }

  function moFormThemBo() {
    if (!isAuthenticated) {
      chuyenSangDangNhap();
      return;
    }

    setBoDangSua(null);
    setFormBo(FORM_BO_RONG);
    setLoiFormBo("");
    setDangMoForm(true);
  }

  function moFormSuaBo(bo) {
    if (!laBoCuaUser(bo)) {
      setToast("Chỉ có thể sửa bộ từ của bạn");
      return;
    }

    setBoDangSua(bo);
    setFormBo({
      name: bo.title,
      description: bo.description || "",
    });
    setLoiFormBo("");
    setDangMoForm(true);
  }

  function toggleMenuBo(event, boId) {
    event.stopPropagation();
    setMenuBoDangMo((hienTai) =>
      String(hienTai ?? "") === String(boId) ? null : boId
    );
  }

  function chonSuaBo(event, bo) {
    event.stopPropagation();
    setMenuBoDangMo(null);
    moFormSuaBo(bo);
  }

  function chonXoaBo(event, bo) {
    event.stopPropagation();
    setMenuBoDangMo(null);
    moXacNhanXoaBo(bo);
  }

  function moXacNhanXoaBo(bo) {
    if (!laBoCuaUser(bo)) {
      setToast("Chỉ có thể xóa bộ từ của bạn");
      return;
    }

    setBoDangXoa(bo);
  }

  function dongFormBo() {
    setDangMoForm(false);
    setLoiFormBo("");
  }

  function dongXacNhanXoaBo() {
    if (dangXoaBo) return;
    setBoDangXoa(null);
  }

  function capNhatFormBo(event) {
    const { name, value } = event.target;
    setLoiFormBo("");
    setFormBo((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  async function luuBo(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      chuyenSangDangNhap();
      return;
    }

    const name = formBo.name.trim();
    const description = formBo.description.trim();

    if (!name) return;

    const tenDaTonTai = danhSachDeck.some(
      (bo) =>
        chuanHoaTenBo(bo.title) === chuanHoaTenBo(name) &&
        String(bo.id) !== String(boDangSua?.id ?? "")
    );

    if (tenDaTonTai) {
      setLoiFormBo("Bạn đã có bộ từ với tên này");
      return;
    }

    setDangLuuBo(true);

    try {
      if (boDangSua) {
        const deckDaLuu = await capNhatDeck(boDangSua.id, {
          title: name,
          description,
        });

        setDanhSachDeck((hienTai) =>
          hienTai.map((bo) => (bo.id === boDangSua.id ? deckDaLuu : bo))
        );
      } else {
        const deckMoi = await taoDeck({
          title: name,
          description,
        });

        setDanhSachDeck((hienTai) => [deckMoi, ...hienTai]);
      }

      setToast(boDangSua ? "Đã lưu thay đổi bộ từ" : "Đã thêm bộ từ mới");
      dongFormBo();
    } catch (error) {
      if (error.status === 409) {
        setLoiFormBo("Bạn đã có bộ từ với tên này");
        return;
      }

      setToast(error.message);
    } finally {
      setDangLuuBo(false);
    }
  }

  async function thucHienXoaBo() {
    if (!boDangXoa) return;

    setDangXoaBo(true);

    try {
      await xoaDeck(boDangXoa.id);
      setDanhSachDeck((hienTai) =>
        hienTai.filter((bo) => String(bo.id) !== String(boDangXoa.id))
      );
      setToast("Đã xóa bộ từ");
      setBoDangXoa(null);
    } catch (error) {
      setToast(error.message);
    } finally {
      setDangXoaBo(false);
    }
  }

  function moChiTietBo(boId) {
    navigateWithLoading(`/decks/${boId}`);
  }

  function xuLyPhimCard(event, boId) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, a, input, textarea, select")) return;

    event.preventDefault();
    moChiTietBo(boId);
  }

  const tieuDeTrang = "Bộ từ vựng của bạn";
  const tieuDeRong = isAuthenticated
    ? "Bạn chưa có bộ từ nào"
    : "Bạn cần đăng nhập để xem bộ từ";
  const moTaRong = isAuthenticated
    ? "Tạo bộ từ đầu tiên để bắt đầu học."
    : "Mỗi tài khoản có danh sách bộ từ riêng.";

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
            {tieuDeTrang}
          </h2>
        </div>
        <div className="ui-page-header__actions">
          <button
            type="button"
            onClick={moFormThemBo}
            aria-label="Thêm bộ từ"
            title="Thêm bộ từ"
            className="ui-icon-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          >
            <IconPlus />
          </button>
        </div>
      </div>

      {isLoadingDecks ? (
        <div className="ui-empty-panel border-dashed">
          <p className="text-[var(--mau-chu-phu)]">Đang tải dữ liệu...</p>
        </div>
      ) : loiTaiDecks ? (
        <div className="ui-empty-panel border-dashed">
          <p className="font-medium text-[var(--mau-chu)] mb-2">
            Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
          </p>
          <button
            type="button"
            onClick={taiDanhSachDeck}
            className="ui-button ui-button--ghost rounded-lg border border-[var(--mau-vien)] px-4 py-2 text-sm"
          >
            Thử lại
          </button>
        </div>
      ) : danhSachDeck.length === 0 ? (
        <div className="ui-empty-panel border-dashed">
          <p className="font-medium text-[var(--mau-chu)] mb-1">
            {tieuDeRong}
          </p>
          <p className="text-sm text-[var(--mau-chu-phu)] mb-4">
            {moTaRong}
          </p>
          <button
            type="button"
            onClick={moFormThemBo}
            aria-label="Thêm bộ từ"
            title="Thêm bộ từ"
            className="ui-icon-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          >
            <IconPlus />
          </button>
        </div>
      ) : (
        <ul className="ui-content-enter ui-deck-grid">
          {danhSachDeck.map((bo) => {
            const soThe = bo.card_count ?? 0;
            const tienDo = bo.latest_quiz ? { quiz: bo.latest_quiz } : layTienDoDeck(bo.id);

            return (
              <li
                key={bo.id}
                role="link"
                tabIndex={0}
                onClick={() => moChiTietBo(bo.id)}
                onKeyDown={(event) => xuLyPhimCard(event, bo.id)}
                className="ui-card-interactive ui-deck-card group cursor-pointer rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-4 shadow-[var(--bong-card)] outline-none transition-colors hover:border-[var(--mau-chinh)]/55 hover:bg-[var(--mau-mat-hover)] focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] sm:px-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 pt-0.5">
                    <h3 className="truncate text-[1.03rem] font-semibold leading-6 text-[var(--mau-chu)] transition-colors group-hover:text-[var(--mau-chinh)]">
                      {bo.title}
                    </h3>
                    {bo.description && (
                      <p className="ui-deck-card__description mt-1 text-sm leading-6 text-[var(--mau-chu-phu)]">
                        {bo.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {bo.streak > 0 && (
                      <span className="ui-chip ui-chip--warning ui-chip--small">
                        {bo.streak} streak
                      </span>
                    )}
                    {laBoCuaUser(bo) && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => toggleMenuBo(event, bo.id)}
                          aria-label={`Mở menu bộ ${bo.title}`}
                          aria-haspopup="menu"
                          aria-expanded={String(menuBoDangMo) === String(bo.id)}
                          title="Tùy chọn"
                          className="ui-button ui-button--ghost inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                        >
                          <IconMoreVertical />
                        </button>

                        {String(menuBoDangMo) === String(bo.id) && (
                          <div
                            role="menu"
                            aria-label={`Tùy chọn bộ ${bo.title}`}
                            onClick={(event) => event.stopPropagation()}
                            className="ui-deck-action-menu absolute left-0 top-11 z-20 w-36 overflow-hidden rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-1 shadow-[var(--bong-modal)]"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => chonSuaBo(event, bo)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--mau-chu)] transition-colors hover:bg-[var(--mau-mat-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)]"
                            >
                              <IconEdit />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => chonXoaBo(event, bo)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--mau-loi)] transition-colors hover:bg-[var(--mau-loi)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-loi)]"
                            >
                              <IconTrash />
                              <span>Xóa</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="ui-chip-row mt-3 border-t border-[var(--mau-vien)]/60 pt-3">
                  <span className="ui-chip ui-chip--primary ui-chip--small">
                    {soThe} từ
                  </span>
                  {tienDo?.quiz && (
                    <span className="ui-chip ui-chip--muted ui-chip--small">
                      Quiz gần nhất: {tienDo.quiz.correct}/{tienDo.quiz.total}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatedModal
        open={dangMoForm}
        onClose={dongFormBo}
        className="ui-form-panel max-w-lg shadow-[var(--bong-modal)]"
      >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Bộ từ
                </p>
                <h3 className="text-xl font-semibold text-[var(--mau-chu)]">
                  {boDangSua ? "Sửa bộ" : "Thêm bộ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={dongFormBo}
                className="ui-button ui-button--ghost rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={luuBo} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={formBo.name}
                  onChange={capNhatFormBo}
                  required
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="Tên bộ từ"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--mau-chu)] mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formBo.description}
                  onChange={capNhatFormBo}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="Mô tả ngắn"
                />
              </div>

              {loiFormBo && (
                <p
                  role="alert"
                  className="rounded-lg border border-[var(--mau-loi)]/30 bg-[var(--mau-loi)]/10 px-3 py-2 text-sm font-medium text-[var(--mau-loi)]"
                >
                  {loiFormBo}
                </p>
              )}

              <div className="ui-form-actions">
                <button
                  type="button"
                  onClick={dongFormBo}
                  className="ui-button ui-button--ghost w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={dangLuuBo}
                  className="ui-button ui-button--primary w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  {boDangSua ? "Lưu thay đổi" : "Thêm bộ"}
                </button>
              </div>
            </form>
      </AnimatedModal>
      <AnimatedModal
        open={!!boDangXoa}
        onClose={dongXacNhanXoaBo}
        className="ui-form-panel max-w-[340px] shadow-[var(--bong-modal)] p-0 overflow-hidden border-none"
      >
        <div className="flex flex-col">
          <div className="h-1.5 w-full bg-[var(--mau-loi)] opacity-80" />

          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mau-loi)]/10 text-[var(--mau-loi)]">
              <IconTrash />
            </div>

            <h3 className="mb-2 text-xl font-bold text-[var(--mau-chu)]">
              Xóa bộ từ này?
            </h3>
            <p className="mb-8 text-sm leading-6 text-[var(--mau-chu-phu)]">
              {boDangXoa?.title}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={dongXacNhanXoaBo}
                disabled={dangXoaBo}
                className="ui-button ui-button--ghost rounded-xl border border-[var(--mau-vien)] py-3 text-sm font-semibold text-[var(--mau-chu-phu)] transition-all hover:bg-[var(--mau-mat-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={thucHienXoaBo}
                disabled={dangXoaBo}
                className="ui-button ui-button--danger rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {dangXoaBo ? "Đang xóa..." : "Xóa ngay"}
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
      <ToastMessage message={toast} onDone={() => setToast("")} />
    </div>
  );
}

export default TrangDanhSachBo;
