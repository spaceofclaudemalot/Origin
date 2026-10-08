import React, { useEffect, useState } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { StoredImage } from "./extensions/StoredImage";
import { getImage, putImage } from "../storage/documents";
import { prepareImage, validateImage } from "./images";

const StoredImageComponent: React.FC<NodeViewProps> = ({ node }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getImage(node.attrs.imageId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [node.attrs.imageId]);

  return (
    <NodeViewWrapper data-drag-handle="">
      {missing ? (
        <div className="border border-dashed border-gray-400 text-gray-500 text-xs p-4 text-center">Image introuvable</div>
      ) : src ? (
        <img src={src} alt={node.attrs.alt} width={node.attrs.width || undefined} />
      ) : (
        <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: `${node.attrs.width || 4} / ${node.attrs.height || 3}` }} />
      )}
    </NodeViewWrapper>
  );
};

export const StoredImageWithView = StoredImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(StoredImageComponent);
  },
});

/** Valide, stocke et insère des fichiers image (collage, dépôt ou bouton). */
export async function insertImageFiles(
  view: EditorView,
  files: File[],
  notify: (message: string) => void,
  pos?: number,
): Promise<void> {
  for (const file of files) {
    const error = validateImage(file);
    if (error) {
      notify(error);
      continue;
    }
    try {
      const { blob, width, height } = await prepareImage(file);
      const imageId = await putImage(blob);
      const node = view.state.schema.nodes.storedImage.create({ imageId, width, height, alt: file.name });
      const tr = pos != null ? view.state.tr.replaceRangeWith(pos, pos, node) : view.state.tr.replaceSelectionWith(node);
      view.dispatch(tr.scrollIntoView());
    } catch (e) {
      console.error("[TextOrigin] insertion d'image impossible:", e);
      notify("Impossible d'insérer l'image.");
    }
  }
}
