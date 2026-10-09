import { describe, it, expect } from "vitest";
import { segment } from "./segment";

const texts = (t: string) => segment(t).sentences.map((s) => s.text);

describe("segment", () => {
  it("splits sentences and keeps exact positions", () => {
    const t = "Bonjour. Ça va ? Oui !";
    const { sentences } = segment(t);
    expect(sentences.map((s) => s.text)).toEqual(["Bonjour.", "Ça va ?", "Oui !"]);
    for (const s of sentences) expect(t.slice(s.start, s.end)).toBe(s.text);
  });

  it("does not split on abbreviations or initials", () => {
    expect(texts("Il a vu M. Dupont, p. ex. hier. Then e.g. Paris and J. R. Tolkien arrived. Fin.")).toEqual([
      "Il a vu M. Dupont, p. ex. hier.",
      "Then e.g. Paris and J. R. Tolkien arrived.",
      "Fin.",
    ]);
  });

  it("does not split decimals", () => {
    expect(texts("Il mesure 3.5 mètres. Voilà.")).toEqual(["Il mesure 3.5 mètres.", "Voilà."]);
  });

  it("handles ellipsis and French quotes", () => {
    expect(texts("Il hésita… « Non ! » dit-elle. Puis rien.")).toEqual([
      "Il hésita…",
      "« Non ! » dit-elle.",
      "Puis rien.",
    ]);
  });

  it("ends a sentence at each block and builds paragraphs", () => {
    const { sentences, paragraphs } = segment("Titre\nPremière phrase. Deuxième ici.");
    expect(sentences.map((s) => s.text)).toEqual(["Titre", "Première phrase.", "Deuxième ici."]);
    expect(paragraphs.map((p) => ({ text: p.text, wordCount: p.wordCount, sentences: p.sentences }))).toEqual([
      { text: "Titre", wordCount: 1, sentences: [0] },
      { text: "Première phrase. Deuxième ici.", wordCount: 4, sentences: [1, 2] },
    ]);
  });

  it("counts words with apostrophes and digits", () => {
    expect(segment("Aujourd'hui l’été, 2026 !").words.map((w) => w.text)).toEqual(["Aujourd'hui", "l’été", "2026"]);
  });

  it("skips empty blocks and handles empty text", () => {
    expect(segment("")).toEqual({ words: [], sentences: [], paragraphs: [] });
    expect(segment("A.\n\n  \nB.").paragraphs.map((p) => p.text)).toEqual(["A.", "B."]);
  });

  it("gives each sentence its word count", () => {
    expect(segment("Un deux trois. Quatre.").sentences.map((s) => s.wordCount)).toEqual([3, 1]);
  });
});
