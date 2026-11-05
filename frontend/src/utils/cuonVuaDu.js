/**
 * cuonVuaDu — màn một cột (điện thoại, Fold dọc): sau khi trả lời, cuộn VỪA ĐỦ để thấy trọn khối kết quả
 * phía trên thanh "Tiếp tục" dính đáy, nhưng không đẩy đầu khối kết quả khuất dưới header
 * (câu hỏi vẫn còn trong tầm nhìn nếu đủ chỗ).
 * khung: phần tử bọc khối kết quả (không chạy hiệu ứng transform, nên số đo đúng kích thước thật).
 */
export function cuonVuaDu(khung) {
  if (!khung) return;
  const header = document.querySelector(".app-shell-header");
  const dinh =
    header && ["sticky", "fixed"].includes(getComputedStyle(header).position) ? header.getBoundingClientRect().bottom : 0;
  // Thanh "Tiếp tục" có thể còn đang trượt lên: lấy chỗ nó sẽ nằm (chiều cao thật), không lấy vị trí lúc trượt
  const thanh = document.querySelector(".ui-thanh-tiep-tuc--co-dinh");
  const day = window.innerHeight - (thanh?.offsetHeight ?? 0);
  const r = khung.getBoundingClientRect();
  // Khoảng trống chừa cho thanh dính đáy không cần đưa vào tầm nhìn
  const choTrong = khung.querySelector(".ui-thanh-tiep-tuc__cho-trong")?.offsetHeight ?? 0;
  const cuon = Math.min(r.bottom - choTrong + 12 - day, r.top - dinh - 12);
  if (cuon <= 4) return;
  const giamChuyenDong = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollBy({ top: cuon, behavior: giamChuyenDong ? "auto" : "smooth" });
}
