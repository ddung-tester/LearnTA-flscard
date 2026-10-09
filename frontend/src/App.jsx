import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import TuongTacNho from "./components/common/TuongTacNho";
import DenBan from "./components/common/DenBan";
import VideoBackground from "./components/VideoBackground";

import { useAuth } from "./contexts/AuthContext";
import { batTaiTruocTrang, dangKyTrang, taiTruocTheoDuongDan } from "./utils/taiTruocTrang";
import { getStoredAuthToken } from "./services/api";
import { layDanhSachDeck, layDeckTheoId } from "./services/deckApi";
import { getUserStats } from "./services/userApi";
import { layStudySessionSummary } from "./services/studySessionApi";
import { layCardsTheoDeck } from "./services/cardApi";
import { layBaiHoc, layDanhSachKhoaHoc } from "./services/courseApi";
import {
  SuspenseLoader,
  usePageTransition,
} from "./contexts/PageTransitionContext";

const ChatbotWidget = lazy(() => import("./components/ChatbotWidget"));
// Dữ liệu tải trước khi chạm link (bộ từ + thẻ dùng chung cho chi tiết bộ và mọi chế độ học)
const taiDuLieuBo = ({ deckId }) =>
  Number(deckId) > 0 && Promise.all([layDeckTheoId(deckId), layCardsTheoDeck(deckId)]);
// Trang cần đăng nhập: chưa có token thì không tải (sẽ bị chuyển sang đăng nhập)
const taiDuLieuBaiHoc = ({ courseId, soBai }) => getStoredAuthToken() && layBaiHoc(courseId, soBai);
const taiDuLieuDashboard = () =>
  getStoredAuthToken() &&
  Promise.all([layDanhSachDeck(), getUserStats(), layStudySessionSummary(), layDanhSachKhoaHoc()]);
const TrangChu = lazy(dangKyTrang("/", () => import("./pages/TrangChu")));
const TrangTuVung = lazy(dangKyTrang("/decks", () => import("./pages/TrangTuVung")));
const TrangDashboard = lazy(dangKyTrang("/dashboard", () => import("./pages/TrangDashboard"), taiDuLieuDashboard));
const TrangChiTietBo = lazy(dangKyTrang("/decks/:deckId", () => import("./pages/TrangChiTietBo"), taiDuLieuBo));
const TrangThemTu = lazy(dangKyTrang("/decks/:deckId/add-word", () => import("./pages/TrangThemTu")));
const TrangFlashcard = lazy(dangKyTrang("/decks/:deckId/flashcard", () => import("./pages/TrangFlashcard"), taiDuLieuBo));
const taiTrangQuiz = () => import("./pages/TrangQuiz");
dangKyTrang("/decks/:deckId/quiz", taiTrangQuiz, taiDuLieuBo);
dangKyTrang("/decks/:deckId/ngu-canh", taiTrangQuiz, taiDuLieuBo);
const TrangQuiz = lazy(taiTrangQuiz);
const taiTrangTuLuan = () => import("./pages/TrangTuLuan");
dangKyTrang("/decks/:deckId/tu-luan", taiTrangTuLuan, taiDuLieuBo);
dangKyTrang("/decks/:deckId/nghe-viet", taiTrangTuLuan, taiDuLieuBo);
dangKyTrang("/decks/:deckId/hon-hop", taiTrangTuLuan, taiDuLieuBo);
const TrangTuLuan = lazy(taiTrangTuLuan);
const TrangNoiTu = lazy(dangKyTrang("/decks/:deckId/noi-tu", () => import("./pages/TrangNoiTu"), taiDuLieuBo));
const TrangLuyenCau = lazy(dangKyTrang("/decks/:deckId/luyen-cau", () => import("./pages/TrangLuyenCau")));
const TrangLuyenTap = lazy(dangKyTrang("/practice", () => import("./pages/TrangLuyenTap")));
const TrangChiTietLoTrinh = lazy(dangKyTrang("/roadmap/:slug", () => import("./pages/TrangChiTietLoTrinh")));
const TrangTuSai = lazy(dangKyTrang("/tu-sai", () => import("./pages/TrangTuSai")));
const TrangOnTapHomNay = lazy(dangKyTrang("/review", () => import("./pages/TrangOnTapHomNay")));
const TrangKhongTimThay = lazy(() => import("./pages/TrangKhongTimThay"));
const TrangDangNhap = lazy(dangKyTrang("/login", () => import("./pages/TrangDangNhap")));
const TrangDangKy = lazy(dangKyTrang("/register", () => import("./pages/TrangDangKy")));
const TrangCaiDat = lazy(dangKyTrang("/cai-dat", () => import("./pages/TrangCaiDat")));
const TrangThongKe = lazy(dangKyTrang("/stats", () => import("./pages/TrangThongKe")));
const TrangKhoaHoc = lazy(dangKyTrang("/khoa-hoc", () => import("./pages/TrangKhoaHoc")));
const TrangBaiHoc = lazy(dangKyTrang("/khoa-hoc/:courseId/bai/:soBai", () => import("./pages/TrangBaiHoc"), taiDuLieuBaiHoc));
const TrangOnCauHoi = lazy(dangKyTrang("/khoa-hoc/on-tap", () => import("./pages/TrangOnCauHoi")));

// Mở app: tải JS + dữ liệu của trang đang mở ngay, song song với bước xác minh đăng nhập (/auth/me),
// thay vì đợi xác minh xong mới bắt đầu tải. Token hết hạn thì request trả 401 giống /auth/me.
taiTruocTheoDuongDan(window.location.pathname, { kemDuLieu: true });

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
// Trang hay vào nhất, tải dần lúc rảnh (đường dẫn mẫu chỉ để chọn đúng chunk)
const TRANG_HAY_VAO_KHI_DANG_NHAP = [
  "/dashboard", "/khoa-hoc", "/decks", "/review", "/decks/0", "/khoa-hoc/0/bai/1",
  "/practice", "/decks/0/flashcard", "/decks/0/quiz", "/decks/0/tu-luan",
];
const TRANG_HAY_VAO_KHI_LA_KHACH = ["/khoa-hoc", "/decks", "/decks/0", "/decks/0/flashcard", "/decks/0/quiz", "/login"];

function UngDung() {
  const viTri = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(
    () => batTaiTruocTrang(isAuthenticated ? TRANG_HAY_VAO_KHI_DANG_NHAP : TRANG_HAY_VAO_KHI_LA_KHACH),
    [isAuthenticated]
  );
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
          <Route path="/decks/:deckId/luyen-cau" element={<TrangLuyenCau />} />
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
