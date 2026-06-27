import api from "./api";

export async function dangKyTaiKhoan(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function dangNhapTaiKhoan(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

export async function dangNhapGoogle(idToken) {
  const response = await api.post("/auth/google", { id_token: idToken });
  return response.data;
}

export async function layNguoiDungHienTai() {
  const response = await api.get("/auth/me");
  return response.data.user;
}
