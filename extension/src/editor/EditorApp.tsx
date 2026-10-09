import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Extensions } from "@tiptap/core";
import { baseExtensions } from "./schema";
import { AiMarkers } from "./extensions/AiMarkers";
import { SignalHighlights } from "./extensions/SignalHighlights";
import { InvisibleMarks } from "./extensions/InvisibleMarks";
import { StoredImageWithView, insertImageFiles } from "./StoredImageView";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { useToast } from "./Toast";
import { Toolbar } from "./Toolbar";
import { DocumentList } from "./DocumentList";
import { ExportMenu } from "./ExportMenu";
import { AnalysisPanel, type PanelFocus } from "./AnalysisPanel";
import type { GlobalSignal } from "../types/types";
import { MarkerTooltip } from "./MarkerTooltip";
import { MarginLabels } from "./MarginLabelLayer";
import { useLiveAnalysis } from "./useLiveAnalysis";
import { create, get, list, type StoredDocument } from "../storage/documents";
import { Shell, useLayout } from "./Shell";
import { Chip, Menu, MenuItem } from "../ui/primitives";
import { IMore } from "../ui/icons";
import { withBackup } from "../storage/backup";

export function editorExtensions(): Extensions {
  return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers, SignalHighlights, InvisibleMarks];
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement…",
  error: "Non enregistré · Réessayer",
};

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

