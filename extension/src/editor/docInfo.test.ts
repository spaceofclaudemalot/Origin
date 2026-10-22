import { describe, it, expect } from "vitest";
import { wordCountOf, relativeDate, displayTitle } from "./docInfo";
import { setLang } from "../i18n/core";

describe("displayTitle et dates selon la langue", () => {
  it("affiche le titre par défaut dans la langue courante, jamais un titre choisi", () => {
    expect(displayTitle("Sans titre")).toBe("Sans titre");
    expect(displayTitle("")).toBe("Sans titre");
    setLang("en");
    try {
      expect(displayTitle("Sans titre")).toBe("Untitled");
      expect(displayTitle("   ")).toBe("Untitled");
      expect(displayTitle("Mon rapport")).toBe("Mon rapport");
      const now = new Date(2026, 9, 9, 12, 0).getTime();
      expect(relativeDate(now - 5 * 60_000, now)).toBe("5 min ago");
      expect(relativeDate(new Date(2026, 8, 1).getTime(), now)).toBe("01/09/2026");
    } finally {
      setLang("fr");
    }
  });
});

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("wordCountOf", () => {
  it("vide / null", () => {
    expect(wordCountOf(null)).toBe(0);
    expect(wordCountOf({ type: "doc", content: [] })).toBe(0);
  });
  it("paragraphes séparés ne collent pas leurs mots", () => {
    expect(wordCountOf({ type: "doc", content: [p("un deux"), p("trois")] })).toBe(3);
  });
  it("listes, tableaux, images", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [p("a b")] }] },
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [p("c")] }] }] },
        { type: "storedImage", attrs: { imageId: "x" } },
      ],
    };
    expect(wordCountOf(doc)).toBe(3);
  });
  it("apostrophes et ponctuation", () => {
    expect(wordCountOf({ type: "doc", content: [p("L'équipe a fini — enfin !")] })).toBe(4);
  });
});

describe("relativeDate", () => {
  const now = new Date(2026, 9, 9, 12, 0).getTime();
  it("paliers", () => {
    expect(relativeDate(now - 20_000, now)).toBe("à l'instant");
    expect(relativeDate(now - 5 * 60_000, now)).toBe("il y a 5 min");
    expect(relativeDate(now - 3 * 3_600_000, now)).toBe("il y a 3 h");
    expect(relativeDate(new Date(2026, 9, 8, 9, 0).getTime(), now)).toBe("hier");
    expect(relativeDate(new Date(2026, 8, 1).getTime(), now)).toBe("01/09/2026");
  });
});
