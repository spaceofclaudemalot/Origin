import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { InvisibleFinding } from "../types/types";
import { mapRange, type TextIndex } from "../analysis/positions";
import { cleanupEdits } from "../detectors/invisibles";

/** Nettoyage en une seule transaction (donc un seul Ctrl+Z), de la fin vers le début. */
export function cleanupTransaction(state: EditorState, index: TextIndex, findings: InvisibleFinding[]): Transaction {
  const tr = state.tr;
  const edits = cleanupEdits(findings).sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    const range = mapRange(index, edit.start, edit.end);
    if (!range) continue;
    if (edit.text) tr.insertText(edit.text, range.from, range.to);
    else tr.delete(range.from, range.to);
  }
  return tr;
}
