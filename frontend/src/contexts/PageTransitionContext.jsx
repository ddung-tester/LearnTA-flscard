import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLoadingOverlay from "../components/PageLoadingOverlay";

const PageTransitionContext = createContext(null);

function normalizeTo(to) {
  if (typeof to === "string") return to;
  if (!to) return "";

  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

export function PageTransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [soTacVuTaiDuLieu, setSoTacVuTaiDuLieu] = useState(0);
  const dangChuyenTrangRef = useRef(false);
  const currentPathRef = useRef("");
  const tacVuTaiDuLieuRef = useRef(new Set());

  // Loading hiển thị khi có ít nhất 1 task đang chạy
  // (bao gồm __nav__ key khi đang chuyển trang)
  const hienThiLoading = soTacVuTaiDuLieu > 0;

  const setPageDataLoading = useCallback((key, dangTai) => {
    const khoa = String(key || "page");
    const dangCo = tacVuTaiDuLieuRef.current.has(khoa);

    if (dangTai && !dangCo) {
      tacVuTaiDuLieuRef.current.add(khoa);
      setSoTacVuTaiDuLieu((hienTai) => hienTai + 1);
      return;
    }

    if (!dangTai && dangCo) {
      tacVuTaiDuLieuRef.current.delete(khoa);
      setSoTacVuTaiDuLieu((hienTai) => Math.max(0, hienTai - 1));
    }
  }, []);

  useLayoutEffect(() => {
    currentPathRef.current = `${location.pathname}${location.search}${location.hash}`;

    // Chỉ xử lý khi đang trong quá trình navigation
    if (!dangChuyenTrangRef.current) return undefined;

    // Double-rAF bridge: đợi 2 animation frames để component mới kịp mount
    // và gọi setPageDataLoading(dataKey, true) TRƯỚC KHI tắt __nav__ key.
    //
    // Luồng mong muốn:
    //   frame 1: component mới bắt đầu render
    //   frame 2: useLayoutEffect của component mới đã chạy, dataKey đã được đăng ký
    //   → clear __nav__ → soTacVuTaiDuLieu vẫn > 0 (do dataKey) → overlay không tắt sớm
    let raf2Id = null;
    const raf1Id = window.requestAnimationFrame(() => {
      raf2Id = window.requestAnimationFrame(() => {
        raf2Id = null;
        dangChuyenTrangRef.current = false;
        setPageDataLoading("__nav__", false);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1Id);
      if (raf2Id !== null) {
        window.cancelAnimationFrame(raf2Id);
        raf2Id = null;
      }
    };
  }, [location, setPageDataLoading]);

  useLayoutEffect(() => {
    if (hienThiLoading) {
      document.body.classList.add("is-page-loading");
    } else {
      document.body.classList.remove("is-page-loading");
    }

    return () => {
      document.body.classList.remove("is-page-loading");
    };
  }, [hienThiLoading]);

  const navigateWithLoading = useCallback(
    (to, options = {}) => {
      const targetPath = normalizeTo(to);

      if (!targetPath || targetPath === currentPathRef.current || dangChuyenTrangRef.current) {
        return;
      }

      // Dùng __nav__ key thay cho dangChuyenTrang state:
      // key này sẽ giữ overlay sống cho đến khi double-rAF xóa nó,
      // đảm bảo không có khoảng hở giữa navigation và data loading.
      dangChuyenTrangRef.current = true;
      setPageDataLoading("__nav__", true);

      try {
        startTransition(() => {
          navigate(to, options);
        });
      } catch (error) {
        dangChuyenTrangRef.current = false;
        setPageDataLoading("__nav__", false);
        throw error;
      }
    },
    [navigate, setPageDataLoading]
  );

  function handleClickCapture(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const link = event.target.closest?.("a[href]");
    if (!link) return;

    const target = link.getAttribute("target");
    if (target && target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const targetPath = `${url.pathname}${url.search}${url.hash}`;
    if (targetPath === currentPathRef.current) return;

    event.preventDefault();
    navigateWithLoading(targetPath, { replace: link.hasAttribute("data-replace") });
  }

  const value = useMemo(
    () => ({ dangChuyenTrang: hienThiLoading, navigateWithLoading, setPageDataLoading }),
    [hienThiLoading, navigateWithLoading, setPageDataLoading]
  );

  return (
    <PageTransitionContext.Provider value={value}>
      <div className="page-transition-root" onClickCapture={handleClickCapture}>
        {children}
      </div>
      <PageLoadingOverlay hienThi={hienThiLoading} />
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() { // eslint-disable-line react-refresh/only-export-components
  const context = useContext(PageTransitionContext);

  if (!context) {
    throw new Error("usePageTransition phai duoc dung trong PageTransitionProvider");
  }

  return context;
}

export function SuspenseLoader() {
  const { setPageDataLoading } = usePageTransition();

  useLayoutEffect(() => {
    setPageDataLoading("suspense", true);
    return () => {
      setPageDataLoading("suspense", false);
    };
  }, [setPageDataLoading]);

  return null;
}
