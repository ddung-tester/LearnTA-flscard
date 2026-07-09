import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLoadingOverlay from "../components/PageLoadingOverlay";

const DELAY_BEFORE_NAVIGATE_MS = 700;
const DELAY_AFTER_NAVIGATE_MS = 500;

const PageTransitionContext = createContext(null);

function normalizeTo(to) {
  if (typeof to === "string") return to;
  if (!to) return "";

  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

export function PageTransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dangChuyenTrang, setDangChuyenTrang] = useState(false);
  const [soTacVuTaiDuLieu, setSoTacVuTaiDuLieu] = useState(0);
  const dangChuyenTrangRef = useRef(false);
  const currentPathRef = useRef("");
  const tacVuTaiDuLieuRef = useRef(new Set());
  const hienThiLoading = dangChuyenTrang || soTacVuTaiDuLieu > 0;

  currentPathRef.current = `${location.pathname}${location.search}${location.hash}`;

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

  const navigateWithLoading = useCallback(
    async (to, options = {}) => {
      const targetPath = normalizeTo(to);

      if (!targetPath || targetPath === currentPathRef.current || dangChuyenTrangRef.current) {
        return;
      }

      dangChuyenTrangRef.current = true;
      setDangChuyenTrang(true);

      await new Promise((resolve) => {
        setTimeout(resolve, DELAY_BEFORE_NAVIGATE_MS);
      });

      navigate(to, options);

      await new Promise((resolve) => {
        setTimeout(resolve, DELAY_AFTER_NAVIGATE_MS);
      });

      dangChuyenTrangRef.current = false;
      setDangChuyenTrang(false);
    },
    [navigate]
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
