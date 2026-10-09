import api, { layCoBoNho } from "./api";

/** scope "learnable": mọi bộ học được (tự tạo + khoá học + lộ trình), dùng cho trang Luyện tập */
export async function layDanhSachDeck({ scope } = {}) {
  return layCoBoNho("/decks", scope ? { params: { scope } } : undefined);
}

export async function layDeckTheoId(deckId) {
  return layCoBoNho(`/decks/${deckId}`);
}

export async function taoDeck(payload) {
  const response = await api.post("/decks", payload);
  return response.data;
}

export async function capNhatDeck(deckId, payload) {
  const response = await api.put(`/decks/${deckId}`, payload);
  return response.data;
}

export async function xoaDeck(deckId) {
  const response = await api.delete(`/decks/${deckId}`);
  return response.data;
}

export async function layQuizGanNhat(deckId) {
  const response = await api.get(`/decks/${deckId}/quiz-results/latest`);
  return response.data;
}
