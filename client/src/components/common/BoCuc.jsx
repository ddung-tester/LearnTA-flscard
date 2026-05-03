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

  return (
    <div className="min-h-screen">
      <header className="app-shell-header px-4 py-4 sm:px-6">
        <div className="app-shell-header__inner mx-auto flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-lg font-semibold text-[var(--mau-chu)] hover:text-[var(--mau-nhan)] transition-colors"
          >
            Streak Drop
          </Link>
          <Link
            to="/decks"
            className="rounded-full border border-[var(--mau-vien)] px-3 py-1.5 text-sm text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
          >
            Bộ từ vựng
          </Link>
        </div>
      </header>

      <main className="app-shell-main mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default BoCuc;
