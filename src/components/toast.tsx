"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = { showToast: (message: string, variant?: ToastVariant) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, string> = { success: "✓", error: "×", warning: "!", info: "i" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++nextId.current;
    setToasts((items) => {
      const withoutDuplicate = items.filter((item) => item.message !== message || item.variant !== variant);
      return [...withoutDuplicate, { id, message, variant }].slice(-3);
    });
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" className="toast-stack">
        {toasts.map((toast) => (
          <div className={`app-toast app-toast-${toast.variant}`} key={toast.id} role="status">
            <span aria-hidden="true" className="app-toast-icon">{ICONS[toast.variant]}</span>
            <span className="app-toast-message">{toast.message}</span>
            <button aria-label="Tutup notifikasi" className="app-toast-close" onClick={() => dismiss(toast.id)} type="button">×</button>
            <span aria-hidden="true" className="app-toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
