import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { ghiTrang, ghiViTriCuon, idxHienTai, layViTriCuon } from "../utils/lichSuDieuHuong";

const CHO_TOI_DA_MS = 3000;

/**
 * Nhớ trang đã qua + vị trí cuộn của từng mục lịch sử; bấm Back / Forward của trình duyệt thì cuộn về chỗ cũ.
 * Trang vẽ sau khi dữ liệu về nên chờ trang đủ dài (và màn chờ chuyển trang tắt) rồi mới cuộn;
 * người học tự cuộn / chạm trước thì thôi.
 */
export default function useNhoViTriCuon() {
  const viTri = useLocation();
  const kieuDieuHuong = useNavigationType();
  const dangKhoiPhucRef = useRef(false);
  const duongDanTruocRef = useRef(null);

  useEffect(() => {
    // Tự khôi phục của trình duyệt chạy lúc trang mới chưa có nội dung → luôn về đầu trang
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    let khung = 0;
    const khiCuon = () => {
      // Đang chuyển trang: trang cũ co lại làm trình duyệt kéo vị trí cuộn — không ghi đè vị trí thật
      if (khung || dangKhoiPhucRef.current || document.body.classList.contains("is-page-loading")) return;
      khung = requestAnimationFrame(() => {
        khung = 0;
        if (!dangKhoiPhucRef.current) ghiViTriCuon(idxHienTai(), window.scrollY);
      });
    };
    window.addEventListener("scroll", khiCuon, { passive: true });
    return () => {
      window.removeEventListener("scroll", khiCuon);
      cancelAnimationFrame(khung);
    };
  }, []);

  useLayoutEffect(() => {
    const idx = idxHienTai();
    // Đọc vị trí cũ trước khi trang mới vẽ (sự kiện cuộn do trang ngắn lại sẽ ghi đè)
    const y = kieuDieuHuong === "POP" ? layViTriCuon(idx) : 0;
    ghiTrang(idx, `${viTri.pathname}${viTri.search}`, { catNhanh: kieuDieuHuong === "PUSH" });
    // Mở trang mới: về đầu trang (chỉ đổi query, vd. tab / bộ lọc, thì giữ chỗ đang xem)
    if (kieuDieuHuong === "PUSH" && viTri.pathname !== duongDanTruocRef.current) window.scrollTo(0, 0);
    duongDanTruocRef.current = viTri.pathname;
    if (!y) return undefined;

    dangKhoiPhucRef.current = true;
    const batDau = performance.now();
    let khung = 0;
    const xong = () => {
      dangKhoiPhucRef.current = false;
      cancelAnimationFrame(khung);
      window.removeEventListener("wheel", xong);
      window.removeEventListener("touchstart", xong);
      window.removeEventListener("keydown", xong);
    };
    const thu = () => {
      const duDai = document.documentElement.scrollHeight - window.innerHeight >= y - 4;
      const hetCho = performance.now() - batDau > CHO_TOI_DA_MS;
      if ((duDai && !document.body.classList.contains("is-page-loading")) || hetCho) {
        window.scrollTo(0, y);
        xong();
        return;
      }
      khung = requestAnimationFrame(thu);
    };
    window.addEventListener("wheel", xong, { passive: true });
    window.addEventListener("touchstart", xong, { passive: true });
    window.addEventListener("keydown", xong);
    khung = requestAnimationFrame(thu);
    return xong;
  }, [viTri.key, viTri.pathname, viTri.search, kieuDieuHuong]);
}
