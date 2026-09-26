import api from "./api";

export async function layDanhSachLoTrinh() {
  const response = await api.get("/roadmaps");
  return response.data;
}

export async function layLoTrinh(slug) {
  const response = await api.get(`/roadmaps/${encodeURIComponent(slug)}`);
  return response.data;
}
