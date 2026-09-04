'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

type Toast = { id: number; kind: ToastKind; text: string };

type ToastApi = {
  push: (text: string, kind?: ToastKind) => void;
  /**
   * Accepts the legacy `"success: ..."` / `"error: ..."` prefixed strings used
   * throughout the admin hub and routes them to the right toast style.
   */
  pushLegacy: (msg: string) => void;
};

const ToastContext = createContext<ToastApi>({ push: () => {}, pushLegacy: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      if (!text) return;
      const id = ++seq.current;
      setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
      const ttl = kind === 'error' ? 7000 : 4200;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ttl)
      );
    },
    [dismiss]
  );

  const pushLegacy = useCallback(
    (msg: string) => {
      if (!msg) return;
      if (msg.startsWith('success:')) return push(msg.slice(8).trim(), 'success');
      if (msg.startsWith('error:')) return push(msg.slice(6).trim(), 'error');
      return push(msg, 'info');
    },
    [push]
  );

  // Clear every pending timer on unmount so we never setState on a dead tree.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo(() => ({ push, pushLegacy }), [push, pushLegacy]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{t.kind === 'success' ? '✅' : t.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.text}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
