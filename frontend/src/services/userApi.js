import api from "./api";

/** Lấy thống kê streak + xp của user đang đăng nhập. */
export async function getUserStats() {
  const { data } = await api.get("/user/stats");
  return data;
}

/** Lấy settings của user (bao gồm email_reminders). */
export async function getUserSettings() {
  const { data } = await api.get("/user/settings");
  return data;
}

/** Cập nhật một hoặc nhiều fields trong settings (bao gồm email_reminders). */
export async function updateUserSettings(updates) {
  const { data } = await api.patch("/user/settings", updates);
  return data;
}
