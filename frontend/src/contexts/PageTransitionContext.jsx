import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PageLoadingOverlay = lazy(() => import("../components/PageLoadingOverlay"));

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
  const dangChuyenTrangRef = useRef(false);
  const currentPathRef = useRef("");

  currentPathRef.current = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (dangChuyenTrang) {
      document.body.classList.add("is-page-loading");
    } else {
      document.body.classList.remove("is-page-loading");
    }

    return () => {
      document.body.classList.remove("is-page-loading");
    };
  }, [dangChuyenTrang]);

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
    () => ({ dangChuyenTrang, navigateWithLoading }),
    [dangChuyenTrang, navigateWithLoading]
  );

  return (
    <PageTransitionContext.Provider value={value}>
      <div className="page-transition-root" onClickCapture={handleClickCapture}>
        {children}
      </div>
      <Suspense fallback={null}>
        <PageLoadingOverlay hienThi={dangChuyenTrang} />
      </Suspense>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);

  if (!context) {
    throw new Error("usePageTransition phai duoc dung trong PageTransitionProvider");
  }

  return context;
}
