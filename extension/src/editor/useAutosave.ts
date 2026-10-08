import { useCallback, useEffect, useRef, useState } from "react";
import { update, type StoredDocument } from "../storage/documents";

export type SaveStatus = "saved" | "saving" | "error";
type Patch = Partial<Pick<StoredDocument, "title" | "content">>;

const SAVE_DELAY = 1000;

/**
 * Sauvegarde différée. En cas d'échec, le contenu reste en attente et
 * repart à la modification suivante ou via flush() (bouton Réessayer).
 */
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pending = useRef<{ id: string; patch: Patch } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    try {
      await update(job.id, job.patch);
      if (!pending.current) setStatus("saved");
    } catch (e) {
      console.error("[TextOrigin] sauvegarde impossible:", e);
      // Les modifications arrivées pendant l'échec priment sur l'ancien patch
      // (relu via un cast : TS croit pending.current toujours nul ici)
      const newer = pending.current as { id: string; patch: Patch } | null;
      pending.current = {
        id: job.id,
        patch: { ...job.patch, ...(newer?.id === job.id ? newer.patch : {}) },
      };
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(
    (id: string, patch: Patch) => {
      const merged = pending.current?.id === id ? { ...pending.current.patch, ...patch } : patch;
      if (pending.current && pending.current.id !== id) void flush();
      pending.current = { id, patch: merged };
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  return { status, schedule, flush };
}
