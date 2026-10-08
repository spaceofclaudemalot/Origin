import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "./download";

describe("sanitizeFilename", () => {
  it("removes forbidden characters and collapses spaces", () => {
    expect(sanitizeFilename('Rapport: "final" / v2?', "docx")).toBe("Rapport final v2.docx");
  });
  it("falls back to 'document' when the title is empty", () => {
    expect(sanitizeFilename("  ", "docx")).toBe("document.docx");
    expect(sanitizeFilename("***", "pdf")).toBe("document.pdf");
  });
  it("strips trailing dots and limits length", () => {
    expect(sanitizeFilename("note...", "docx")).toBe("note.docx");
    expect(sanitizeFilename("a".repeat(300), "docx")).toBe(`${"a".repeat(120)}.docx`);
  });
  it("keeps accents", () => {
    expect(sanitizeFilename("Été à Paris", "docx")).toBe("Été à Paris.docx");
  });
});
