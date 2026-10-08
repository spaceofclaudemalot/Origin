import { useCallback, useEffect, useRef, useState } from "react";
import { put, update, type StoredDocument } from "../storage/documents";
import { clearBackup, writeBackup } from "../storage/backup";
import { createSaveQueue, type Patch, type SaveStatus } from "./saveQueue";

export type { SaveStatus } from "./saveQueue";

const SAVE_DELAY = 1000;

/**
 * Sauvegarde différée. En cas d'échec, le contenu reste en attente et
 * repart à la modification suivante ou via flush() (bouton Réessayer).
 */
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const queue = useRef(createSaveQueue({ update, put, backup: writeBackup, clearBackup, onStatus: setStatus })).current;
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    await queue.flush();
  }, [queue]);

  const schedule = useCallback(
    (id: string, patch: Patch) => {
      queue.schedule(id, patch);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    },
    [queue, flush],
  );

  const track = useCallback((doc: StoredDocument) => queue.track(doc), [queue]);

  useEffect(() => {
    // Fermeture ou mise en arrière-plan : écriture immédiate, sans lecture préalable
    const onHide = () => queue.flushNow();
    const onVisibility = () => document.visibilityState === "hidden" && queue.flushNow();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queue]);

  return { status, schedule, flush, track };
}
