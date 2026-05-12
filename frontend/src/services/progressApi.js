import api from "./api";

export async function layCardProgress(cardId) {
  const response = await api.get(`/cards/${cardId}/progress`);
  return response.data;
}

export async function capNhatCardProgress(cardId, payload) {
  const response = await api.patch(`/cards/${cardId}/progress`, payload);
  return response.data;
}
