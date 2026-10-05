import axios from "axios";
import { buildApiUrl } from "../config/api";
import { chonKhoHocTap } from "../utils/khoHocTap";

export const AUTH_TOKEN_STORAGE_KEY = "hocTA.authToken";

function readTokenFromStorage() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

let inMemoryAuthToken = readTokenFromStorage();
let authRequests = new AbortController();

function updateToken(token) {
  const nextToken = token || null;
  if (nextToken === inMemoryAuthToken) return;
  authRequests.abort();
  authRequests = new AbortController();
  inMemoryAuthToken = nextToken;
  chonKhoHocTap(null);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:changed"));
}

if (typeof window !== "undefined") {
  window.addEventListener?.("storage", (event) => {
    if (event.key === AUTH_TOKEN_STORAGE_KEY || event.key === null) {
      updateToken(readTokenFromStorage());
    }
  });
}

export function getStoredAuthToken() {
  return inMemoryAuthToken;
}

export function storeAuthToken(token) {
  updateToken(token);
  try {
    if (inMemoryAuthToken) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, inMemoryAuthToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Memory fallback keeps the current tab usable when storage is blocked.
  }
}

export function clearStoredAuthToken() {
  storeAuthToken(null);
}

const api = axios.create({
  baseURL: buildApiUrl("/api"),
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  config.authToken = token;
  config.signal ??= authRequests.signal;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
}, undefined, { synchronous: true });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || "");
    const isCredentialAttempt = /^\/auth\/(login|register|google)$/.test(requestUrl);

    if (status === 401 && !isCredentialAttempt && getStoredAuthToken() &&
        error.config?.authToken === getStoredAuthToken()) {
      clearStoredAuthToken();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    const message =
      error.response?.data?.message ||
      "Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.";

    const normalizedError = new Error(message);
    normalizedError.status = status;
    normalizedError.response = error.response;

    return Promise.reject(normalizedError);
  }
);

export default api;
