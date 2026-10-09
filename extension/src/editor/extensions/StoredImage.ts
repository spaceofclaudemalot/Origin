import { Node, mergeAttributes } from "@tiptap/core";

export interface StoredImageAttrs {
  imageId: string;
  width: number;
  height: number;
  alt: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storedImage: {
      insertStoredImage: (attrs: StoredImageAttrs) => ReturnType;
    };
  }
}

/**
 * Image dont les octets vivent dans IndexedDB (magasin « images »).
 * Le document ne garde que l'identifiant et les dimensions d'origine,
 * nécessaires à l'export .docx.
 */
export const StoredImage = Node.create({
  name: "storedImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      imageId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-image-id"),
        renderHTML: (a) => ({ "data-image-id": a.imageId }),
      },
      width: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-width")) || 0,
        renderHTML: (a) => ({ "data-width": a.width }),
      },
      height: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-height")) || 0,
        renderHTML: (a) => ({ "data-height": a.height }),
      },
      alt: {
        default: "",
        parseHTML: (el) => el.getAttribute("alt") ?? "",
        renderHTML: (a) => ({ alt: a.alt }),
      },
    };
  },

  // Seules nos propres images sont reprises au collage : une <img> distante
  // n'a pas d'octets locaux et ne pourrait pas être exportée.
  parseHTML() {
    return [{ tag: "img[data-image-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      insertStoredImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
