import { lazy, Suspense, useLayoutEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import TuongTacNho from "./components/common/TuongTacNho";
import DenBan from "./components/common/DenBan";
import VideoBackground from "./components/VideoBackground";

import { useAuth } from "./contexts/AuthContext";
import {
  SuspenseLoader,
  usePageTransition,
} from "./contexts/PageTransitionContext";

const ChatbotWidget = lazy(() => import("./components/ChatbotWidget"));
const TrangChu = lazy(() => import("./pages/TrangChu"));
const TrangTuVung = lazy(() => import("./pages/TrangTuVung"));
const TrangDashboard = lazy(() => import("./pages/TrangDashboard"));
const TrangChiTietBo = lazy(() => import("./pages/TrangChiTietBo"));
const TrangThemTu = lazy(() => import("./pages/TrangThemTu"));
const TrangFlashcard = lazy(() => import("./pages/TrangFlashcard"));
const TrangQuiz = lazy(() => import("./pages/TrangQuiz"));
const TrangTuLuan = lazy(() => import("./pages/TrangTuLuan"));
const TrangNoiTu = lazy(() => import("./pages/TrangNoiTu"));
const TrangLuyenTap = lazy(() => import("./pages/TrangLuyenTap"));
const TrangChiTietLoTrinh = lazy(() => import("./pages/TrangChiTietLoTrinh"));
const TrangTuSai = lazy(() => import("./pages/TrangTuSai"));
const TrangOnTapHomNay = lazy(() => import("./pages/TrangOnTapHomNay"));
const TrangKhongTimThay = lazy(() => import("./pages/TrangKhongTimThay"));
const TrangDangNhap = lazy(() => import("./pages/TrangDangNhap"));
const TrangDangKy = lazy(() => import("./pages/TrangDangKy"));
const TrangCaiDat = lazy(() => import("./pages/TrangCaiDat"));
const TrangThongKe = lazy(() => import("./pages/TrangThongKe"));
const TrangKhoaHoc = lazy(() => import("./pages/TrangKhoaHoc"));
const TrangBaiHoc = lazy(() => import("./pages/TrangBaiHoc"));
const TrangOnCauHoi = lazy(() => import("./pages/TrangOnCauHoi"));

function AuthReadyGate({ children }) {
  const { isAuthReady, authError, retryAuth } = useAuth();
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

  if (authError) {
    return <section className="ui-form-panel" role="alert">
      <p>Chưa thể xác minh phiên đăng nhập. {authError}</p>
      <button type="button" className="ui-button ui-button--primary rounded-xl px-5 py-2.5 font-semibold" onClick={retryAuth}>Thử lại</button>
    </section>;
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
          <Route path="/decks" element={<TrangTuVung />} />
          <Route path="/decks/:deckId" element={<TrangChiTietBo />} />
          <Route path="/practice" element={<TrangLuyenTap />} />
          <Route path="/khoa-hoc" element={<TrangKhoaHoc />} />
          {/* Trang lộ trình cũ đã gộp vào trang Khoá học */}
          <Route path="/roadmap" element={<Navigate to="/khoa-hoc" replace />} />
          <Route path="/roadmap/:slug" element={<TrangChiTietLoTrinh />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<TrangDashboard />} />
            <Route path="/tu-sai" element={<TrangTuSai />} />
            <Route path="/review" element={<TrangOnTapHomNay />} />
            <Route path="/stats" element={<TrangThongKe />} />
            <Route path="/decks/:deckId/add-word" element={<TrangThemTu />} />
            <Route path="/cai-dat" element={<TrangCaiDat />} />
            <Route path="/khoa-hoc/on-tap" element={<TrangOnCauHoi />} />
            <Route path="/khoa-hoc/:courseId/bai/:soBai" element={<TrangBaiHoc />} />
          </Route>
          <Route path="/decks/:deckId/flashcard" element={<TrangFlashcard />} />
          <Route path="/decks/:deckId/quiz" element={<TrangQuiz />} />
          <Route path="/decks/:deckId/tu-luan" element={<TrangTuLuan />} />
          <Route path="/decks/:deckId/nghe-viet" element={<TrangTuLuan loai="nghe-viet" />} />
          <Route path="/decks/:deckId/ngu-canh" element={<TrangQuiz loai="ngu-canh" />} />
          <Route path="/decks/:deckId/noi-tu" element={<TrangNoiTu />} />
          <Route path="/decks/:deckId/hon-hop" element={<TrangTuLuan loai="hon-hop" />} />
          <Route path="*" element={<TrangKhongTimThay />} />
        </Route>
      </Routes>
    </Suspense>
  );

  return (
    <VideoBackground
      variant="flat"
      mode={laTrangAuth ? "immersive" : "app"}
    >
      <TuongTacNho />
      <DenBan />
      <AuthReadyGate>{noiDungRoutes}</AuthReadyGate>
      {!laTrangImmersive && (
        <Suspense fallback={null}>
          <ChatbotWidget />
        </Suspense>
      )}
    </VideoBackground>
  );
}

export default UngDung;
