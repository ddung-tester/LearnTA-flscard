import { useEffect } from "react";

/**
 * useHienKhiCuon — các phần tử con có [data-hien-khi-cuon] trong khungRef hiện dần khi cuộn tới.
 * Khung được gắn class ui-hien-khi-cuon (CSS ở styles/hieu-ung.css) chỉ khi hook chạy,
 * nên không có JS / giảm chuyển động thì nội dung vẫn hiện bình thường.
 */
export default function useHienKhiCuon(khungRef) {
  useEffect(() => {
    const khung = khungRef.current;
    if (!khung || !("IntersectionObserver" in window)) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const quanSat = new IntersectionObserver(
      (cacMuc) => {
        for (const muc of cacMuc) {
          if (!muc.isIntersecting) continue;
          muc.target.setAttribute("data-hien-khi-cuon", "da-hien");
          quanSat.unobserve(muc.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    khung.classList.add("ui-hien-khi-cuon");
    khung.querySelectorAll("[data-hien-khi-cuon]").forEach((el) => quanSat.observe(el));

    return () => {
      quanSat.disconnect();
      khung.classList.remove("ui-hien-khi-cuon");
    };
  }, [khungRef]);
}
