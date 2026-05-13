import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BoCuc from "./components/common/BoCuc";
import VideoBackground from "./components/VideoBackground";
import {
  BACKGROUND_DEFAULT_VIDEO,
  BACKGROUND_QUIZ_VIDEO,
} from "./constants/backgrounds";
import TrangChu from "./pages/TrangChu";
import TrangDanhSachBo from "./pages/TrangDanhSachBo";
import TrangChiTietBo from "./pages/TrangChiTietBo";
import TrangThemTu from "./pages/TrangThemTu";
import TrangFlashcard from "./pages/TrangFlashcard";
import TrangQuiz from "./pages/TrangQuiz";
import TrangTuLuan from "./pages/TrangTuLuan";
import TrangDangNhap from "./pages/TrangDangNhap";
import TrangDangKy from "./pages/TrangDangKy";

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
  const backgroundVariant = laTrangImmersive
    ? "auth"
    : laPhienHoc
      ? "study"
      : "default";
  const backgroundSrc = laTrangImmersive
    ? BACKGROUND_DEFAULT_VIDEO
    : BACKGROUND_QUIZ_VIDEO;

  const noiDungRoutes = (
    <Routes>
      <Route element={<BoCuc />}>
        <Route path="/" element={<TrangChu />} />
        <Route path="/login" element={<TrangDangNhap />} />
        <Route path="/register" element={<TrangDangKy />} />
        <Route path="/decks" element={<TrangDanhSachBo />} />
        <Route path="/decks/:deckId" element={<TrangChiTietBo />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/decks/:deckId/add-word" element={<TrangThemTu />} />
        </Route>
        <Route path="/decks/:deckId/flashcard" element={<TrangFlashcard />} />
        <Route path="/decks/:deckId/quiz" element={<TrangQuiz />} />
        <Route path="/decks/:deckId/tu-luan" element={<TrangTuLuan />} />
      </Route>
    </Routes>
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
