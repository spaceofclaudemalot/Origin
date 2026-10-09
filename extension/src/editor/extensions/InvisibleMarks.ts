import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface InvisibleMark {
  from: number;
  to: number;
  label: string;
  severity: "hint" | "suspect";
}

export const invisibleMarksKey = new PluginKey<DecorationSet>("invisibleMarks");

/**
 * Badges sur les caractères invisibles : le libellé est rendu en CSS
 * (::before), le texte reste intact. Hors document, historique et exports.
 */
export function invisibleMarksPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: invisibleMarksKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set, _old, newState) {
        const meta = tr.getMeta(invisibleMarksKey) as InvisibleMark[] | undefined;
        if (meta) {
          return DecorationSet.create(
            newState.doc,
            meta.map((m) =>
              Decoration.inline(m.from, m.to, {
                class: `to-invisible to-invisible--${m.severity}`,
                "data-label": m.label,
              }),
            ),
          );
        }
        return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
      },
    },
    props: {
      decorations: (state) => invisibleDecorations(state),
    },
  });
}

export function invisibleDecorations(state: EditorState): DecorationSet {
  return invisibleMarksKey.getState(state) ?? DecorationSet.empty;
}

export function setInvisibleMarks(state: EditorState, marks: InvisibleMark[]): Transaction {
  return state.tr.setMeta(invisibleMarksKey, marks).setMeta("addToHistory", false);
}

export const InvisibleMarks = Extension.create({
  name: "invisibleMarks",
  addProseMirrorPlugins() {
    return [invisibleMarksPlugin()];
  },
});
