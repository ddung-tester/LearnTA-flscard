import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import VideoBackground from "./components/VideoBackground";

import { useAuth } from "./contexts/AuthContext";
import ChatbotWidget from "./components/ChatbotWidget";
import {
  SuspenseLoader,
  usePageTransition,
} from "./contexts/PageTransitionContext";

const TrangChu = lazy(() => import("./pages/TrangChu"));
const TrangDanhSachBo = lazy(() => import("./pages/TrangDanhSachBo"));
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
 * Tat ca trang dung chung mat ban mat ong (variant "flat").
 * Trang auth giu mode "immersive" cho layout toan man hinh.
 * Trang chu/auth an ChatbotWidget.
 */
function UngDung() {
  const viTri = useLocation();
  const laTrangAuth =
    viTri.pathname === "/login" || viTri.pathname === "/register";
  const laTrangImmersive = viTri.pathname === "/" || laTrangAuth;


  const noiDungRoutes = (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>

        <Route element={<BoCuc />}>
          <Route path="/" element={<TrangChu />} />
          <Route path="/login" element={<TrangDangNhap />} />
          <Route path="/register" element={<TrangDangKy />} />
          <Route path="/decks" element={<TrangDanhSachBo />} />
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
      variant="flat"
      mode={laTrangAuth ? "immersive" : "app"}
    >
      <AuthReadyGate>{noiDungRoutes}</AuthReadyGate>
      {!laTrangImmersive && <ChatbotWidget />}
    </VideoBackground>
  );
}

export default UngDung;
