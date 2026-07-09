import { lazy, Suspense } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import VideoBackground from "./components/VideoBackground";
import {
  BACKGROUND_DEFAULT_VIDEO,
  BACKGROUND_QUIZ_VIDEO,
} from "./constants/backgrounds";

import { SuspenseLoader } from "./contexts/PageTransitionContext";

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
  const laPhienHoc = /\/(flashcard|quiz|tu-luan)$/.test(viTri.pathname);
  const laTrangDashboard = viTri.pathname === "/dashboard";
  const backgroundVariant = laTrangImmersive
    ? "auth"
    : laPhienHoc
      ? "study"
      : laTrangDashboard
        ? "dashboard"
        : "default";
  const backgroundSrc = laTrangImmersive
    ? BACKGROUND_DEFAULT_VIDEO
    : laTrangDashboard
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
      {noiDungRoutes}
    </VideoBackground>
  );
}

export default UngDung;
