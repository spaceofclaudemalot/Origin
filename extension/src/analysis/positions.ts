import type { Node as PMNode } from "@tiptap/pm/model";
import type { Detection } from "../types/types";

/**
 * Correspondance entre le texte brut envoyé au détecteur et les positions
 * ProseMirror. Les deux comptent en unités UTF-16, donc un segment de texte
 * se convertit par simple décalage.
 */
interface Segment {
  textStart: number;
  pmStart: number;
  length: number;
}

export interface TextIndex {
  text: string;
  toPos(offset: number, bias: "start" | "end"): number | null;
}

export interface MarkerRange {
  from: number;
  to: number;
  detection: Detection;
}

export function buildTextIndex(doc: PMNode): TextIndex {
  let text = "";
  const segments: Segment[] = [];
  let firstBlock = true;

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (!firstBlock) text += "\n";
      firstBlock = false;
      return true;
    }
    if (node.isText) {
      segments.push({ textStart: text.length, pmStart: pos, length: node.text!.length });
      text += node.text;
      return false;
    }
    if (node.type.name === "hardBreak") {
      segments.push({ textStart: text.length, pmStart: pos, length: 1 });
      text += "\n";
      return false;
    }
    return true;
  });

  const toPos = (offset: number, bias: "start" | "end"): number | null => {
    if (offset < 0 || offset > text.length) return null;
    if (bias === "start") {
      // Premier segment qui contient l'offset, sinon début du suivant
      for (const s of segments) {
        if (offset < s.textStart + s.length) return s.pmStart + Math.max(0, offset - s.textStart);
      }
      return null;
    }
    // Fin exclusive : dernier segment qui finit à ou après l'offset, sinon fin du précédent
    for (let i = segments.length - 1; i >= 0; i--) {
      const s = segments[i];
      if (offset > s.textStart) return s.pmStart + Math.min(s.length, offset - s.textStart);
    }
    return null;
  };

  return { text, toPos };
}

export function mapRange(index: TextIndex, start: number, end: number): { from: number; to: number } | null {
  if (start < 0 || end > index.text.length || start >= end) return null;
  const from = index.toPos(start, "start");
  const to = index.toPos(end, "end");
  return from == null || to == null || from >= to ? null : { from, to };
}

export function mapRanges(index: TextIndex, ranges: Array<{ start: number; end: number }>): Array<{ from: number; to: number }> {
  return ranges.map((r) => mapRange(index, r.start, r.end)).filter((r): r is { from: number; to: number } => r != null);
}

export function toRanges(index: TextIndex, detections: Detection[]): MarkerRange[] {
  const ranges: MarkerRange[] = [];
  for (const detection of detections) {
    const r = mapRange(index, detection.start, detection.end);
    if (r) ranges.push({ ...r, detection });
  }
  return ranges;
}
