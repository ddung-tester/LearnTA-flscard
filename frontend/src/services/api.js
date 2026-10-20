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
// Mỗi lần gọi chờ tối đa 25 s; GET còn tự gọi lại 2 lần (xem nenThuLai) nên chịu được ~80 s
// Render khởi động lại sau khi ngủ. Lệnh gọi AI tự đặt THOI_GIAN_CHO_AI_MS.
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

// Máy chủ (Render gói miễn phí) ngủ sau 15 phút không dùng, lần gọi đầu chờ 30–60 s.
// GET chờ quá 6 s thì báo "máy chủ đang khởi động" (ThongBaoMayChu) để người học biết phải chờ;
// GET lỗi mạng, hết giờ hoặc 502/503/504 thì tự gọi lại tối đa 2 lần (đọc nên gọi lại an toàn).
const CHO_BAO_CHAM_MS = 6000;
const SO_LAN_THU_LAI_GET = 2;
const MA_LOI_TAM_THOI = new Set([502, 503, 504]);
// Mã request → { hen, cham }. config chỉ giữ mã (số): axios sao chép config khi gọi lại
const dangCho = new Map();
let maChoTiepTheo = 1;
const nguoiNgheMayChu = new Set();
let mayChuCham = false;

function datMayChuCham(giaTri) {
  if (giaTri === mayChuCham) return;
  mayChuCham = giaTri;
  nguoiNgheMayChu.forEach((baoDoi) => baoDoi());
}

export function theoDoiMayChuCham(baoDoi) {
  nguoiNgheMayChu.add(baoDoi);
  return () => nguoiNgheMayChu.delete(baoDoi);
}

export function layMayChuCham() {
  return mayChuCham;
}

function batDauCho(config) {
  if (laRequestGhi(config) || config.maCho) return;
  const ma = maChoTiepTheo++;
  const muc = { cham: false };
  muc.hen = setTimeout(() => {
    muc.cham = true;
    datMayChuCham(true);
  }, CHO_BAO_CHAM_MS);
  dangCho.set(ma, muc);
  config.maCho = ma;
}

function ketThucCho(config) {
  const muc = dangCho.get(config?.maCho);
  if (!muc) return;
  clearTimeout(muc.hen);
  dangCho.delete(config.maCho);
  if (![...dangCho.values()].some((m) => m.cham)) datMayChuCham(false);
}

function nenThuLai(error) {
  const config = error.config;
  if (!config || laRequestGhi(config) || axios.isCancel(error) || config.signal?.aborted) return false;
  if ((config.lanThuLai || 0) >= SO_LAN_THU_LAI_GET) return false;
  return !error.response || MA_LOI_TAM_THOI.has(error.response.status);
}

api.interceptors.request.use((config) => {
  if (laRequestGhi(config)) xoaBoNhoGet();
  batDauCho(config);
  return config;
}, undefined, { synchronous: true });

api.interceptors.response.use(
  (response) => {
    ketThucCho(response.config);
    // Xoá cả lúc ghi xong: GET chạy song song với request ghi có thể đã lưu bản trước khi ghi
    if (laRequestGhi(response.config)) xoaBoNhoGet();
    return response;
  },
  (error) => {
    if (nenThuLai(error)) {
      const config = error.config;
      config.lanThuLai = (config.lanThuLai || 0) + 1;
      return new Promise((xong) => setTimeout(xong, 1500 * config.lanThuLai)).then(() => api.request(config));
    }
    ketThucCho(error.config);
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
        ? "Máy chủ phản hồi chậm. Chờ thêm chút rồi thử lại nhé."
        : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");

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
