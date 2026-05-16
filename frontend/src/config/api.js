export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export function buildApiUrl(path = "") {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = String(path).replace(/^\/+/, "");

  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
}
