import api from "./api";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function layMistakes(params = {}) {
  const response = await api.get("/mistakes", { params: cleanParams(params) });
  return response.data;
}

export async function luuMistake(payload) {
  const response = await api.post("/mistakes", payload);
  return response.data;
}

export async function dongBoMistakes(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { synced_count: 0, mistakes: [] };
  }

  const response = await api.post("/mistakes/bulk", { items });
  return response.data;
}

export async function capNhatMistake(mistakeId, payload) {
  const response = await api.patch(`/mistakes/${mistakeId}`, payload);
  return response.data;
}

export async function xoaMistake(mistakeId) {
  const response = await api.delete(`/mistakes/${mistakeId}`);
  return response.data;
}

export async function xoaMistakes(params = {}) {
  const response = await api.delete("/mistakes", { params: cleanParams(params) });
  return response.data;
}
