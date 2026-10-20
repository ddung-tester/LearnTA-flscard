import { useEffect } from "react";

/**
 * Điện thoại: bàn phím ảo mở (vùng nhìn thấy co lại) hoặc vừa chạm vào ô nhập thì đưa ô nhập
 * lên giữa vùng nhìn thấy, để bàn phím không che chữ đang gõ và nút gửi ngay dưới ô.
 * Ô còn nằm gọn trong vùng nhìn thấy thì không cuộn, tránh giật trang khi đang gõ.
 * Cùng cách với trang Tự luận (TrangTuLuan).
 */
export default function useDuaONhapVaoTam(inputRef) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    let khung = 0;
    const duaONhapVaoTam = () => {
      const oNhap = inputRef.current;
      if (!oNhap || document.activeElement !== oNhap) return;
      cancelAnimationFrame(khung);
      khung = requestAnimationFrame(() => {
        const r = oNhap.getBoundingClientRect();
        if (r.top >= vv.offsetTop && r.bottom <= vv.offsetTop + vv.height - 8) return;
        oNhap.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };
    vv.addEventListener("resize", duaONhapVaoTam);
    document.addEventListener("focusin", duaONhapVaoTam);
    return () => {
      cancelAnimationFrame(khung);
      vv.removeEventListener("resize", duaONhapVaoTam);
      document.removeEventListener("focusin", duaONhapVaoTam);
    };
  }, [inputRef]);
}
