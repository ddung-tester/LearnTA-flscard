import { useEffect } from "react";

const PHAN_TU_BAM = [
  "button:not(:disabled)",
  "a[href]",
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]',
  ".ui-card-interactive",
  ".ui-action-card",
].join(", ");

/**
 * TuongTacNho — hiệu ứng nhỏ toàn web (gắn một lần ở gốc app, không vẽ gì):
 * - Bấm vào nút/liên kết: giọt mực loang ra tại điểm bấm.
 * - Nút chính (.ui-button--primary): hơi hút theo con trỏ khi rê chuột (chỉ chuột thật).
 * Tắt hết khi giảm chuyển động.
 */
function TuongTacNho() {
  useEffect(() => {
    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chuotThat = window.matchMedia("(hover: hover) and (pointer: fine)");
    let nutDangHut = null;

    function nhaNut() {
      nutDangHut?.style.removeProperty("--hut-x");
      nutDangHut?.style.removeProperty("--hut-y");
      nutDangHut = null;
    }

    function vetMuc(e) {
      if (giamChuyenDong.matches || e.button !== 0) return;
      if (!e.target.closest?.(PHAN_TU_BAM)) return;
      const giot = document.createElement("span");
      giot.className = "ui-vet-muc";
      giot.setAttribute("aria-hidden", "true");
      giot.style.left = `${e.clientX}px`;
      giot.style.top = `${e.clientY}px`;
      giot.style.setProperty("--xoay", `${Math.round(Math.random() * 360)}deg`);
      document.body.appendChild(giot);
      const xoa = () => giot.remove();
      giot.addEventListener("animationend", xoa, { once: true });
      // Dự phòng khi animation không chạy (tab ẩn)
      window.setTimeout(xoa, 1000);
    }

    function hut(e) {
      if (giamChuyenDong.matches || !chuotThat.matches || e.pointerType !== "mouse") return;
      const nut = e.target.closest?.(".ui-button--primary:not(:disabled)");
      if (nut !== nutDangHut) nhaNut();
      if (!nut) return;
      const r = nut.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      nut.style.setProperty("--hut-x", `${(dx * 10).toFixed(1)}px`);
      nut.style.setProperty("--hut-y", `${(dy * 6).toFixed(1)}px`);
      nutDangHut = nut;
    }

    document.addEventListener("pointerdown", vetMuc, { passive: true });
    document.addEventListener("pointermove", hut, { passive: true });
    document.documentElement.addEventListener("pointerleave", nhaNut);
    return () => {
      document.removeEventListener("pointerdown", vetMuc);
      document.removeEventListener("pointermove", hut);
      document.documentElement.removeEventListener("pointerleave", nhaNut);
      nhaNut();
    };
  }, []);

  return null;
}

export default TuongTacNho;
