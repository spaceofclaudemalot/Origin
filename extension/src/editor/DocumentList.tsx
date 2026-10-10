import React, { useCallback, useEffect, useState } from "react";
import { list, remove, update, type StoredDocument } from "../storage/documents";
import { useToast } from "./Toast";
import { relativeDate, wordCountOf } from "./docInfo";
import { Button, IconButton } from "../ui/primitives";
import { IEdit, IPlus, ISearch, ITrash } from "../ui/icons";

const RECENT_COUNT = 5;
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="px-3 pt-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted">{children}</h3>
);

export const DocumentList: React.FC<{
  currentId: string | null;
  onOpen: (doc: StoredDocument) => void;
  onCurrentRenamed: (title: string) => void;
  beforeAction: () => Promise<void>;
  onNew: () => void;
  /** Le menu « … » demande la suppression du document courant. */
  deleteRequested: boolean;
  onDeleteRequestSeen: () => void;
  /** Change quand la liste doit être relue (document ouvert, enregistrement). */
  refreshKey: string;
}> = ({ currentId, onOpen, onCurrentRenamed, beforeAction, onNew, deleteRequested, onDeleteRequestSeen, refreshKey }) => {
  const toast = useToast();
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocs(await list());
    } catch {
      toast.show("Impossible de lire vos documents.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    if (!deleteRequested) return;
    if (currentId) setConfirmDelete(currentId);
    onDeleteRequestSeen();
  }, [deleteRequested, currentId, onDeleteRequestSeen]);

  const run = async (action: () => Promise<void>) => {
    try {
      await beforeAction(); // la liste reflète la dernière sauvegarde
      await action();
      await refresh();
    } catch (e) {
      console.error("[TextOrigin] action document:", e);
      toast.show("L'opération a échoué.", "error");
    }
  };

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
      if (id === currentId) {
        const next = (await list())[0];
        if (next) onOpen(next);
        else onNew();
      }
    });

  const q = fold(query.trim());
  const shown = q ? docs.filter((d) => fold(d.title).includes(q)) : docs;

  const row = (d: StoredDocument) => {
    const active = d.id === currentId;
    if (renaming?.id === d.id) {
      return (
        <form onSubmit={(e) => { e.preventDefault(); void saveRename(); }} className="flex gap-1 p-1">
          <input
            autoFocus
            value={renaming.title}
            onChange={(e) => setRenaming({ id: d.id, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setRenaming(null); } }}
            aria-label="Nouveau titre"
            className="flex-1 min-w-0 h-8 bg-raised border border-line rounded-ctl px-2 text-[13px] outline-none focus:border-accent"
          />
          <Button size="sm" type="submit">OK</Button>
        </form>
      );
    }
    if (confirmDelete === d.id) {
      return (
        <div className="rounded-ctl bg-raised border border-accent/40 p-2 space-y-2 text-[13px]">
          <p>Supprimer « {d.title} » ?</p>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => void doDelete(d.id)}>Supprimer</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`group relative flex items-center rounded-ctl transition-colors ${
          active ? "bg-raised shadow-soft" : "hover:bg-raised/60"
        }`}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" aria-hidden="true" />}
        <button
          type="button"
          className="flex-1 min-w-0 text-left px-3 py-2"
          aria-current={active ? "page" : undefined}
          onClick={() => { if (!active) onOpen(d); }}
        >
          <div className="text-[13px] font-medium truncate">{d.title || "Sans titre"}</div>
          <div className="text-2xs text-muted">
            {relativeDate(d.updatedAt)} · {wordCountOf(d.content)} mots
          </div>
        </button>
        <div className="flex pr-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          <IconButton label="Renommer" className="h-7 min-w-7" onClick={() => setRenaming({ id: d.id, title: d.title })}>
            <IEdit className="w-4 h-4" />
          </IconButton>
          <IconButton label="Supprimer" className="h-7 min-w-7" onClick={() => setConfirmDelete(d.id)}>
            <ITrash className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted">Documents</h2>
        <IconButton label="Nouveau document" onClick={onNew}>
          <IPlus className="w-4 h-4" />
        </IconButton>
      </div>
      <div className="px-3 pt-3">
        <label className="flex items-center gap-2 h-9 px-3 bg-raised border border-line rounded-ctl text-muted focus-within:border-accent">
          <ISearch className="w-4 h-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher un document"
            className="flex-1 min-w-0 bg-transparent text-[13px] text-ink placeholder:text-muted outline-none"
          />
        </label>
      </div>
      <div className="flex-1 overflow-auto px-2 pb-4">
        {q ? (
          <>
            <Heading>Résultats</Heading>
            {shown.length === 0 && <p className="px-3 py-2 text-2xs text-muted">Aucun document.</p>}
            <ul className="space-y-0.5">{shown.map((d) => <li key={d.id}>{row(d)}</li>)}</ul>
          </>
        ) : (
          <>
            <Heading>Récents</Heading>
            <ul className="space-y-0.5">{docs.slice(0, RECENT_COUNT).map((d) => <li key={d.id}>{row(d)}</li>)}</ul>
            {docs.length > RECENT_COUNT && (
              <>
                <Heading>Tous les documents</Heading>
                <ul className="space-y-0.5">{docs.slice(RECENT_COUNT).map((d) => <li key={d.id}>{row(d)}</li>)}</ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
