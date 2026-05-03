import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { danhSachBo, layTheoBoId } from "../data/duLieuMau";
import { layTienDoDeck } from "../utils/tienDoHocTap";

const FORM_BO_RONG = {
  name: "",
  description: "",
};

const DS_CHE_DO_HOC = [
  { nhan: "Flashcard" },
  { nhan: "Trắc nghiệm" },
];

const DS_HUONG = [
  { nhan: "EN → VI" },
  { nhan: "VI → EN" },
];

function TrangDanhSachBo() {
  const navigate = useNavigate();
  const [danhSachDeck, setDanhSachDeck] = useState(() => [...danhSachBo]);
  const [dangMoForm, setDangMoForm] = useState(false);
  const [boDangSua, setBoDangSua] = useState(null);
  const [formBo, setFormBo] = useState(FORM_BO_RONG);

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
    setBoDangSua(null);
    setFormBo(FORM_BO_RONG);
  }

  function capNhatFormBo(event) {
    const { name, value } = event.target;
    setFormBo((hienTai) => ({
      ...hienTai,
      [name]: value,
    }));
  }

  function luuBo(event) {
    event.preventDefault();

    const name = formBo.name.trim();
    const description = formBo.description.trim();

    if (!name) return;

    if (boDangSua) {
      setDanhSachDeck((hienTai) =>
        hienTai.map((bo) =>
          bo.id === boDangSua.id
            ? {
                ...bo,
                title: name,
                description,
                updated_at: new Date().toISOString(),
              }
            : bo
        )
      );
    } else {
      const idMoi = Math.max(0, ...danhSachDeck.map((bo) => bo.id)) + 1;
      const thoiDiem = new Date().toISOString();

      setDanhSachDeck((hienTai) => [
        ...hienTai,
        {
          id: idMoi,
          title: name,
          description,
          created_at: thoiDiem,
          updated_at: thoiDiem,
          streak: 0,
          masteredCount: 0,
        },
      ]);
    }

    dongFormBo();
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">
          Bộ từ vựng của bạn
        </h2>
        <button
          type="button"
          onClick={moFormThemBo}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--mau-chinh)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-opacity"
        >
          Thêm bộ
        </button>
      </div>

      {danhSachDeck.length === 0 ? (
        <div className="text-center py-14 px-5 border border-dashed border-[var(--mau-vien)] rounded-xl">
          <p className="font-medium text-[var(--mau-chu)] mb-1">
            Chưa có bộ từ nào
          </p>
          <p className="text-sm text-[var(--mau-chu-phu)] mb-4">
            Tạo bộ từ đầu tiên để bắt đầu học.
          </p>
          <button
            type="button"
            onClick={moFormThemBo}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--mau-chinh)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-opacity"
          >
            Thêm bộ
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {danhSachDeck.map((bo) => {
            const soThe = layTheoBoId(bo.id).length;
            const coTheQuiz = soThe >= 4;
            const tienDo = layTienDoDeck(bo.id);

            return (
              <li
                key={bo.id}
                role="link"
                tabIndex={0}
                onClick={() => moChiTietBo(bo.id)}
                onKeyDown={(event) => xuLyPhimCard(event, bo.id)}
                className="group cursor-pointer rounded-xl border border-[var(--mau-vien)] px-4 py-4 outline-none transition-colors hover:border-[var(--mau-chinh)]/55 hover:bg-[var(--mau-chinh)]/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] sm:px-5 sm:py-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--mau-chu)] group-hover:text-[var(--mau-chinh)] transition-colors truncate">
                      {bo.title}
                    </h3>
                    {bo.description && (
                      <p className="text-sm text-[var(--mau-chu-phu)] mt-0.5">
                        {bo.description}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                    {bo.streak > 0 && (
                      <span className="text-xs font-mono text-[var(--mau-phu)] bg-[var(--mau-phu)]/10 border border-[var(--mau-phu)]/25 px-2 py-0.5 rounded-md">
                        {bo.streak} streak
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        moFormSuaBo(bo);
                      }}
                      className="rounded-md border border-[var(--mau-vien)] px-3 py-1 text-xs font-medium text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                    >
                      Sửa
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs font-mono text-[var(--mau-chu-phu)] bg-[var(--mau-vien)]/50 px-2 py-0.5 rounded">
                      {soThe} từ
                    </span>
                    <span className="hidden sm:inline text-[var(--mau-vien)]">·</span>

                    {DS_CHE_DO_HOC.map((cd) => {
                      const khaDung = cd.nhan !== "Trắc nghiệm" || coTheQuiz;
                      return (
                        <span
                          key={cd.nhan}
                          className={`text-xs font-mono px-2 py-0.5 rounded border ${
                            khaDung
                              ? "border-[var(--mau-chinh)]/30 text-[var(--mau-chinh)]"
                              : "border-[var(--mau-vien)] text-[var(--mau-vien)] line-through"
                          }`}
                        >
                          {cd.nhan}
                        </span>
                      );
                    })}

                    <span className="hidden sm:inline text-[var(--mau-vien)]">·</span>

                    {DS_HUONG.map((h) => (
                      <span
                        key={h.nhan}
                        className="text-xs font-mono px-2 py-0.5 rounded border border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
                      >
                        {h.nhan}
                      </span>
                    ))}

                  </div>

                  {tienDo && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--mau-chu-phu)]">
                      {tienDo.flashcard && (
                        <span className="rounded-md border border-[var(--mau-chinh)]/25 bg-[var(--mau-chinh)]/5 px-2 py-1">
                          Đã nhớ {tienDo.flashcard.remembered}/{tienDo.flashcard.total} từ
                        </span>
                      )}
                      {tienDo.quiz && (
                        <span className="rounded-md border border-[var(--mau-vien)] bg-[var(--mau-vien)]/25 px-2 py-1">
                          Quiz gần nhất: {tienDo.quiz.correct}/{tienDo.quiz.total}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dangMoForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--mau-chu)]/35 px-4 py-4 sm:items-center sm:py-6">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-nen)] p-4 shadow-xl sm:p-5">
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
                className="rounded-md border border-[var(--mau-vien)] px-3 py-1 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
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
                  className="w-full rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
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
                  className="w-full resize-none rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                  placeholder="Mô tả ngắn"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={dongFormBo}
                  className="w-full sm:w-auto rounded-lg border border-[var(--mau-vien)] px-5 py-2.5 text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-[var(--mau-chinh)] px-5 py-2.5 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-opacity"
                >
                  {boDangSua ? "Lưu thay đổi" : "Thêm bộ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrangDanhSachBo;
