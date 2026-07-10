const LOCAL_API_BASE_URL = "http://localhost:8080";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? LOCAL_API_BASE_URL : "");

export function buildApiUrl(path = "") {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = String(path).replace(/^\/+/, "");

  if (!normalizedPath) return baseUrl;

  const pathWithLeadingSlash = `/${normalizedPath}`;
  const baseUrlAlreadyIncludesApi =
    /\/api$/i.test(baseUrl) &&
    (pathWithLeadingSlash === "/api" ||
      pathWithLeadingSlash.startsWith("/api/"));
  const normalizedBaseUrl = baseUrlAlreadyIncludesApi
    ? baseUrl.replace(/\/api$/i, "")
    : baseUrl;

  return `${normalizedBaseUrl}${pathWithLeadingSlash}`;
}
