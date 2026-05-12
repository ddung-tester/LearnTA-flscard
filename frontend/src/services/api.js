import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      "Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.";

    return Promise.reject(new Error(message));
  }
);

export default api;
