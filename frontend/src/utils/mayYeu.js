// Lớp "may-yeu" trên <html> do script trong index.html gắn trước khi vẽ (máy cảm ứng, ≤4 luồng CPU, ≤4GB RAM, tiết kiệm dữ liệu)
export function laMayYeu() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("may-yeu");
}
