/**
 * GoogleSignInButton — dùng google.accounts.id.renderButton (cách chuẩn nhất)
 * Google tự render button trong iframe → không bị popup-blocked.
 *
 * Props:
 *   onToken(idToken: string) — gọi khi Google trả về credential (id_token)
 *   disabled?: boolean
 *   variant?: "signin" | "signup"  — đổi text hiển thị
 */
import { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({
  onToken,
  disabled = false,
  variant = "signin",
}) {
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

      renderBtn();
    }

    function renderBtn() {
      if (!containerRef.current || !window.google?.accounts?.id) return;

      // Lấy width thực tế của container (đảm bảo DOM đã layout xong)
      const width = containerRef.current.getBoundingClientRect().width || 380;

      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        // signin_with → "Đăng nhập bằng Google"
        // signup_with → "Đăng ký bằng Google"
        text: variant === "signup" ? "signup_with" : "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.floor(width),
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
    } else if (window.google?.accounts?.id) {
      initButton();
    } else {
      document.getElementById("gsi-script").addEventListener("load", initButton);
    }
  }, [onToken, variant]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      style={{
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "opacity 180ms",
        width: "100%",
      }}
    >
      {/* Google tự render button vào đây */}
      <div ref={containerRef} style={{ width: "100%", minHeight: "44px" }} />
    </div>
  );
}
