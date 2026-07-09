import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function layReviews(params = {}) {
  const response = await api.get("/reviews", { params: cleanParams(params) });
  return response.data;
}

export async function layReviewsDenHan(params = {}) {
  const response = await api.get("/reviews/due", { params: cleanParams(params) });
  return response.data;
}

export async function luuReview(payload) {
  const response = await api.post("/reviews", payload);
  return response.data;
}

export async function dongBoReviews(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { synced_count: 0, reviews: [] };
  }

  const response = await api.post("/reviews/bulk", { items });
  return response.data;
}

export async function capNhatReviewResult(reviewId, result) {
  const response = await api.patch(`/reviews/${reviewId}/result`, { result });
  return response.data;
}

export async function capNhatReviewResultTheoCard(cardId, result) {
  const response = await api.patch(`/reviews/by-card/${cardId}/result`, { result });
  return response.data;
}
