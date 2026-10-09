export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImage(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Format d'image non pris en charge (png, jpeg, gif ou webp).";
  }
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde (10 Mo maximum).";
  return null;
}

/**
 * Lit les dimensions d'origine (nécessaires à l'export .docx) et convertit
 * le webp en png, format que la bibliothèque docx ne sait pas embarquer sinon.
 */
export async function prepareImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.type !== "image/webp") {
    bitmap.close();
    return { blob: file, width, height };
  }
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { blob: await canvas.convertToBlob({ type: "image/png" }), width, height };
}
