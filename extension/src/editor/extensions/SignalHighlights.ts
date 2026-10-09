import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type Ranges = Array<{ from: number; to: number }> | null;

export const signalHighlightKey = new PluginKey<DecorationSet>("signalHighlights");

/**
 * Surlignage des phrases d'un signal global. Comme les marqueurs : simple
 * décoration, hors document, hors historique, hors exports.
 */
export function signalHighlightsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: signalHighlightKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set, _old, newState) {
        const meta = tr.getMeta(signalHighlightKey) as Ranges | undefined;
        if (meta !== undefined) {
          return meta
            ? DecorationSet.create(newState.doc, meta.map((r) => Decoration.inline(r.from, r.to, { class: "to-signal" })))
            : DecorationSet.empty;
        }
        return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
      },
    },
    props: {
      decorations: (state) => signalDecorations(state),
    },
  });
}

export function signalDecorations(state: EditorState): DecorationSet {
  return signalHighlightKey.getState(state) ?? DecorationSet.empty;
}

export function setSignalHighlight(state: EditorState, ranges: Ranges): Transaction {
  return state.tr.setMeta(signalHighlightKey, ranges).setMeta("addToHistory", false);
}

export const SignalHighlights = Extension.create({
  name: "signalHighlights",
  addProseMirrorPlugins() {
    return [signalHighlightsPlugin()];
  },
});
