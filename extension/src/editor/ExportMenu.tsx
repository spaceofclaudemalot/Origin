import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import { toDocx } from "../export/toDocx";
import { downloadBlob, sanitizeFilename } from "../export/download";
import { getImage } from "../storage/documents";
import { useToast } from "./Toast";
import { Menu, MenuItem } from "../ui/primitives";
import { IChevron } from "../ui/icons";

const PRINT_HINT_KEY = "textorigin:print-hint-shown";

export const ExportMenu: React.FC<{ editor: Editor | null; title: string }> = ({ editor, title }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportDocx = async () => {
    if (!editor) return;
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
    <Menu
      disabled={!editor || busy}
      buttonClassName="h-9 pl-4 pr-3 rounded-ctl bg-accent text-accent-ink text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:bg-line disabled:text-muted"
      label={<>{busy ? "Export…" : "Exporter"}<IChevron className="w-4 h-4" /></>}
    >
      {(close) => (
        <>
          <MenuItem onSelect={() => { close(); void exportDocx(); }}>Word (.docx)</MenuItem>
          <MenuItem onSelect={() => { close(); exportPdf(); }}>PDF</MenuItem>
        </>
      )}
    </Menu>
  );
};
