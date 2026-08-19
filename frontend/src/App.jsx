import { lazy, Suspense, useLayoutEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import VideoBackground from "./components/VideoBackground";
import {
  BACKGROUND_DEFAULT_VIDEO,
  BACKGROUND_QUIZ_VIDEO,
} from "./constants/backgrounds";

import { useAuth } from "./contexts/AuthContext";
import {
  SuspenseLoader,
  usePageTransition,
} from "./contexts/PageTransitionContext";

const TrangChu = lazy(() => import("./pages/TrangChu"));
const TrangDashboard = lazy(() => import("./pages/TrangDashboard"));
const TrangChiTietBo = lazy(() => import("./pages/TrangChiTietBo"));
const TrangThemTu = lazy(() => import("./pages/TrangThemTu"));
const TrangFlashcard = lazy(() => import("./pages/TrangFlashcard"));
const TrangQuiz = lazy(() => import("./pages/TrangQuiz"));
const TrangTuLuan = lazy(() => import("./pages/TrangTuLuan"));
const TrangTuSai = lazy(() => import("./pages/TrangTuSai"));
const TrangOnTapHomNay = lazy(() => import("./pages/TrangOnTapHomNay"));
const TrangDangNhap = lazy(() => import("./pages/TrangDangNhap"));
const TrangDangKy = lazy(() => import("./pages/TrangDangKy"));
const TrangCaiDat = lazy(() => import("./pages/TrangCaiDat"));
const TrangThongKe = lazy(() => import("./pages/TrangThongKe"));

function AuthReadyGate({ children }) {
  const { isAuthReady } = useAuth();
  const { setPageDataLoading } = usePageTransition();

  useLayoutEffect(() => {
    setPageDataLoading("auth-session", !isAuthReady);

    return () => {
      setPageDataLoading("auth-session", false);
    };
  }, [isAuthReady, setPageDataLoading]);

  if (!isAuthReady) {
    return null;
  }

  return children;
}

/**
 * UngDung — Routing chinh.
 * BoCuc boc cac trang con, tru TrangChu co layout rieng.
 */
function UngDung() {
  const viTri = useLocation();
  const laTrangImmersive =
    viTri.pathname === "/" ||
    viTri.pathname === "/login" ||
    viTri.pathname === "/register";

  // Trang chu/auth → video background co animation (giu nguyen)
  // Tat ca trang con lai (dashboard, hoc, thong ke...) → nen phang mau loading
  const backgroundVariant = laTrangImmersive ? "auth" : "flat";
  const backgroundSrc = laTrangImmersive
    ? BACKGROUND_DEFAULT_VIDEO
    : BACKGROUND_QUIZ_VIDEO;

  const noiDungRoutes = (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>

        <Route element={<BoCuc />}>
          <Route path="/" element={<TrangChu />} />
          <Route path="/login" element={<TrangDangNhap />} />
          <Route path="/register" element={<TrangDangKy />} />
          <Route path="/decks" element={<Navigate to="/dashboard" replace />} />
          <Route path="/decks/:deckId" element={<TrangChiTietBo />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<TrangDashboard />} />
            <Route path="/tu-sai" element={<TrangTuSai />} />
            <Route path="/review" element={<TrangOnTapHomNay />} />
            <Route path="/stats" element={<TrangThongKe />} />
            <Route path="/decks/:deckId/add-word" element={<TrangThemTu />} />
            <Route path="/cai-dat" element={<TrangCaiDat />} />
          </Route>
          <Route path="/decks/:deckId/flashcard" element={<TrangFlashcard />} />
          <Route path="/decks/:deckId/quiz" element={<TrangQuiz />} />
          <Route path="/decks/:deckId/tu-luan" element={<TrangTuLuan />} />
        </Route>
      </Routes>
    </Suspense>
  );

  return (
    <VideoBackground
      src={backgroundSrc}
      variant={backgroundVariant}
      mode={laTrangImmersive ? "immersive" : "app"}
    >
      <AuthReadyGate>{noiDungRoutes}</AuthReadyGate>
    </VideoBackground>
  );
}

export default UngDung;