export const EditorApp: React.FC = () => {
  const toast = useToast();
  const { status, schedule, flush, track } = useAutosave();
  const [current, setCurrent] = useState<StoredDocument | null>(null);
  const [title, setTitle] = useState("");
  const currentId = useRef<string | null>(null);

  const open = useCallback(
    async (stored: StoredDocument) => {
      await flush();
      track(stored);
      // Modifications non enregistrées lors d'une fermeture : on les reprend
      const { doc, recovered } = withBackup(stored);
      if (recovered) schedule(doc.id, { title: doc.title, content: doc.content });
      currentId.current = doc.id;
      setCurrent(doc);
      setTitle(doc.title);
      history.replaceState(null, "", `?doc=${doc.id}`);
      document.title = `${doc.title} — TextOrigin`;
    },
    [flush, track, schedule],
  );

  // Un éditeur neuf par document : l'historique d'annulation ne déborde
  // jamais d'un document à l'autre.
  const editor = useEditor(
    {
      extensions: editorExtensions(),
      content: current?.content ?? null,
      editable: current != null,
      onUpdate: ({ editor }) => {
        if (currentId.current) schedule(currentId.current, { content: editor.getJSON() });
      },
      editorProps: {
        attributes: { spellcheck: "true", "aria-label": "Document" },
        handlePaste: (view, event) => {
          const files = imageFiles(event.clipboardData?.files);
          if (!files.length) return false;
          void insertImageFiles(view, files, (m) => toast.show(m, "error"));
          return true;
        },
        handleDrop: (view, event) => {
          const files = imageFiles(event.dataTransfer?.files);
          if (!files.length) return false;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          void insertImageFiles(view, files, (m) => toast.show(m, "error"), pos);
          return true;
        },
      },
    },
    [current?.id],
  );
  const analysis = useLiveAnalysis(editor);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      const wanted = new URLSearchParams(location.search).get("doc");
      let doc = wanted ? await get(wanted) : undefined;
      if (wanted && !doc) toast.show("Document introuvable", "warning");
      doc ??= (await list())[0] ?? (await create());
      await open(doc);
    })().catch((e) => {
      console.error("[TextOrigin] stockage indisponible:", e);
      toast.show("Stockage local indisponible : vos modifications ne seront pas enregistrées.", "error");
    });
  }, [open, toast]);

  const shell = useLayout();
  const { closeDrawers } = shell;
  const titleInput = useRef<HTMLInputElement>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [highlighted, setHighlighted] = useState<GlobalSignal["id"] | null>(null);
  const [panelFocus, setPanelFocus] = useState<PanelFocus | null>(null);
  const [markersShown, setMarkersShown] = useState(true);

  // Nouveau document : marqueurs visibles, aucun signal surligné
  useEffect(() => {
    setMarkersShown(true);
    setHighlighted(null);
    setPanelFocus(null);
  }, [editor]);

  const openDoc = useCallback(
    (doc: StoredDocument) => {
      closeDrawers();
      void open(doc);
    },
    [open, closeDrawers],
  );

  const newDoc = useCallback(async () => {
    try {
      openDoc(await create());
    } catch (e) {
      console.error("[TextOrigin] nouveau document:", e);
      toast.show("Impossible de créer le document.", "error");
    }
  }, [openDoc, toast]);

  const rename = (value: string) => {
    setTitle(value);
    if (!currentId.current) return;
    schedule(currentId.current, { title: value });
    document.title = `${value.trim() || "Sans titre"} — TextOrigin`;
  };

  const docs = (
    <DocumentList
      currentId={current?.id ?? null}
      onOpen={openDoc}
      onCurrentRenamed={(t) => rename(t)}
      beforeAction={flush}
      onNew={() => void newDoc()}
      deleteRequested={deleteRequested}
      onDeleteRequestSeen={() => setDeleteRequested(false)}
      refreshKey={`${current?.id ?? ""}:${status}`}
    />
  );

  return (
    <Shell
      layout={shell.layout}
      docsOpen={shell.docsOpen}
      analysisOpen={shell.analysisOpen}
      onToggleDocs={shell.toggleDocs}
      onToggleAnalysis={shell.toggleAnalysis}
      onNewDoc={() => void newDoc()}
      onCloseDrawers={closeDrawers}
      docs={docs}
      analysis={
        <AnalysisPanel
          editor={editor}
          analysis={analysis}
          highlighted={highlighted}
          onHighlight={setHighlighted}
          focus={panelFocus}
          onFocusSeen={() => setPanelFocus(null)}
          onVisibleChange={setMarkersShown}
        />
      }
    >
      <header className="no-print px-6 pt-4 pb-3 space-y-1">
        <div className="text-2xs text-muted">Documents <span aria-hidden="true">›</span> {title.trim() || "Sans titre"}</div>
        <div className="flex items-center gap-2">
          <input
            ref={titleInput}
            value={title}
            onChange={(e) => rename(e.target.value)}
            aria-label="Titre du document"
            className="text-xl font-semibold bg-transparent rounded-ctl px-2 -mx-2 py-0.5 hover:bg-raised focus:bg-raised outline-none min-w-0 flex-1 max-w-xl"
          />
          <Menu
            ariaLabel="Actions du document"
            align="left"
            buttonClassName="h-8 w-8 rounded-ctl inline-flex items-center justify-center text-muted hover:text-ink hover:bg-raised"
            label={<IMore />}
          >
            {(close) => (
              <>
                <MenuItem onSelect={() => { close(); titleInput.current?.focus(); titleInput.current?.select(); }}>Renommer</MenuItem>
                <MenuItem tone="accent" onSelect={() => { close(); setDeleteRequested(true); shell.openDocs(); }}>Supprimer</MenuItem>
              </>
            )}
          </Menu>
          <div className="flex-1" />
          {status === "error" ? (
            <Chip as="button" tone="accent" onClick={() => void flush()} role="status">{STATUS_LABEL.error}</Chip>
          ) : (
            <Chip className="bg-transparent text-muted font-medium" role="status">{STATUS_LABEL[status]}</Chip>
          )}
          <ExportMenu editor={editor} title={title} />
        </div>
      </header>
      <div className="no-print px-6 pb-3">
        <Toolbar editor={editor} />
      </div>
      <main className="flex-1 overflow-auto px-6 pb-10">
        <div className="sheet-wrap relative w-full mx-auto">
          <MarginLabels
            editor={editor}
            result={analysis.result}
            sourceText={analysis.sourceText}
            visible={markersShown}
            highlighted={highlighted}
            onFocus={(a) => {
              setPanelFocus((f) => ({ nonce: (f?.nonce ?? 0) + 1, detectionIds: a.detectionIds, signals: a.signals }));
              shell.openAnalysis();
            }}
          />
          <div className="sheet">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>
      <MarkerTooltip editor={editor} result={analysis.result} sourceText={analysis.sourceText} />
    </Shell>
  );
};
