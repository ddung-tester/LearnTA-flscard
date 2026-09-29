import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import UngDung from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ChatbotProvider } from "./contexts/ChatbotContext.jsx";
import { PageTransitionProvider } from "./contexts/PageTransitionContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Tôn trọng cài đặt giảm chuyển động của hệ điều hành cho mọi animation motion */}
    <MotionConfig reducedMotion="user">
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
    </MotionConfig>
  </StrictMode>
);
