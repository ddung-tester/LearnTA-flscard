import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTransition } from "../../contexts/PageTransitionContext";
import { layThongKeSRS, SU_KIEN_SRS_DOI } from "../../utils/srsReview";
import { layDanhSachKhoaHoc } from "../../services/courseApi";
import { chuanBiAmThanh } from "../../utils/amThanh";
import NutAmThanh from "./NutAmThanh";
import NutDenBan from "./NutDenBan";

const MeoHocCung = lazy(() => import("./MeoHocCung"));

const laTrangOnTap = (path) => path === "/review" || path === "/khoa-hoc/on-tap" || path === "/tu-sai";

// Khoá 48 ngày là trục chính; Từ vựng gom mọi bộ từ (theo buổi, tự tạo, lộ trình) + Luyện tập
const DS_TAB_DIEU_HUONG = [
  { to: "/dashboard", nhan: "Hôm nay", laActive: (path) => path === "/dashboard" },
  {
    to: "/khoa-hoc",
    nhan: "Khoá 48 ngày",
    nhanNgan: "Khoá học",
    laActive: (path) => path.startsWith("/khoa-hoc") && !laTrangOnTap(path),
  },
  {
    to: "/decks",
    nhan: "Từ vựng",
    laActive: (path) => path.startsWith("/decks") || path === "/practice" || path.startsWith("/roadmap"),
  },
  { to: "/review", nhan: "Ôn tập", laActive: laTrangOnTap, coSoDenHan: true },
];

// Khách chỉ có lộ trình mẫu (nằm ở /khoa-hoc)
const TAB_KHACH = [
  {
    to: "/khoa-hoc",
    nhan: "Khoá học",
    laActive: (path) => path.startsWith("/khoa-hoc") || path.startsWith("/roadmap"),
  },
];

/**
 * TrangVao — bọc nội dung trang: ẩn khi còn màn chờ, rồi nổi lên (hoặc trượt theo hướng tab)
 * đúng lúc màn chờ tắt. Chỉ chạy một lần mỗi trang (BoCuc đặt key theo pathname).
 */
function TrangVao({ huong, children }) {
  const { dangChuyenTrang } = usePageTransition();
  const [daVao, setDaVao] = useState(!dangChuyenTrang);
  if (!daVao && !dangChuyenTrang) setDaVao(true);

  return (
    <div
      className={`ui-route-transition${daVao ? " ui-route-transition--vao" : ""}`}
      data-huong={huong}
    >
      {children}
    </div>
  );
}

/**
 * BoCuc — Layout chung cho tat ca trang (tru TrangChu).
 * Gom header va main content area.
 */
// Badge "Ôn tập": nghe bản SRS local đổi (cùng tab) và localStorage đổi ở tab khác
function theoDoiSRS(baoDoi) {
  window.addEventListener(SU_KIEN_SRS_DOI, baoDoi);
  window.addEventListener("storage", baoDoi);
  return () => {
    window.removeEventListener(SU_KIEN_SRS_DOI, baoDoi);
    window.removeEventListener("storage", baoDoi);
  };
}

