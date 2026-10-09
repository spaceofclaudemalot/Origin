import type { AnyExtension, Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { ParagraphLineHeight } from "./extensions/ParagraphLineHeight";
import { StoredImage } from "./extensions/StoredImage";

export const FONT_FAMILIES = [
  "Arial", "Calibri", "Georgia", "Times New Roman", "Verdana", "Courier New",
] as const;

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72] as const;

/**
 * Extensions communes à l'éditeur et aux tests (aucune dépendance React).
 * L'éditeur remplace `storedImage` par une version dotée d'une NodeView.
 */
export function baseExtensions(overrides: { storedImage?: AnyExtension } = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      horizontalRule: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    ParagraphLineHeight,
    TableKit.configure({ table: { resizable: false } }),
    overrides.storedImage ?? StoredImage,
  ];
}
