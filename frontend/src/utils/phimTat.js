/**
 * laDangGoChu — phím đang được gõ vào ô nhập chữ (chatbot, ô tìm kiếm...).
 * Phím tắt toàn trang phải bỏ qua lúc này, nếu không Enter gửi chatbot cũng chuyển câu.
 * Ô nhập đã khoá (readOnly/disabled) không tính: sau khi trả lời, Enter ở đó vẫn là "tiếp tục".
 */
export function laDangGoChu(el) {
  if (!el?.closest) return false;
  if (el.closest("textarea, select, [contenteditable='true']")) return true;
  return el.tagName === "INPUT" && !el.readOnly && !el.disabled;
}
