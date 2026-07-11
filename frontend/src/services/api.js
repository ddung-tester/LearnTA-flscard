import axios from "axios";
import { buildApiUrl } from "../config/api";

export const AUTH_TOKEN_STORAGE_KEY = "hocTA.authToken";

function readTokenFromStorage() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

let inMemoryAuthToken = readTokenFromStorage();

export function getStoredAuthToken() {
  return inMemoryAuthToken;
}

export function storeAuthToken(token) {
  inMemoryAuthToken = token || null;
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

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || "");
    const isCredentialAttempt = /^\/auth\/(login|register|google)$/.test(requestUrl);

    if (status === 401 && !isCredentialAttempt && getStoredAuthToken()) {
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
