import type { Node as PMNode } from "@tiptap/pm/model";
import type { AnalysisResult, GlobalSignal } from "../types/types";
import { mapRange, type TextIndex } from "../analysis/positions";
import { markerLevel, type MarkerLevel } from "./extensions/AiMarkers";

/** Ce qu'un bloc textuel (paragraphe, titre, élément de liste, cellule) contient. */
export interface BlockAnnotation {
  /** Position du nœud du bloc (avant son ouverture). */
  pos: number;
  markerCount: number;
  maxLevel: MarkerLevel | null;
  detectionIds: string[];
  /** Signaux globaux en alerte dont une phrase est dans le bloc. */
  signals: GlobalSignal["id"][];
  signalRanges: Array<{ from: number; to: number }>;
}

export const SIGNAL_SHORT: Record<GlobalSignal["id"], string> = {
  "connector-density": "CONNECTEURS",
  rhythm: "RYTHME",
  "paragraph-uniformity": "PARAGRAPHES",
  "topic-sentences": "PHRASES D'ATTAQUE",
};

const RANK: Record<MarkerLevel, number> = { low: 0, medium: 1, high: 2 };

interface Block {
  pos: number;
  end: number;
}

function textblocks(doc: PMNode): Block[] {
  const out: Block[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      out.push({ pos, end: pos + node.nodeSize });
      return false;
    }
    return true;
  });
  return out;
}

/** Bloc contenant la position (recherche dichotomique, blocs triés et disjoints). */
function blockAt(blocks: Block[], at: number): Block | undefined {
  let lo = 0;
  let hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (at < blocks[mid].pos) hi = mid - 1;
    else if (at >= blocks[mid].end) lo = mid + 1;
    else return blocks[mid];
  }
  return undefined;
}

/**
 * Regroupe marqueurs et phrases de signaux en alerte par bloc textuel.
 * Un passage à cheval sur deux blocs compte dans celui où il commence ;
 * les blocs sans rien à signaler sont omis.
 */
export function blockAnnotations(
  doc: PMNode,
  result: Pick<AnalysisResult, "detections" | "signals">,
  index: TextIndex,
): BlockAnnotation[] {
  const blocks = textblocks(doc);
  const byPos = new Map<number, BlockAnnotation>();
  const entry = (pos: number) => {
    let a = byPos.get(pos);
    if (!a) byPos.set(pos, (a = { pos, markerCount: 0, maxLevel: null, detectionIds: [], signals: [], signalRanges: [] }));
    return a;
  };

  for (const d of result.detections) {
    const r = mapRange(index, d.start, d.end);
    const block = r && blockAt(blocks, r.from);
    if (!block) continue;
    const a = entry(block.pos);
    a.markerCount++;
    a.detectionIds.push(d.id);
    const level = markerLevel(d.score);
    if (!a.maxLevel || RANK[level] > RANK[a.maxLevel]) a.maxLevel = level;
  }

  for (const s of result.signals) {
    if (s.status !== "alert") continue;
    for (const range of s.ranges) {
      const r = mapRange(index, range.start, range.end);
      const block = r && blockAt(blocks, r.from);
      if (!r || !block) continue;
      const a = entry(block.pos);
      if (!a.signals.includes(s.id)) a.signals.push(s.id);
      a.signalRanges.push(r);
    }
  }

  return [...byPos.values()].sort((x, y) => x.pos - y.pos);
}

/**
 * Étiquettes à afficher après une analyse : `fresh` (null si l'analyse ne porte
 * pas sur le texte courant). Un autre éditeur (autre document) repart à vide
 * au lieu de garder les étiquettes du précédent.
 */
export function reconcileAnnotations<O>(
  prev: { owner: O; list: BlockAnnotation[] },
  owner: O,
  fresh: BlockAnnotation[] | null,
): { owner: O; list: BlockAnnotation[] } {
  if (fresh) return { owner, list: fresh };
  return owner === prev.owner ? prev : { owner, list: [] };
}

/** Positions verticales sans chevauchement : ordre conservé, décalage vers le bas. */
export function stackLabels(items: Array<{ top: number; height: number }>, gap: number): number[] {
  const out: number[] = [];
  let floor = -Infinity;
  for (const { top, height } of items) {
    const y = Math.max(top, floor);
    out.push(y);
    floor = y + height + gap;
  }
  return out;
}
