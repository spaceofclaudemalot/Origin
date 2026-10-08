import { DEFAULT_TITLE, DocumentNotFoundError, type StoredDocument } from "../storage/documents";

export type SaveStatus = "saved" | "saving" | "error";
export type Patch = Partial<Pick<StoredDocument, "title" | "content">>;

interface SaveQueueDeps {
  update(id: string, patch: Patch): Promise<StoredDocument>;
  put(doc: StoredDocument): Promise<void>;
  onStatus(status: SaveStatus): void;
}

/**
 * Modifications en attente, une entrée par document : l'échec d'un document
 * ne peut jamais écraser ni bloquer celles d'un autre.
 */
export function createSaveQueue(deps: SaveQueueDeps) {
  const pending = new Map<string, Patch>();
  // Dernière version enregistrée connue, base des écritures de fermeture
  const bases = new Map<string, StoredDocument>();
  let status: SaveStatus = "saved";

  const setStatus = (next: SaveStatus) => {
    if (next === status) return;
    status = next;
    deps.onStatus(next);
  };

  return {
    track(doc: StoredDocument): void {
      bases.set(doc.id, doc);
    },

    schedule(id: string, patch: Patch): void {
      pending.set(id, { ...pending.get(id), ...patch });
      setStatus("saving");
    },

    hasPending(): boolean {
      return pending.size > 0;
    },

    async flush(): Promise<void> {
      const jobs = [...pending];
      pending.clear();
      let failed = false;
      await Promise.all(
        jobs.map(async ([id, patch]) => {
          try {
            bases.set(id, await deps.update(id, patch));
          } catch (e) {
            // Document supprimé : plus rien à enregistrer pour lui
            if (e instanceof DocumentNotFoundError) {
              bases.delete(id);
              return;
            }
            console.error("[TextOrigin] sauvegarde impossible:", e);
            failed = true;
            // Les modifications arrivées pendant l'échec priment sur l'ancien patch
            pending.set(id, { ...patch, ...pending.get(id) });
          }
        }),
      );
      setStatus(failed ? "error" : pending.size ? "saving" : "saved");
    },

    /**
     * Fermeture de la page : une écriture complète par document, lancée
     * sans attendre (une lecture préalable n'aurait pas le temps d'aboutir).
     * Les patchs restent en file au cas où la page ne se ferme pas.
     */
    flushNow(): void {
      for (const [id, patch] of pending) {
        const base = bases.get(id);
        if (!base) continue;
        const title = patch.title !== undefined ? patch.title.trim() || DEFAULT_TITLE : base.title;
        void deps.put({ ...base, ...patch, title, updatedAt: Date.now() }).catch(() => {});
      }
    },
  };
}
