import { Link, Outlet, useLocation } from "react-router-dom";

/**
 * BoCuc — Layout chung cho tat ca trang (tru TrangChu).
 * Gom header va main content area.
 */
function BoCuc() {
  const viTri = useLocation();
  const laTrangChu = viTri.pathname === "/";

  // TrangChu co layout rieng, khong can BoCuc
  if (laTrangChu) {
    return <Outlet />;
  }

  // Các trang học (flashcard, quiz, tự luận) cần ít padding hơn để vừa màn hình
  const laPhienHoc = /\/(flashcard|quiz|tu-luan)$/.test(viTri.pathname);

  return (
    <div className="min-h-screen">
      <header className="app-shell-header px-4 py-3 sm:px-6">
        <div className="app-shell-header__inner mx-auto flex items-center justify-between gap-3">
          <Link
            to="/"
            className="ui-link text-lg font-semibold text-[var(--mau-chu)] hover:text-[var(--mau-nhan)] transition-colors"
          >
            Streak Drop
          </Link>
          <Link
            to="/decks"
            className="ui-button ui-button--ghost rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
          >
            Bộ từ vựng
          </Link>
        </div>
      </header>

      <main
        key={viTri.pathname}
        className={`app-shell-main ui-page-enter mx-auto px-4 sm:px-6 ${laPhienHoc ? "py-2 sm:py-3" : "py-6 sm:py-8"}`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default BoCuc;
