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
