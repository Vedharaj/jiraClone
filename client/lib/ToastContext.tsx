"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => showToast(message, "success", duration), [showToast]);
  const error = useCallback((message: string, duration?: number) => showToast(message, "error", duration), [showToast]);
  const warning = useCallback((message: string, duration?: number) => showToast(message, "warning", duration), [showToast]);
  const info = useCallback((message: string, duration?: number) => showToast(message, "info", duration), [showToast]);

  React.useEffect(() => {
    const handleError = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (msg) error(msg);
    };
    const handleSuccess = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (msg) success(msg);
    };

    window.addEventListener("toast:error", handleError);
    window.addEventListener("toast:success", handleSuccess);

    return () => {
      window.removeEventListener("toast:error", handleError);
      window.removeEventListener("toast:success", handleSuccess);
    };
  }, [error, success]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const typeStyles: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  },
  error: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    icon: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />,
  },
};

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const styles = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom duration-200 bg-white ${styles.border}`}
          >
            <div className="flex gap-3">
              {styles.icon}
              <div className="text-sm font-medium text-[#172B4D] break-words">
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#626F86] hover:text-[#172B4D] hover:bg-slate-100 p-0.5 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
