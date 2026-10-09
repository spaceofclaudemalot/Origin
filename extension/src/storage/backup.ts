import type { StoredDocument } from "./documents";

/**
 * Copie de secours synchrone (localStorage) écrite à la fermeture de la page :
 * contrairement à IndexedDB, elle ne peut pas être annulée par le déchargement.
 */
const key = (id: string) => `textorigin:unsaved:${id}`;

export function writeBackup(doc: StoredDocument): void {
  try {
    localStorage.setItem(key(doc.id), JSON.stringify(doc));
  } catch {
    // stockage plein ou indisponible : l'écriture IndexedDB reste tentée
  }
}

export function clearBackup(id: string): void {
  try {
    localStorage.removeItem(key(id));
  } catch {
    // rien à nettoyer
  }
}

/** Reprend la copie de secours si elle est plus récente que la version enregistrée. */
export function withBackup(doc: StoredDocument): { doc: StoredDocument; recovered: boolean } {
  try {
    const raw = localStorage.getItem(key(doc.id));
    if (raw) {
      const backup = JSON.parse(raw) as StoredDocument;
      if (backup.id === doc.id && backup.updatedAt > doc.updatedAt) return { doc: backup, recovered: true };
    }
  } catch {
    // copie illisible : on garde la version enregistrée
  }
  clearBackup(doc.id);
  return { doc, recovered: false };
}
