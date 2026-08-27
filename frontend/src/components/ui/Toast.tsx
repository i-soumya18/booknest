"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { title: string; description?: string; type?: ToastType; duration?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      type = "info",
      duration = 4000,
    }: {
      title: string;
      description?: string;
      type?: ToastType;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, description, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, description?: string) => toast({ title, description, type: "success" }), [toast]);
  const error = useCallback((title: string, description?: string) => toast({ title, description, type: "error" }), [toast]);
  const info = useCallback((title: string, description?: string) => toast({ title, description, type: "info" }), [toast]);
  const warning = useCallback((title: string, description?: string) => toast({ title, description, type: "warning" }), [toast]);

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success": return "rgba(16, 185, 129, 0.4)";
      case "error": return "rgba(244, 63, 94, 0.4)";
      case "warning": return "rgba(245, 158, 11, 0.4)";
      case "info":
      default: return "rgba(56, 189, 248, 0.4)";
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success": return "✅";
      case "error": return "⚠️";
      case "warning": return "⚡";
      case "info":
      default: return "ℹ️";
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "380px",
          pointerEvents: "none",
        }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="design-card"
            style={{
              pointerEvents: "auto",
              padding: "12px 16px",
              background: "#0f1a2e",
              border: `1px solid ${getBorderColor(t.type)}`,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.6), 0 0 15px -3px rgba(56,189,248,0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{getIcon(t.type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#ffffff", marginBottom: t.description ? "2px" : 0 }}>
                {t.title}
              </div>
              {t.description && (
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  {t.description}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "2px",
                fontSize: "12px",
                lineHeight: 1,
              }}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

