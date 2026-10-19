import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

/**
 * Danh sách tiến độ ôn, kèm mốc đồng bộ của server (header X-Dong-Bo-Luc, null nếu server chưa gửi):
 * lần sau gửi lại làm `since` để chỉ nhận các dòng đã đổi.
 */
export async function layReviewsKemMoc(params = {}) {
  const response = await api.get("/reviews", { params: cleanParams(params) });
  return { items: response.data, moc: response.headers?.["x-dong-bo-luc"] || null };
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

// payload: { result: "correct" | "wrong" } hoặc { level: 0-5 }
export async function capNhatReviewResultTheoCard(cardId, payload) {
  const response = await api.patch(`/reviews/by-card/${cardId}/result`, payload);
  return response.data;
}

export async function xoaReviewTheoCard(cardId) {
  const response = await api.delete(`/reviews/by-card/${cardId}`);
  return response.data;
}