function BoCuc() {
  const viTri = useLocation();
  const { navigateWithLoading } = usePageTransition();
  const { dangXuat, isAuthenticated, user } = useAuth();
  const [dangMoMenuTaiKhoan, setDangMoMenuTaiKhoan] = useState(false);
  const menuTaiKhoanRef = useRef(null);
  const laTrangChu = viTri.pathname === "/";
  const laTrangDangNhap = viTri.pathname === "/login";
  const laTrangDangKy = viTri.pathname === "/register";
  const laTrangDashboard = viTri.pathname === "/dashboard";
  const laTrangAuth = laTrangDangNhap || laTrangDangKy;
  // Các trang học (flashcard, quiz, tự luận) cần ít padding hơn để vừa màn hình
  const laPhienHoc = /\/(flashcard|quiz|tu-luan|nghe-viet|ngu-canh|noi-tu|hon-hop|luyen-cau)$/.test(viTri.pathname);
  // Mèo học cùng: mọi màn có câu hỏi / thẻ để trả lời
  const coMeoHocCung =
    laPhienHoc ||
    viTri.pathname === "/review" ||
    viTri.pathname === "/khoa-hoc/on-tap" ||
    /^\/khoa-hoc\/[^/]+\/bai\//.test(viTri.pathname);
  const dsTab = isAuthenticated ? DS_TAB_DIEU_HUONG : TAB_KHACH;
  // Số từ đến hạn ôn đọc từ bản SRS local (đã đồng bộ khi vào Dashboard / trang học), cập nhật mỗi lần SRS đổi
  const soTuDenHanLocal = useSyncExternalStore(theoDoiSRS, () => layThongKeSRS().duHomNay);
  // Câu bài tập khoá học đến hạn cũng ôn ở /review: cộng vào số trên tab. Đọc lúc rảnh (không tranh
  // mạng với dữ liệu trang); danh sách khoá học được nhớ 20 s nên chuyển trang liên tục không gọi lại.
  const [soCauDenHan, setSoCauDenHan] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let conHieuLuc = true;
    const henRanh = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 1200));
    henRanh(() => {
      layDanhSachKhoaHoc()
        .then((dsKhoa) => {
          if (!conHieuLuc) return;
          setSoCauDenHan(
            dsKhoa.reduce(
              (tong, khoa) => tong + (khoa.lessons || []).reduce((tongBai, bai) => tongBai + (bai.due_count || 0), 0),
              0
            )
          );
        })
        .catch(() => {});
    });
    return () => {
      conHieuLuc = false;
    };
  }, [isAuthenticated, viTri.pathname]);
  const soTuDenHan = isAuthenticated ? soTuDenHanLocal + soCauDenHan : 0;
  // Gạch chân trượt theo tab đang mở. Đo vị trí tab sau khi trình duyệt đã vẽ (bố cục đã tính sẵn,
  // không ép tính lại); trước đây layoutId của motion đo cả trang ngay lúc render (~80 ms trên
  // trang dài, CPU điện thoại). Lần đặt đầu không trượt.
  const navRef = useRef(null);
  const gachChanRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const gach = gachChanRef.current;
    if (!nav || !gach) return undefined;
    let khung = 0;
    const datViTri = () => {
      const tab = nav.querySelector(".dash-nav__link--active");
      if (!tab) return;
      gach.style.setProperty("--x", `${tab.offsetLeft}px`);
      gach.style.setProperty("--rong", `${tab.offsetWidth}px`);
    };
    khung = requestAnimationFrame(() => {
      khung = requestAnimationFrame(() => {
        datViTri();
        // Bật trượt sau lần đặt đầu tiên
        if (!gach.classList.contains("dash-nav__indicator--truot")) {
          khung = requestAnimationFrame(() => gach.classList.add("dash-nav__indicator--truot"));
        }
      });
    });
    // Đổi cỡ (xoay màn hình, menu xuống dòng): callback chạy sau khi bố cục đã tính
    const theoDoi = new ResizeObserver(datViTri);
    theoDoi.observe(nav);
    return () => {
      cancelAnimationFrame(khung);
      theoDoi.disconnect();
    };
    // soTuDenHan: số trên tab Ôn tập đổi độ rộng tab
  }, [viTri.pathname, isAuthenticated, soTuDenHan]);

  // Đổi tab chính: trang mới trượt theo hướng tab (trái/phải); còn lại nổi lên
  const chiSoTab = dsTab.findIndex((tab) => tab.laActive(viTri.pathname));
  const [tabTruoc, setTabTruoc] = useState({ path: viTri.pathname, chiSo: chiSoTab, huong: "len" });
  if (tabTruoc.path !== viTri.pathname) {
    const doiTab = chiSoTab >= 0 && tabTruoc.chiSo >= 0 && chiSoTab !== tabTruoc.chiSo;
    setTabTruoc({
      path: viTri.pathname,
      chiSo: chiSoTab,
      huong: doiTab ? (chiSoTab > tabTruoc.chiSo ? "phai" : "trai") : "len",
    });
  }
  const noiDungTrang = <Outlet />;

  useEffect(() => {
    setDangMoMenuTaiKhoan(false);
  }, [viTri.pathname]);

  useEffect(() => {
    if (coMeoHocCung) return chuanBiAmThanh();
    return undefined;
  }, [coMeoHocCung]);



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
            {/* Khách, màn rất hẹp: chỉ giữ biểu tượng để header không tràn ngang */}
            <span className={isAuthenticated ? undefined : "max-[420px]:sr-only"}>Streak Drop</span>
          </Link>
          {!laTrangAuth && !laPhienHoc && (
            <nav
              className={`dash-nav__links dash-nav__tabs${isAuthenticated ? " dash-nav__tabs--day-du" : ""}`}
              aria-label="Điều hướng chính"
              ref={navRef}
            >
              <span ref={gachChanRef} className="dash-nav__indicator" aria-hidden="true" hidden={chiSoTab < 0} />
              {dsTab.map((tab) => {
                const dangActive = tab.laActive(viTri.pathname);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={dangActive ? "page" : undefined}
                    className={`dash-nav__link${dangActive ? " dash-nav__link--active" : ""}`}
                  >
                    {tab.nhanNgan ? (
                      <>
                        <span className="dash-nav__nhan-dai">{tab.nhan}</span>
                        <span className="dash-nav__nhan-ngan" aria-hidden="true">{tab.nhanNgan}</span>
                      </>
                    ) : (
                      tab.nhan
                    )}
                    {tab.coSoDenHan && soTuDenHan > 0 && (
                      <span className="dash-nav__so" aria-label={`${soTuDenHan} mục đến hạn ôn`}>
                        {soTuDenHan > 99 ? "99+" : soTuDenHan}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="dash-nav__links dash-nav__account">
            {!laTrangAuth && <NutDenBan />}
            {!laTrangAuth && <NutAmThanh />}
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
          </div>
        </div>
      </header>

      <main
        className={`app-shell-main mx-auto px-4 sm:px-6 ${laPhienHoc ? "app-shell-main--study py-2 sm:py-3" : "py-6 sm:py-8"}${laTrangDashboard ? " app-shell-main--dashboard" : ""}`}
      >
        <TrangVao key={viTri.pathname} huong={tabTruoc.huong}>
          {noiDungTrang}
        </TrangVao>
      </main>
      {coMeoHocCung && (
        <Suspense fallback={null}>
          <MeoHocCung />
        </Suspense>
      )}
    </div>
  );
}

export default BoCuc;
