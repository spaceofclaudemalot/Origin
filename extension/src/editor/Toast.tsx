import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "info" | "warning" | "error";
interface ToastItem { id: number; message: string; kind: ToastKind; leaving?: boolean }

const VISIBLE_MS = 4000;
const LEAVE_MS = 150;
interface ToastApi { show(message: string, kind?: ToastKind): void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

const KIND_CLASS: Record<ToastKind, string> = {
  info: "bg-raised text-ink border-line",
  warning: "bg-raised text-ink border-accent/60 shadow-[0_0_16px_rgb(var(--to-accent)/0.35)]",
  error: "bg-accent text-accent-ink border-accent",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  // Sortie par le même chemin que l'entrée, puis retrait une fois l'animation jouée
  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), LEAVE_MS);
  }, []);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, kind }]);
    // Une erreur reste affichée jusqu'à sa fermeture : un message qui disparaît seul peut être manqué
    if (kind !== "error") setTimeout(() => dismiss(id), VISIBLE_MS);
  }, [dismiss]);

  // Valeur stable : les effets qui dépendent de useToast() ne se relancent pas
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`${KIND_CLASS[t.kind]} ${
              t.leaving ? "animate-rise-out" : "animate-rise-in"
            } motion-reduce:animate-fade-in font-ui border text-[13px] pl-4 pr-2 py-2 rounded-card shadow-lift flex items-center gap-3`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              aria-label="Fermer la notification"
              onClick={() => dismiss(t.id)}
              className="h-6 w-6 shrink-0 rounded-ctl inline-flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-150"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => useContext(ToastContext);
