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
    <div className="min-h-screen bg-[var(--mau-nen)]">
      <header className="border-b border-[var(--mau-vien)] px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-lg font-semibold text-[var(--mau-chu)]"
          >
            Streak Drop
          </Link>
          <Link
            to="/decks"
            className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            Bộ từ vựng
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default BoCuc;
