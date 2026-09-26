import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTransition } from "../../contexts/PageTransitionContext";

const DS_TAB_DIEU_HUONG = [
  { to: "/dashboard", nhan: "Dashboard", laActive: (path) => path === "/dashboard" },
  { to: "/decks", nhan: "Bộ từ", laActive: (path) => path.startsWith("/decks") },
  { to: "/roadmap", nhan: "Lộ trình", laActive: (path) => path.startsWith("/roadmap") },
  { to: "/practice", nhan: "Luyện tập", laActive: (path) => path === "/practice" },
];

/**
 * BoCuc — Layout chung cho tat ca trang (tru TrangChu).
 * Gom header va main content area.
 */
function BoCuc() {
  const viTri = useLocation();
  const { navigateWithLoading } = usePageTransition();
  const { dangXuat, isAuthenticated, user } = useAuth();
  const giamChuyenDong = useReducedMotion();
  const [dangMoMenuTaiKhoan, setDangMoMenuTaiKhoan] = useState(false);
  const menuTaiKhoanRef = useRef(null);
  const laTrangChu = viTri.pathname === "/";
  const laTrangDangNhap = viTri.pathname === "/login";
  const laTrangDangKy = viTri.pathname === "/register";
  const laTrangDashboard = viTri.pathname === "/dashboard";
  const laTrangAuth = laTrangDangNhap || laTrangDangKy;
  // Các trang học (flashcard, quiz, tự luận) cần ít padding hơn để vừa màn hình
  const laPhienHoc = /\/(flashcard|quiz|tu-luan|nghe-viet|ngu-canh|noi-tu|hon-hop)$/.test(viTri.pathname);
  // Khách chỉ thấy tab Lộ trình: bộ từ mẫu nằm trong lộ trình, không có trong "Bộ từ"
  const dsTab = isAuthenticated
    ? DS_TAB_DIEU_HUONG
    : DS_TAB_DIEU_HUONG.filter((tab) => tab.to === "/roadmap");
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
      <header className="app-shell-header app-shell-header--dashboard">
        <div className="app-shell-header__inner--dashboard mx-auto flex items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="dash-nav__brand"
          >
            <span className="dash-nav__brand-mark" aria-hidden="true" />
            {/* Màn rất hẹp: chỉ giữ biểu tượng để header không tràn ngang */}
            <span className="max-[420px]:sr-only">Streak Drop</span>
          </Link>
          <nav className="dash-nav__links" aria-label="Điều hướng chính">
            {!laTrangAuth && !laPhienHoc &&
              dsTab.map((tab) => {
                const dangActive = tab.laActive(viTri.pathname);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={dangActive ? "page" : undefined}
                    className={`dash-nav__link${dangActive ? " dash-nav__link--active" : ""}`}
                  >
                    {tab.nhan}
                    {dangActive && (
                      <motion.span
                        layoutId="dash-nav-gach-chan"
                        className="dash-nav__indicator"
                        transition={
                          giamChuyenDong
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 38 }
                        }
                      />
                    )}
                  </Link>
                );
              })}
            {!laTrangAuth && isAuthenticated ? (
              <div ref={menuTaiKhoanRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDangMoMenuTaiKhoan((dangMo) => !dangMo)}
                  aria-haspopup="menu"
                  aria-expanded={dangMoMenuTaiKhoan}
                  className="dash-nav__user-btn"
                >
                  <span className="dash-nav__avatar" aria-hidden="true">
                    {(user?.fullname || "?").trim().charAt(0).toUpperCase()}
                  </span>
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
                    className="absolute right-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] p-2 shadow-[var(--bong-modal)]"
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
                        navigateWithLoading("/cai-dat");
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
              <div className="flex items-center gap-2">
                <Link to="/login" className="dash-nav__link">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="ui-button ui-button--primary rounded-lg px-3.5 py-1.5 text-sm font-semibold"
                >
                  Đăng ký
                </Link>
              </div>
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
