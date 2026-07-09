import { createContext, useContext, useMemo, useCallback, useState } from "react";

const ToastContext = createContext(null);

const TOAST_DEFAULTS = {
  success: { duration: 3000, icon: "✓" },
  error: { duration: 5000, icon: "✕" },
  warning: { duration: 4000, icon: "!" },
  info: { duration: 3500, icon: "i" },
};

const MAX_TOASTS = 4;
let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // dismissToast must be declared before addToast (addToast closes over it)
  const dismissToast = useCallback((id) => {
    // Mark as leaving for exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  const addToast = useCallback(
    (type, title, message) => {
      const id = ++toastIdCounter;
      const config = TOAST_DEFAULTS[type] || TOAST_DEFAULTS.info;

      setToasts((prev) => {
        const next = [...prev, { id, type, title, message, leaving: false }];
        // Trim oldest if over limit
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });

      // Auto dismiss
      setTimeout(() => dismissToast(id), config.duration);

      return id;
    },
    [dismissToast]
  );

  // Stable object with convenience methods — avoids mutating a memoized value
  const toast = useMemo(
    () => ({
      show: (type, title, message) => addToast(type, title, message),
      success: (title, message) => addToast("success", title, message),
      error: (title, message) => addToast("error", title, message),
      warning: (title, message) => addToast("warning", title, message),
      info: (title, message) => addToast("info", title, message),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="ui-toast-container" aria-live="polite" role="log">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`ui-toast-item ui-toast-item--${t.type}${t.leaving ? " ui-toast-item--leaving" : ""}`}
              role="status"
            >
              <span
                className="ui-toast-item__icon"
                aria-hidden="true"
              >
                {TOAST_DEFAULTS[t.type]?.icon}
              </span>
              <div className="ui-toast-item__body">
                <p className="ui-toast-item__title">{t.title}</p>
                {t.message && (
                  <p className="ui-toast-item__message">{t.message}</p>
                )}
              </div>
              <button
                type="button"
                className="ui-toast-item__close"
                onClick={() => dismissToast(t.id)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
