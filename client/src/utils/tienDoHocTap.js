const KHO_TIEN_DO = "hoc_tu_vung_progress";

function coTheDungLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function docTatCaTienDo() {
  if (!coTheDungLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(KHO_TIEN_DO);
    if (!raw) return {};

    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function ghiTatCaTienDo(data) {
  if (!coTheDungLocalStorage()) return;

  try {
    window.localStorage.setItem(KHO_TIEN_DO, JSON.stringify(data));
  } catch {
    // localStorage co the bi chan hoac day dung luong. Bo qua de app van chay.
  }
}

export function layTienDoDeck(deckId) {
  const tatCaTienDo = docTatCaTienDo();
  return tatCaTienDo[String(deckId)] || null;
}

export function luuTienDoFlashcard(deckId, ketQua) {
  const tatCaTienDo = docTatCaTienDo();
  const key = String(deckId);
  const hienTai = tatCaTienDo[key] || {};
  const thoiDiem = new Date().toISOString();

  tatCaTienDo[key] = {
    ...hienTai,
    flashcard: {
      remembered: ketQua.remembered,
      review: ketQua.review,
      total: ketQua.total,
      lastStudiedAt: thoiDiem,
    },
    lastActivityAt: thoiDiem,
  };

  ghiTatCaTienDo(tatCaTienDo);
}

export function luuTienDoQuiz(deckId, ketQua) {
  const tatCaTienDo = docTatCaTienDo();
  const key = String(deckId);
  const hienTai = tatCaTienDo[key] || {};
  const thoiDiem = new Date().toISOString();

  tatCaTienDo[key] = {
    ...hienTai,
    quiz: {
      correct: ketQua.correct,
      review: ketQua.review,
      total: ketQua.total,
      lastQuizAt: thoiDiem,
    },
    lastActivityAt: thoiDiem,
  };

  ghiTatCaTienDo(tatCaTienDo);
}

export function dinhDangNgayHoc(isoString) {
  if (!isoString) return "";

  const ngay = new Date(isoString);
  if (Number.isNaN(ngay.getTime())) return "";

  return ngay.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
