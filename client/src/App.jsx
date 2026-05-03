import { Routes, Route } from "react-router-dom";
import BoCuc from "./components/common/BoCuc";
import TrangChu from "./pages/TrangChu";
import TrangDanhSachBo from "./pages/TrangDanhSachBo";
import TrangChiTietBo from "./pages/TrangChiTietBo";
import TrangThemTu from "./pages/TrangThemTu";
import TrangFlashcard from "./pages/TrangFlashcard";
import TrangQuiz from "./pages/TrangQuiz";

/**
 * UngDung — Routing chinh.
 * BoCuc boc cac trang con, tru TrangChu co layout rieng.
 */
function UngDung() {
  return (
    <Routes>
      <Route element={<BoCuc />}>
        <Route path="/" element={<TrangChu />} />
        <Route path="/decks" element={<TrangDanhSachBo />} />
        <Route path="/decks/:deckId" element={<TrangChiTietBo />} />
        <Route path="/decks/:deckId/add-word" element={<TrangThemTu />} />
        <Route path="/decks/:deckId/flashcard" element={<TrangFlashcard />} />
        <Route path="/decks/:deckId/quiz" element={<TrangQuiz />} />
      </Route>
    </Routes>
  );
}

export default UngDung;
