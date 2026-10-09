import { describe, it, expect } from "vitest";
import { validateImage, MAX_IMAGE_BYTES } from "./images";

describe("validateImage", () => {
  it("accepts png, jpeg, gif and webp up to 10 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      expect(validateImage({ type, size: MAX_IMAGE_BYTES })).toBeNull();
    }
  });
  it("rejects other types", () => {
    expect(validateImage({ type: "image/svg+xml", size: 10 })).toBe(
      "Format d'image non pris en charge (png, jpeg, gif ou webp).",
    );
    expect(validateImage({ type: "application/pdf", size: 10 })).not.toBeNull();
  });
  it("rejects files over 10 MB", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toBe("Image trop lourde (10 Mo maximum).");
  });
});
