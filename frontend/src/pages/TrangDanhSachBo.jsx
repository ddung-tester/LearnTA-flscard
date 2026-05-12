import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnimatedModal from "../components/common/AnimatedModal";
import ToastMessage from "../components/common/ToastMessage";
import { layTienDoDeck } from "../utils/tienDoHocTap";
import {
  capNhatDeck,
  layDanhSachDeck,
  taoDeck,
} from "../services/deckApi";

const FORM_BO_RONG = {
  name: "",
  description: "",
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

function TrangDanhSachBo() {
  const navigate = useNavigate();
  const [danhSachDeck, setDanhSachDeck] = useState([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [loiTaiDecks, setLoiTaiDecks] = useState("");
  const [dangLuuBo, setDangLuuBo] = useState(false);
  const [dangMoForm, setDangMoForm] = useState(false);
  const [boDangSua, setBoDangSua] = useState(null);
  const [formBo, setFormBo] = useState(FORM_BO_RONG);
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
    taiDanhSachDeck();
  }, []);

  function moFormThemBo() {
    setBoDangSua(null);
    setFormBo(FORM_BO_RONG);
    setDangMoForm(true);
  }

  function moFormSuaBo(bo) {
    setBoDangSua(bo);
    setFormBo({
      name: bo.title,
      description: bo.description || "",
    });
    setDangMoForm(true);
  }

  function dongFormBo() {
    setDangMoForm(false);
  }

  function capNhatFormBo(event) {
    const { name, value } = event.target;
    setFormBo((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  async function luuBo(event) {
    event.preventDefault();

    const name = formBo.name.trim();
    const description = formBo.description.trim();

    if (!name) return;

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
      setToast(error.message);
    } finally {
      setDangLuuBo(false);
    }
  }

  function moChiTietBo(boId) {
    navigate(`/decks/${boId}`);
  }

  function xuLyPhimCard(event, boId) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, a, input, textarea, select")) return;

    event.preventDefault();
    moChiTietBo(boId);
  }

  return (
    <div className="ui-page-stack">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
            Bộ từ vựng của bạn
          </h2>
        </div>
        <div className="ui-page-header__actions">
          <button
            type="button"
            onClick={moFormThemBo}
            aria-label="Thêm bộ từ"
            title="Thêm bộ từ"
            className="ui-button ui-button--primary inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
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
            Chưa có bộ từ nào
          </p>
          <p className="text-sm text-[var(--mau-chu-phu)] mb-4">
            Tạo bộ từ đầu tiên để bắt đầu học.
          </p>
          <button
            type="button"
            onClick={moFormThemBo}
            aria-label="Thêm bộ từ"
            title="Thêm bộ từ"
            className="ui-button ui-button--primary inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            <IconPlus />
          </button>
        </div>
      ) : (
        <ul className="ui-content-enter ui-card-list">
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
                className="ui-card-interactive group cursor-pointer rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-4 shadow-[var(--bong-card)] outline-none transition-colors hover:border-[var(--mau-chinh)]/55 hover:bg-[var(--mau-mat-hover)] focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] sm:px-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 pt-0.5">
                    <h3 className="truncate text-[1.03rem] font-semibold leading-6 text-[var(--mau-chu)] transition-colors group-hover:text-[var(--mau-chinh)]">
                      {bo.title}
                    </h3>
                    {bo.description && (
                      <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[var(--mau-chu-phu)]">
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
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        moFormSuaBo(bo);
                      }}
                      aria-label={`Sửa bộ ${bo.title}`}
                      title="Sửa bộ"
                      className="ui-button ui-button--ghost inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                    >
                      <IconEdit />
                    </button>
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
      <ToastMessage message={toast} onDone={() => setToast("")} />
    </div>
  );
}

export default TrangDanhSachBo;
