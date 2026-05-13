import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * BoCuc — Layout chung cho tat ca trang (tru TrangChu).
 * Gom header va main content area.
 */
function BoCuc() {
  const viTri = useLocation();
  const navigate = useNavigate();
  const { dangXuat, isAuthenticated, user } = useAuth();
  const [dangMoMenuTaiKhoan, setDangMoMenuTaiKhoan] = useState(false);
  const menuTaiKhoanRef = useRef(null);
  const laTrangChu = viTri.pathname === "/";
  const dangTrongKhuBoTu = viTri.pathname.startsWith("/decks");
  const laTrangAuth =
    viTri.pathname === "/login" || viTri.pathname === "/register";
  // Các trang học (flashcard, quiz, tự luận) cần ít padding hơn để vừa màn hình
  const laPhienHoc = /\/(flashcard|quiz|tu-luan)$/.test(viTri.pathname);

  useEffect(() => {
    setDangMoMenuTaiKhoan(false);
  }, [viTri.pathname]);

  useEffect(() => {
    if (!dangMoMenuTaiKhoan) return undefined;

    function xuLyClickNgoai(event) {
      if (!menuTaiKhoanRef.current?.contains(event.target)) {
        setDangMoMenuTaiKhoan(false);
      }
    }

    function xuLyPhim(event) {
      if (event.key === "Escape") {
        setDangMoMenuTaiKhoan(false);
      }
    }

    document.addEventListener("mousedown", xuLyClickNgoai);
    document.addEventListener("keydown", xuLyPhim);

    return () => {
      document.removeEventListener("mousedown", xuLyClickNgoai);
      document.removeEventListener("keydown", xuLyPhim);
    };
  }, [dangMoMenuTaiKhoan]);

  function xuLyDangXuat() {
    setDangMoMenuTaiKhoan(false);
    dangXuat();
    navigate("/login", { replace: true, state: { loggedOut: true } });
  }

  // TrangChu co layout rieng, khong can BoCuc
  if (laTrangChu) {
    return <Outlet />;
  }

  return (
    <div className={laPhienHoc ? "app-shell app-shell--study" : "min-h-screen"}>
      <header className="app-shell-header px-4 py-3 sm:px-6">
        <div className="app-shell-header__inner mx-auto flex items-center justify-between gap-3">
          <Link
            to="/"
            className="ui-link text-lg font-semibold text-[var(--mau-chu)] hover:text-[var(--mau-nhan)] transition-colors"
          >
            Streak Drop
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            {!dangTrongKhuBoTu && !laTrangAuth && (
              <Link
                to="/decks"
                className="ui-button ui-button--ghost rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
              >
                Bộ từ vựng
              </Link>
            )}

            {isAuthenticated ? (
              <div ref={menuTaiKhoanRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDangMoMenuTaiKhoan((dangMo) => !dangMo)}
                  aria-haspopup="menu"
                  aria-expanded={dangMoMenuTaiKhoan}
                  className="ui-button ui-button--ghost flex max-w-[12rem] items-center gap-2 rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
                >
                  <span className="truncate">{user?.username}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 shrink-0 transition-transform ${dangMoMenuTaiKhoan ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {dangMoMenuTaiKhoan && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-2 shadow-[var(--bong-modal)]"
                  >
                    <div className="border-b border-[var(--mau-vien)]/70 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[var(--mau-chu)]">
                        {user?.username}
                      </p>
                      <p className="truncate text-xs text-[var(--mau-chu-phu)]">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      disabled
                      className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--mau-chu-mo)] disabled:cursor-not-allowed"
                    >
                      <span>Trang cá nhân</span>
                      <span className="text-xs">Sắp có</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--mau-chu-mo)] disabled:cursor-not-allowed"
                    >
                      <span>Cài đặt</span>
                      <span className="text-xs">Sắp có</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--mau-chu-mo)] disabled:cursor-not-allowed"
                    >
                      <span>Lịch sử học</span>
                      <span className="text-xs">Sắp có</span>
                    </button>

                    <div className="mt-2 border-t border-[var(--mau-vien)]/70 pt-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={xuLyDangXuat}
                        className="ui-button ui-button--ghost w-full justify-start rounded-lg border border-transparent px-3 py-2 text-left text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien)] hover:text-[var(--mau-chu)]"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="ui-button ui-button--ghost rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="ui-button ui-button--primary rounded-full bg-[var(--mau-chinh)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-tren-chinh)] hover:bg-[var(--mau-chinh-hover)] transition-colors"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main
        className={`app-shell-main mx-auto px-4 sm:px-6 ${laPhienHoc ? "app-shell-main--study py-2 sm:py-3" : "py-6 sm:py-8"}`}
      >
        <div key={viTri.pathname} className="ui-route-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default BoCuc;
