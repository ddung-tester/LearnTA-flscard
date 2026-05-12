import api from "./api";

export async function layDanhSachDeck() {
  const response = await api.get("/decks");
  return response.data;
}

export async function layDeckTheoId(deckId) {
  const response = await api.get(`/decks/${deckId}`);
  return response.data;
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
