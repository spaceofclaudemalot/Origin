import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "info" | "warning" | "error";
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ToastApi { show(message: string, kind?: ToastKind): void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

const KIND_CLASS: Record<ToastKind, string> = {
  info: "bg-gray-800",
  warning: "bg-verify-500",
  error: "bg-alert-600",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  // Valeur stable : les effets qui dépendent de useToast() ne se relancent pas
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={`${KIND_CLASS[t.kind]} text-white text-sm px-4 py-2 rounded-lg shadow-lg`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => useContext(ToastContext);
