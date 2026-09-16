import api from "./api";

export async function layCardsTheoDeck(deckId) {
  const response = await api.get(`/decks/${deckId}/cards`);
  return response.data;
}

export async function taoCard(deckId, payload) {
  const response = await api.post(`/decks/${deckId}/cards`, payload);
  return response.data;
}

export async function importCards(deckId, cards) {
  const response = await api.post(`/decks/${deckId}/cards/import`, { cards });
  return response.data;
}

export async function doiThuTuCards(deckId, cardIds) {
  const response = await api.patch(`/decks/${deckId}/cards/reorder`, {
    card_ids: cardIds,
  });
  return response.data;
}

export async function capNhatCard(cardId, payload) {
  const response = await api.put(`/cards/${cardId}`, payload);
  return response.data;
}

export async function toggleFavoriteCard(cardId, isFavorite) {
  const response = await api.patch(`/cards/${cardId}/favorite`, {
    is_favorite: isFavorite,
  });
  return response.data;
}

export async function xoaCard(cardId) {
  const response = await api.delete(`/cards/${cardId}`);
  return response.data;
}

/**
 * Gọi AI sinh 6 câu mẫu theo 6 thì cho một từ vựng.
 * @param {{ term_en: string, meaning_vi: string, part_of_speech?: string }} payload
 * @returns {Promise<Array>} Mảng 6 objects { tense, formula, sentence, highlight, translation }
 */
export async function sinhCauMauAI(payload) {
  const response = await api.post("/cards/generate-examples", payload);
  return response.data.examples;
}
