import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { MarkerRange } from "../../analysis/positions";
import type { Detection } from "../../types/types";

export type MarkerLevel = "low" | "medium" | "high";

export function markerLevel(score: number): MarkerLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

interface AiMarkersState {
  decorations: DecorationSet;
  visible: boolean;
}

type Meta = { type: "set"; ranges: MarkerRange[] } | { type: "visible"; visible: boolean };

export const aiMarkersKey = new PluginKey<AiMarkersState>("aiMarkers");

export function markerAttrs(detection: Detection): Record<string, string> {
  return {
    class: `to-marker to-marker--${markerLevel(detection.score)}`,
    "data-detection-id": detection.id,
  };
}

function toDecoration({ from, to, detection }: MarkerRange): Decoration {
  return Decoration.inline(from, to, markerAttrs(detection), {
    detectionId: detection.id,
    inclusiveStart: false,
    inclusiveEnd: false,
  });
}

/**
 * Marqueurs IA en décorations : ils ne touchent ni au document (donc ni au
 * JSON ni aux exports) ni à l'historique d'annulation.
 */
export function aiMarkersPlugin(): Plugin<AiMarkersState> {
  return new Plugin<AiMarkersState>({
    key: aiMarkersKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, visible: true }),
      apply(tr, value, _old, newState) {
        const meta = tr.getMeta(aiMarkersKey) as Meta | undefined;
        if (meta?.type === "set") {
          return { ...value, decorations: DecorationSet.create(newState.doc, meta.ranges.map(toDecoration)) };
        }
        if (meta?.type === "visible") return { ...value, visible: meta.visible };
        if (tr.docChanged) return { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) };
        return value;
      },
    },
    props: {
      decorations: (state) => visibleDecorations(state),
    },
  });
}

export function visibleDecorations(state: EditorState): DecorationSet {
  const s = aiMarkersKey.getState(state);
  return s?.visible ? s.decorations : DecorationSet.empty;
}

export function markersVisible(state: EditorState): boolean {
  return aiMarkersKey.getState(state)?.visible ?? true;
}

export function setMarkers(state: EditorState, ranges: MarkerRange[]): Transaction {
  return state.tr.setMeta(aiMarkersKey, { type: "set", ranges } satisfies Meta).setMeta("addToHistory", false);
}

export function setMarkersVisible(state: EditorState, visible: boolean): Transaction {
  return state.tr.setMeta(aiMarkersKey, { type: "visible", visible } satisfies Meta).setMeta("addToHistory", false);
}

export function findMarkerRange(state: EditorState, detectionId: string): { from: number; to: number } | null {
  const s = aiMarkersKey.getState(state);
  if (!s) return null;
  const [found] = s.decorations.find(undefined, undefined, (spec) => spec.detectionId === detectionId);
  return found ? { from: found.from, to: found.to } : null;
}

export const AiMarkers = Extension.create({
  name: "aiMarkers",
  addProseMirrorPlugins() {
    return [aiMarkersPlugin()];
  },
});
