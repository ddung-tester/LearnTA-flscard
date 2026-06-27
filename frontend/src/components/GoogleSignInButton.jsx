/**
 * GoogleSignInButton — dùng google.accounts.id.renderButton (cách chuẩn nhất)
 * Google tự render button trong iframe → không bị popup-blocked.
 *
 * Props:
 *   onToken(idToken: string) — gọi khi Google trả về credential (id_token)
 *   disabled?: boolean
 */
import { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onToken, disabled = false }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initButton() {
      if (initializedRef.current || !containerRef.current) return;
      if (!window.google?.accounts?.id) return;

      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          if (credential && onToken) onToken(credential);
        },
        cancel_on_tap_outside: true,
      });

      const width = containerRef.current.offsetWidth || 320;

      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.min(width, 400),
      });
    }

    // Nếu script chưa có → thêm vào
    if (!document.getElementById("gsi-script")) {
      const script = document.createElement("script");
      script.id = "gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initButton;
      document.head.appendChild(script);
    } else {
      // Script đã có (navigate sang trang khác rồi quay lại)
      if (window.google?.accounts?.id) {
        initButton();
      } else {
        document.getElementById("gsi-script").addEventListener("load", initButton);
      }
    }
  }, [onToken]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "opacity 180ms",
      }}
    >
      {/* Google tự render button vào đây */}
      <div ref={containerRef} style={{ width: "100%", minHeight: "44px" }} />
    </div>
  );
}
