import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Extensions } from "@tiptap/core";
import { baseExtensions } from "./schema";
import { AiMarkers } from "./extensions/AiMarkers";
import { StoredImageWithView, insertImageFiles } from "./StoredImageView";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { useToast } from "./Toast";
import { Toolbar } from "./Toolbar";
import { DocumentList } from "./DocumentList";
import { ExportMenu } from "./ExportMenu";
import { AnalysisPanel } from "./AnalysisPanel";
import { MarkerTooltip } from "./MarkerTooltip";
import { useLiveAnalysis } from "./useLiveAnalysis";
import { create, get, list, type StoredDocument } from "../storage/documents";

export function editorExtensions(): Extensions {
  return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers];
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "✓ Enregistré",
  saving: "Enregistrement…",
  error: "⚠ Non enregistré",
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
    async (doc: StoredDocument) => {
      await flush();
      track(doc);
      currentId.current = doc.id;
      setCurrent(doc);
      setTitle(doc.title);
      history.replaceState(null, "", `?doc=${doc.id}`);
      document.title = `${doc.title} — TextOrigin`;
    },
    [flush, track],
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

  const rename = (value: string) => {
    setTitle(value);
    if (!currentId.current) return;
    schedule(currentId.current, { title: value });
    document.title = `${value.trim() || "Sans titre"} — TextOrigin`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 h-14">
          <DocumentList
            currentId={current?.id ?? null}
            onOpen={(doc) => void open(doc)}
            onCurrentRenamed={(t) => rename(t)}
            beforeAction={flush}
          />
          <input
            value={title}
            onChange={(e) => rename(e.target.value)}
            aria-label="Titre du document"
            className="text-lg px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none min-w-0 flex-1 max-w-md"
          />
          <span className={`text-xs ${status === "error" ? "text-alert-600" : "text-gray-500"}`} role="status">
            {STATUS_LABEL[status]}
          </span>
          {status === "error" && (
            <button onClick={() => void flush()} className="text-xs underline text-alert-600">
              Réessayer
            </button>
          )}
          <div className="flex-1" />
          <ExportMenu editor={editor} title={title} />
        </div>
        <Toolbar editor={editor} />
      </header>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-auto">
          <div className="sheet">
            <EditorContent editor={editor} />
          </div>
        </main>
        <AnalysisPanel editor={editor} analysis={analysis} />
        <MarkerTooltip editor={editor} result={analysis.result} sourceText={analysis.sourceText} />
      </div>
    </div>
  );
};
