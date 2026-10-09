import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import { toDocx } from "../export/toDocx";
import { downloadBlob, sanitizeFilename } from "../export/download";
import { getImage } from "../storage/documents";
import { useToast } from "./Toast";

const PRINT_HINT_KEY = "textorigin:print-hint-shown";

export const ExportMenu: React.FC<{ editor: Editor | null; title: string }> = ({ editor, title }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportDocx = async () => {
    if (!editor) return;
    setOpen(false);
    setBusy(true);
    try {
      const blob = await toDocx(editor.getJSON(), { title, getImage });
      downloadBlob(blob, sanitizeFilename(title, "docx"));
    } catch (e) {
      console.error("[TextOrigin] export docx:", e);
      toast.show(`Export Word impossible : ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = () => {
    setOpen(false);
    try {
      if (!localStorage.getItem(PRINT_HINT_KEY)) {
        toast.show("Choisissez « Enregistrer au format PDF » comme destination.", "info");
        localStorage.setItem(PRINT_HINT_KEY, "1");
      }
    } catch {
      // stockage local indisponible : l'aide s'affichera simplement à chaque fois
    }
    const previous = document.title;
    // Chrome propose document.title comme nom du PDF
    document.title = sanitizeFilename(title, "pdf").replace(/\.pdf$/, "");
    // Laisse le toast s'afficher avant la boîte d'impression (bloquante)
    setTimeout(() => {
      window.print();
      document.title = previous;
    }, 50);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!editor || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 px-4 rounded-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-medium"
      >
        {busy ? "Export…" : "Exporter ▾"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 bg-white shadow-lg rounded-lg py-1 w-48" onMouseLeave={() => setOpen(false)}>
          <button role="menuitem" onClick={() => void exportDocx()} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            Word (.docx)
          </button>
          <button role="menuitem" onClick={exportPdf} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            PDF
          </button>
        </div>
      )}
    </div>
  );
};
