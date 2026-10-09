import React, { useCallback, useEffect, useState } from "react";
import { create, list, remove, update, type StoredDocument } from "../storage/documents";
import { useToast } from "./Toast";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export const DocumentList: React.FC<{
  currentId: string | null;
  onOpen: (doc: StoredDocument) => void;
  onCurrentRenamed: (title: string) => void;
  beforeAction: () => Promise<void>;
}> = ({ currentId, onOpen, onCurrentRenamed, beforeAction }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await beforeAction(); // la liste reflète la dernière sauvegarde
      setDocs(await list());
    } catch {
      toast.show("Impossible de lire vos documents.", "error");
    }
  }, [beforeAction, toast]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      await refresh();
    } catch (e) {
      console.error("[TextOrigin] action document:", e);
      toast.show("L'opération a échoué.", "error");
    }
  };

  const newDoc = () =>
    run(async () => {
      const doc = await create();
      onOpen(doc);
      setOpen(false);
    });

  const saveRename = () =>
    renaming &&
    run(async () => {
      const doc = await update(renaming.id, { title: renaming.title });
      if (doc.id === currentId) onCurrentRenamed(doc.title);
      setRenaming(null);
    });

  const doDelete = (id: string) =>
    run(async () => {
      await remove(id);
      setConfirmDelete(null);
      if (id === currentId) onOpen((await list())[0] ?? (await create()));
    });

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Mes documents" title="Mes documents" className="h-9 w-9 rounded hover:bg-gray-100 text-xl">
        ☰
      </button>
      {open && (
        <div className="no-print fixed inset-0 z-40 flex" role="dialog" aria-label="Mes documents">
          <div className="w-96 max-w-full bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Mes documents</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-xl px-2">×</button>
            </div>
            <div className="p-4">
              <button onClick={() => void newDoc()} className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
                + Nouveau document
              </button>
            </div>
            <ul className="flex-1 overflow-auto px-2 pb-4">
              {docs.map((d) => (
                <li key={d.id} className={`group rounded-lg p-2 ${d.id === currentId ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                  {renaming?.id === d.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); void saveRename(); }} className="flex gap-1">
                      <input
                        autoFocus
                        value={renaming.title}
                        onChange={(e) => setRenaming({ id: d.id, title: e.target.value })}
                        aria-label="Nouveau titre"
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                      <button type="submit" className="text-sm px-2">OK</button>
                    </form>
                  ) : confirmDelete === d.id ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-1">Supprimer « {d.title} » ?</span>
                      <button onClick={() => void doDelete(d.id)} className="text-alert-600 font-medium">Supprimer</button>
                      <button onClick={() => setConfirmDelete(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => { if (d.id !== currentId) onOpen(d); setOpen(false); }}
                      >
                        <div className="text-sm font-medium truncate">{d.title}</div>
                        <div className="text-xs text-gray-500">{dateFmt.format(d.updatedAt)}</div>
                      </button>
                      <button onClick={() => setRenaming({ id: d.id, title: d.title })} className="text-xs opacity-0 group-hover:opacity-100 focus:opacity-100">Renommer</button>
                      <button onClick={() => setConfirmDelete(d.id)} className="text-xs text-alert-600 opacity-0 group-hover:opacity-100 focus:opacity-100">Supprimer</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
};
