import axios from "axios";
import { buildApiUrl } from "../config/api";

export const AUTH_TOKEN_STORAGE_KEY = "hocTA.authToken";

const api = axios.create({
  baseURL: buildApiUrl("/api"),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

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
    const message =
      error.response?.data?.message ||
      "Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.";

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.response = error.response;

    return Promise.reject(normalizedError);
  }
);

export default api;
