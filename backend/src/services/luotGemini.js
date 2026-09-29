/**
 * luotGemini.js — nhớ model Gemini vừa báo hết lượt (429) để xếp nó xuống cuối một lúc.
 * Gói miễn phí tính hạn mức riêng cho từng model: thử ngay model còn lượt thay vì lần nào cũng
 * gọi lại model đã hết (tốn thêm 0.5–40s mỗi câu trả lời). Chỉ nhớ trong tiến trình (mỗi instance Cloud Run).
 */
const NGHI_SAU_429_MS = 60 * 1000;
const hetLuotDen = new Map();

const tenModel = (model) => (typeof model === "string" ? model : model.model);

function ghiNhanLoi(model, error, now = Date.now()) {
  if (error?.status === 429) hetLuotDen.set(tenModel(model), now + NGHI_SAU_429_MS);
}

/** Model còn lượt lên trước (giữ thứ tự ưu tiên), model đang nghỉ xuống cuối — vẫn được thử nếu hết cách. */
function xepTheoLuot(models, now = Date.now()) {
  const dangNghi = (model) => (hetLuotDen.get(tenModel(model)) || 0) > now;
  return [...models.filter((model) => !dangNghi(model)), ...models.filter(dangNghi)];
}

module.exports = { ghiNhanLoi, xepTheoLuot, NGHI_SAU_429_MS };
