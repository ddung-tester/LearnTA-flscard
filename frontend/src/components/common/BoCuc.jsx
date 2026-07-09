import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTransition } from "../../contexts/PageTransitionContext";

/**
 * BoCuc — Layout chung cho tat ca trang (tru TrangChu).
 * Gom header va main content area.
 */
function BoCuc() {
  const viTri = useLocation();
  const navigate = useNavigate();
  const { navigateWithLoading } = usePageTransition();
  const { dangXuat, isAuthenticated, user } = useAuth();
  const [dangMoMenuTaiKhoan, setDangMoMenuTaiKhoan] = useState(false);
  const menuTaiKhoanRef = useRef(null);
  const laTrangChu = viTri.pathname === "/";
  const laTrangDangNhap = viTri.pathname === "/login";
  const laTrangDangKy = viTri.pathname === "/register";
  const laTrangDashboard = viTri.pathname === "/dashboard";
  const dangTrongKhuBoTu = viTri.pathname.startsWith("/decks");
  const laTrangAuth = laTrangDangNhap || laTrangDangKy;
  // Các trang học (flashcard, quiz, tự luận) cần ít padding hơn để vừa màn hình
  const laPhienHoc = /\/(flashcard|quiz|tu-luan)$/.test(viTri.pathname);
  const noiDungTrang = <Outlet />;

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
    navigateWithLoading("/login", { replace: true, state: { loggedOut: true } });
    dangXuat();
  }

  // TrangChu co layout rieng, khong can BoCuc
  if (laTrangChu) {
    return noiDungTrang;
  }

  return (
    <div className={laPhienHoc ? "app-shell app-shell--study" : "min-h-screen"}>
      <header className={`app-shell-header${laTrangDashboard ? " app-shell-header--dashboard" : " px-4 py-3 sm:px-6"}`}>
        <div className={`${laTrangDashboard ? "app-shell-header__inner--dashboard mx-auto px-4 sm:px-6" : "app-shell-header__inner mx-auto px-0"} flex items-center justify-between gap-3`}>
          {!laTrangAuth && (
            <Link
              to={isAuthenticated ? "/dashboard" : "/decks"}
              className={laTrangDashboard ? "dash-nav__brand" : "ui-link flex items-center gap-2 text-lg font-semibold text-[var(--mau-chu)] hover:text-[var(--mau-nhan)] transition-colors"}
            >
              Streak Drop
            </Link>
          )}
          <nav className={laTrangDashboard ? "dash-nav__links" : "flex flex-wrap items-center justify-end gap-2"}>
            {isAuthenticated && !laTrangAuth && (
              laTrangDashboard ? (
                <Link
                  to="/dashboard"
                  className={`dash-nav__link${laTrangDashboard ? " dash-nav__link--active" : ""}`}
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className={`ui-button ui-button--ghost rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    laTrangDashboard
                      ? "border-[var(--mau-chinh)] text-[var(--mau-chinh)]"
                      : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)]"
                  }`}
                >
                  Dashboard
                </Link>
              )
            )}
            {!dangTrongKhuBoTu && !laTrangAuth && (
              laTrangDashboard ? (
                <Link to="/decks" className="dash-nav__link">
                  Bộ từ vựng
                </Link>
              ) : (
                <Link
                  to="/decks"
                  className="ui-button ui-button--ghost rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"
                >
                  Bộ từ vựng
                </Link>
              )
            )}

            {!laTrangAuth && isAuthenticated ? (
              <div ref={menuTaiKhoanRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDangMoMenuTaiKhoan((dangMo) => !dangMo)}
                  aria-haspopup="menu"
                  aria-expanded={dangMoMenuTaiKhoan}
                  className={laTrangDashboard ? "dash-nav__user-btn" : "ui-button ui-button--ghost flex max-w-[12rem] items-center gap-2 rounded-full border border-[var(--mau-vien)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mau-chu-phu)] hover:border-[var(--mau-vien-manh)] hover:text-[var(--mau-chu)] transition-colors"}
                >
                  <span className="truncate">{user?.fullname}</span>
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
                    className="absolute left-full top-full z-30 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-2 shadow-[var(--bong-modal)]"
                  >
                    <div className="border-b border-[var(--mau-vien)]/70 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[var(--mau-chu)]">
                        {user?.fullname}
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
                      onClick={() => {
                        setDangMoMenuTaiKhoan(false);
                        navigate("/cai-dat");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--mau-chu-phu)] hover:bg-[var(--mau-mat)] hover:text-[var(--mau-chu)] transition-colors"
                    >
                      <span>Cài đặt</span>
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
            ) : !laTrangAuth ? (
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
            ) : (
              null
            )}
          </nav>
        </div>
      </header>

      <main
        className={`app-shell-main mx-auto px-4 sm:px-6 ${laPhienHoc ? "app-shell-main--study py-2 sm:py-3" : "py-6 sm:py-8"}${laTrangDashboard ? " app-shell-main--dashboard" : ""}`}
      >
        {noiDungTrang}
      </main>
    </div>
  );
}

export default BoCuc;
