import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const THOI_GIAN_DONG_MODAL = 190;

function AnimatedModal({ open, onClose, labelledBy, className = "", children }) {
  const [dangRender, setDangRender] = useState(open);
  const [dangDong, setDangDong] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDangRender(true);
      setDangDong(false);
      return undefined;
    }

    if (!dangRender) return undefined;

    setDangDong(true);
    const timer = window.setTimeout(() => {
      setDangRender(false);
      setDangDong(false);
    }, THOI_GIAN_DONG_MODAL);

    return () => window.clearTimeout(timer);
  }, [dangRender, open]);

  useEffect(() => {
    if (!dangRender || !open) return undefined;

    const timer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [dangRender, open]);

  useEffect(() => {
    if (!dangRender) return undefined;

    function xuLyEsc(event) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", xuLyEsc);
    return () => window.removeEventListener("keydown", xuLyEsc);
  }, [dangRender, onClose]);

  if (!dangRender) return null;

  return createPortal(
    <div
      className={`ui-modal-backdrop ${dangDong ? "ui-modal-backdrop--closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`ui-modal-panel ${dangDong ? "ui-modal-panel--closing" : ""} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default AnimatedModal;
