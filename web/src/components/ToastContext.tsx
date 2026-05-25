import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const toast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: "auto",
            minWidth: "280px",
            maxWidth: "420px",
            padding: "14px 18px",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            background:
              toast.type === "success"
                ? "#ecfdf5"
                : toast.type === "error"
                ? "#fef2f2"
                : toast.type === "warning"
                ? "#fffbeb"
                : "#f8fafc",
            border:
              toast.type === "success"
                ? "1px solid #a7f3d0"
                : toast.type === "error"
                ? "1px solid #fecaca"
                : toast.type === "warning"
                ? "1px solid #fde68a"
                : "1px solid #e2e8f0",
            color:
              toast.type === "success"
                ? "#065f46"
                : toast.type === "error"
                ? "#991b1b"
                : toast.type === "warning"
                ? "#92400e"
                : "#1e293b",
            fontSize: "0.85rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "toastSlideIn 0.3s ease-out",
            lineHeight: 1.4,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "20px",
              flexShrink: 0,
              color:
                toast.type === "success"
                  ? "#059669"
                  : toast.type === "error"
                  ? "#dc2626"
                  : toast.type === "warning"
                  ? "#d97706"
                  : "#475569",
            }}
          >
            {toast.type === "success"
              ? "check_circle"
              : toast.type === "error"
              ? "error"
              : toast.type === "warning"
              ? "warning"
              : "info"}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              color: "inherit",
              opacity: 0.6,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              close
            </span>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
