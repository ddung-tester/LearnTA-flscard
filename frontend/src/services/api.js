import axios from "axios";
import { buildApiUrl } from "../config/api";
import { chonKhoHocTap } from "../utils/khoHocTap";
import { baoLoi } from "../utils/baoLoi";

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

// Bộ nhớ đệm GET ngắn hạn cho dữ liệu đọc nhiều (bộ từ, thẻ, khoá học, thống kê): quay lại trang
// hoặc mở trang vừa được tải trước khi chạm link thì có dữ liệu ngay. Mọi request ghi
// (POST/PUT/PATCH/DELETE) và đổi tài khoản xoá sạch nên không bao giờ thấy dữ liệu cũ sau khi ghi.
const BO_NHO_GET_MS = 20000;
const boNhoGet = new Map();

export function xoaBoNhoGet() {
  boNhoGet.clear();
}

function updateToken(token) {
  const nextToken = token || null;
  if (nextToken === inMemoryAuthToken) return;
  xoaBoNhoGet();
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

// Mạng điện thoại chập chờn có thể giữ request treo nhiều phút → trang đứng ở màn chờ.
// 25 s đủ cho Cloud Run khởi động lạnh + 4G chậm; lệnh gọi AI tự đặt THOI_GIAN_CHO_AI_MS.
// Lưu kết quả học hết giờ thì vào hàng chờ gửi lại như lỗi mạng (có mã chống ghi trùng).
export const THOI_GIAN_CHO_AI_MS = 90000;

const api = axios.create({
  baseURL: buildApiUrl("/api"),
  timeout: 25000,
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

const laRequestGhi = (config) => !["get", "head", "options"].includes(String(config?.method || "get").toLowerCase());

api.interceptors.request.use((config) => {
  if (laRequestGhi(config)) xoaBoNhoGet();
  return config;
}, undefined, { synchronous: true });

api.interceptors.response.use(
  (response) => {
    // Xoá cả lúc ghi xong: GET chạy song song với request ghi có thể đã lưu bản trước khi ghi
    if (laRequestGhi(response.config)) xoaBoNhoGet();
    return response;
  },
  (error) => {
    if (laRequestGhi(error.config)) xoaBoNhoGet();
    const status = error.response?.status;
    if (status >= 500) {
      baoLoi("api", `${String(error.config?.method || "get").toUpperCase()} ${error.config?.url} → ${status}`);
    }
    const requestUrl = String(error.config?.url || "");
    const isCredentialAttempt = /^\/auth\/(login|register|google)$/.test(requestUrl);

    if (status === 401 && !isCredentialAttempt && getStoredAuthToken() &&
        error.config?.authToken === getStoredAuthToken()) {
      clearStoredAuthToken();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "Mạng chậm, chưa nhận được phản hồi. Thử lại nhé."
        : "Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.");

    const normalizedError = new Error(message);
    normalizedError.status = status;
    normalizedError.response = error.response;
    normalizedError.code = error.code;

    return Promise.reject(normalizedError);
  }
);

/**
 * GET có bộ nhớ đệm 20 giây (theo tài khoản + url + params). Mỗi lần gọi nhận một bản sao riêng
 * để trang này sửa mảng/đối tượng không ảnh hưởng trang khác. Lỗi thì không lưu.
 */
export function layCoBoNho(url, config) {
  const khoa = `${inMemoryAuthToken || ""}|${url}|${JSON.stringify(config?.params || {})}`;
  const daCo = boNhoGet.get(khoa);
  if (daCo && Date.now() - daCo.luc < BO_NHO_GET_MS) {
    return daCo.hua.then((data) => structuredClone(data));
  }
  const hua = api.get(url, config).then((response) => response.data);
  boNhoGet.set(khoa, { luc: Date.now(), hua });
  hua.catch(() => {
    if (boNhoGet.get(khoa)?.hua === hua) boNhoGet.delete(khoa);
  });
  return hua.then((data) => structuredClone(data));
}

export default api;
