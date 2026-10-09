import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, MotionConfig } from "motion/react";
import UngDung from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ChatbotProvider } from "./contexts/ChatbotContext.jsx";
import { PageTransitionProvider } from "./contexts/PageTransitionContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import "./index.css";
import "./styles/hieu-ung.css";
import "./styles/den-ban.css";

const taiTinhNangMotion = () => import("./utils/tinhNangMotion.js").then((mod) => mod.default);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Tôn trọng cài đặt giảm chuyển động của hệ điều hành cho mọi animation motion */}
    <MotionConfig reducedMotion="user">
      <LazyMotion features={taiTinhNangMotion}>
      <BrowserRouter>
        <PageTransitionProvider>
          <ToastProvider>
            <AuthProvider>
              <ChatbotProvider>
                <UngDung />
              </ChatbotProvider>
            </AuthProvider>
          </ToastProvider>
        </PageTransitionProvider>
      </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>
);
