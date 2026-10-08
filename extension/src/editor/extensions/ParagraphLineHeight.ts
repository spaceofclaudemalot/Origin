import { Extension } from "@tiptap/core";

// Nom distinct de l'extension « lineHeight » de @tiptap/extension-text-style,
// qui s'applique au texte (span) et non au paragraphe.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphLineHeight: {
      setParagraphLineHeight: (value: string) => ReturnType;
      unsetParagraphLineHeight: () => ReturnType;
    };
  }
}

export const LINE_HEIGHTS = ["1.0", "1.15", "1.5", "2.0"] as const;

const TYPES = ["paragraph", "heading"];

export const ParagraphLineHeight = Extension.create({
  name: "paragraphLineHeight",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphLineHeight:
        (value) =>
        ({ commands }) =>
          TYPES.map((t) => commands.updateAttributes(t, { lineHeight: value })).some(Boolean),
      unsetParagraphLineHeight:
        () =>
        ({ commands }) =>
          TYPES.map((t) => commands.resetAttributes(t, "lineHeight")).some(Boolean),
    };
  },
});
