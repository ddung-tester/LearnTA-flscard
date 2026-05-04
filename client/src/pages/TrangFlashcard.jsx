import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";

const DS_CHE_DO = [
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    shortLabel: "VI → EN",
  },
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    shortLabel: "EN → VI",
  },
];

function laVungNhapLieu(element) {
  if (!element) return false;
  const tenThe = element.tagName?.toLowerCase();
  return (
    tenThe === "input" ||
    tenThe === "textarea" ||
    tenThe === "select" ||
    element.isContentEditable
  );
}

function TrangFlashcard() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const danhSach = layTheoBoId(boId);

  const [chiSo, setChiSo] = useState(0);
  const [daLat, setDaLat] = useState(false);
  const [cheDo, setCheDo] = useState("vi-en");

  function latThe() {
    setDaLat((dangLat) => !dangLat);
  }

  function diChuyen(buoc) {
    setChiSo((chiSoHienTai) => {
      const chiSoMoi = chiSoHienTai + buoc;
      if (chiSoMoi < 0 || chiSoMoi >= danhSach.length) return chiSoHienTai;
      return chiSoMoi;
    });
    setDaLat(false);
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    setCheDo(key);
    setChiSo(0);
    setDaLat(false);
  }

  useEffect(() => {
    function xuLyPhim(e) {
      if (laVungNhapLieu(e.target)) return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        latThe();
        return;
      }

      if (e.key === "ArrowRight") {
        diChuyen(1);
      } else if (e.key === "ArrowLeft") {
        diChuyen(-1);
      }
    }

    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  });

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

  if (danhSach.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Flashcard
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này chưa có từ nào
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Thêm một vài cặp từ Anh Việt trước khi bắt đầu học flashcard.
        </p>
        <Link
          to={`/decks/${boId}`}
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay lại bộ từ
        </Link>
      </div>
    );
  }

  const theHienTai = danhSach[chiSo];
  const matTruoc = cheDo === "en-vi" ? theHienTai.term_en : theHienTai.meaning_vi;
  const matSau = cheDo === "en-vi" ? theHienTai.meaning_vi : theHienTai.term_en;
  const tienDo = ((chiSo + 1) / danhSach.length) * 100;

  return (
    <div className="ui-page-stack max-w-2xl mx-auto">
      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <Link
            to={`/decks/${boId}`}
            className="ui-link text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            &larr; {bo.title}
          </Link>
        </div>
        <div className="ui-page-header__actions">
          <ModeSwitch
            value={cheDo}
            onChange={doiCheDoHoc}
            options={DS_CHE_DO}
            ariaLabel="Đổi chế độ flashcard"
            variant="compact"
          />
        </div>
      </div>

      <div className="ui-section-stack">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-[var(--mau-chu-phu)]">
          <span>Tiến độ</span>
          <span>{Math.round(tienDo)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-[var(--mau-vien)] bg-[var(--mau-mat-2)]">
          <div
            className="ui-progress-fill h-full rounded-full bg-[var(--mau-chinh)]"
            style={{ width: `${tienDo}%` }}
          />
        </div>
      </div>

      <div key={`${cheDo}-${chiSo}`} className="ui-content-enter [perspective:1200px] mb-5">
        <button
          type="button"
          onClick={latThe}
          aria-pressed={daLat}
          className="ui-card-interactive relative w-full aspect-[3/2] min-h-56 sm:min-h-72 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
        >
          <div
            className={`absolute inset-0 rounded-xl transition-transform duration-300 ease-[var(--tuong-tac-ease-soft)] [transform-style:preserve-3d] ${daLat ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
              }`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-6 shadow-[var(--bong-card)] [backface-visibility:hidden] hover:bg-[var(--mau-mat-hover)] transition-colors sm:px-7 sm:py-8">
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matTruoc}
              </span>
              <span className="text-xs text-[var(--mau-chu-phu)] mt-8">
                Click hoặc nhấn Space để lật thẻ
              </span>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-chinh)]/35 bg-[var(--mau-mat-2)] px-4 py-6 shadow-[var(--bong-card)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-7 sm:py-8">
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matSau}
              </span>
              {theHienTai.example_sentence && (
                <p className="mt-6 max-w-md break-words text-center text-sm italic text-[var(--mau-chu-phu)]">
                  {theHienTai.example_sentence}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => diChuyen(-1)}
          disabled={chiSo === 0}
          className="ui-button ui-button--ghost w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          &larr; Trước
        </button>
        <button
          type="button"
          onClick={() => diChuyen(1)}
          disabled={chiSo === danhSach.length - 1}
          className="ui-button ui-button--ghost w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          Sau &rarr;
        </button>
      </div>
    </div>
  );
}

export default TrangFlashcard;
