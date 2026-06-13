"use client";

// Transient notifications, mainly for transaction feedback. push() returns
// nothing; toasts auto-dismiss after `duration` ms (default 5000).

import { createContext, useCallback, useContext, useState } from "react";
import { txUrl } from "@/lib/constants";

type ToastType = "info" | "success" | "error";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  msg?: string;
  hash?: string;
  duration?: number;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, ...toast }]);
      setTimeout(() => dismiss(id), toast.duration ?? 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-region">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <div className="toast__head">
              <span className="toast__title">{t.title}</span>
              <button
                className="toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            {t.msg ? <div className="toast__msg">{t.msg}</div> : null}
            {t.hash ? (
              <a
                className="toast__hash"
                href={txUrl(t.hash)}
                target="_blank"
                rel="noreferrer"
              >
                tx: {t.hash.slice(0, 10)}…{t.hash.slice(-6)}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
