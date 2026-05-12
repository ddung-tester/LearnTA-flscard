import { useEffect } from "react";

function ToastMessage({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      onDone?.();
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="ui-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default ToastMessage;
