import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import UngDung from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { PageTransitionProvider } from "./contexts/PageTransitionContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PageTransitionProvider>
        <ToastProvider>
          <AuthProvider>
            <UngDung />
          </AuthProvider>
        </ToastProvider>
      </PageTransitionProvider>
    </BrowserRouter>
  </StrictMode>
);
