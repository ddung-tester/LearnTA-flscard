/**
 * Nơi quay về sau khi học thẻ / luyện tập bộ từ của một buổi học.
 * Bấm "Học bằng thẻ" hoặc "Luyện tập" trong bước Từ vựng của buổi thì ghi lại buổi đó; các trang học
 * (thẻ, quiz, tự luận...) dùng layNoiVe cho nút quay lại để về thẳng buổi thay vì trang bộ từ.
 * Chỉ giữ trong thẻ trình duyệt đang mở (sessionStorage); bộ khác hoặc mở thẳng link thì về trang bộ từ.
 */
const KHOA_LUU = "hocTA.noiVeBuoi";

export function ghiNoiVeBuoi(deckId, duongDan) {
  try {
    sessionStorage.setItem(KHOA_LUU, JSON.stringify({ deckId: String(deckId), duongDan }));
  } catch {
    // Bộ nhớ trình duyệt bị chặn: nút quay lại về trang bộ từ như cũ
  }
}

/** Đường quay về của bộ deckId: buổi học vừa mở bộ này, không có thì macDinh */
export function layNoiVe(deckId, macDinh) {
  try {
    const daLuu = JSON.parse(sessionStorage.getItem(KHOA_LUU) || "null");
    if (daLuu && daLuu.deckId === String(deckId) && typeof daLuu.duongDan === "string") return daLuu.duongDan;
  } catch {
    // bỏ qua
  }
  return macDinh;
}
