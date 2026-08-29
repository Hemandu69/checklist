"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  id: number;
  message: string;
  variant: "error" | "success";
}

interface ToastContextValue {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: Toast["variant"]) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const showError = useCallback((message: string) => push(message, "error"), [push]);
  const showSuccess = useCallback((message: string) => push(message, "success"), [push]);

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="modal-surface pointer-events-auto flex max-w-md animate-[toast-in_0.35s_cubic-bezier(0.16,1,0.3,1)] items-start gap-2.5 rounded-2xl px-4 py-3 text-sm"
          >
            {t.variant === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--danger)]" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
            )}
            <span className="text-[color:var(--text-primary)]">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 shrink-0 rounded-full p-0.5 text-[color:var(--text-tertiary)] transition hover:text-[color:var(--text-primary)]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
