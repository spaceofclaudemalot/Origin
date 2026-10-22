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
import { displayTitle } from "./docInfo";
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
import { t, useLang } from "../i18n";
import { pruneBackups, withBackup } from "../storage/backup";

export function editorExtensions(): Extensions {
  return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers, SignalHighlights, InvisibleMarks];
}

const STATUS_KEY = { saved: "editor.saved", saving: "editor.saving", error: "editor.saveError" } as const satisfies Record<SaveStatus, string>;

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

export const EditorApp: React.FC = () => {
  const lang = useLang();
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
      document.title = `${displayTitle(doc.title)} — TextOrigin`;
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
        attributes: { spellcheck: "true", "aria-label": t("editor.docLabel") },
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
      if (wanted && !doc) toast.show(t("editor.notFound"), "warning");
      const all = await list();
      pruneBackups(all.map((d) => d.id));
      doc ??= all[0] ?? (await create());
      await open(doc);
    })().catch((e) => {
      console.error("[TextOrigin] stockage indisponible:", e);
      toast.show(t("editor.storageDown"), "error");
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
      toast.show(t("editor.createFailed"), "error");
    }
  }, [openDoc, toast]);

  const rename = (value: string) => {
    setTitle(value);
    if (!currentId.current) return;
    schedule(currentId.current, { title: value });
    document.title = `${displayTitle(value)} — TextOrigin`;
  };

  // L'onglet suit la langue quand le titre est le titre par défaut (« Sans titre » / « Untitled »)
  useEffect(() => {
    document.title = `${displayTitle(title)} — TextOrigin`;
  }, [title, lang]);

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
        <div className="text-2xs text-muted">{t("nav.docs")} <span aria-hidden="true">›</span> {displayTitle(title)}</div>
        <div className="flex items-center gap-2">
          <input
            ref={titleInput}
            value={displayTitle(title)}
            onChange={(e) => rename(e.target.value)}
            aria-label={t("editor.titleLabel")}
            className="text-xl font-semibold bg-transparent rounded-ctl px-2 -mx-2 py-0.5 hover:bg-raised focus:bg-raised outline-none min-w-0 flex-1 max-w-xl"
          />
          <Menu
            ariaLabel={t("editor.actions")}
            align="left"
            buttonClassName="h-8 w-8 rounded-ctl inline-flex items-center justify-center text-muted hover:text-ink hover:bg-raised"
            label={<IMore />}
          >
            {(close) => (
              <>
                <MenuItem onSelect={() => { close(); titleInput.current?.focus(); titleInput.current?.select(); }}>{t("editor.rename")}</MenuItem>
                <MenuItem tone="accent" onSelect={() => { close(); setDeleteRequested(true); shell.openDocs(); }}>{t("editor.delete")}</MenuItem>
              </>
            )}
          </Menu>
          <div className="flex-1" />
          {status === "error" ? (
            <Chip as="button" tone="accent" onClick={() => void flush()} role="status">{t(STATUS_KEY.error)}</Chip>
          ) : (
            <Chip className="bg-transparent text-muted font-medium" role="status">{t(STATUS_KEY[status])}</Chip>
          )}
          <ExportMenu editor={editor} title={displayTitle(title)} />
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
