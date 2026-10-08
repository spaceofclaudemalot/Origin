/**
 * Tests pour LexicalDetector (TDD — test d'échec d'abord).
 * Couvre : détection marqueurs, pas de faux positifs, filtre langue, caractères regex, déduplication, score borné.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LexicalDetector } from "./lexical";

describe("LexicalDetector", () => {
  let detector: LexicalDetector;

  beforeEach(() => {
    detector = new LexicalDetector();
  });

  it("detects known lexical markers in English text", async () => {
    const result = await detector.detect("Furthermore, this approach is comprehensive.");
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("no false positives for substring words (e.g., delve inside developper)", async () => {
    const result = await detector.detect("Ceci n'est pas un développement de la solution.");
    expect(result.length).toBe(0);
  });

  it("no false positives for short substring matches (underscores)", async () => {
    const result = await detector.detect("The underscores in this code need fixing.");
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("underscores");
  });

  it("applies language filter correctly", async () => {
    const enOnly = await detector.detect("il convient de noter ceci", "en");
    const frOrAny = await detector.detect("il convient de noter ceci");
    expect(enOnly.length).toBe(0);
    expect(frOrAny.length).toBe(1);
  });

  it("handles special regex characters in terms without throwing", async () => {
    await expect(detector.detect("this involves A/B/C analysis")).resolves.toBeDefined();
    await expect(detector.detect("text with dots.")).resolves.toBeDefined();
  });

  it("deduplicates overlapping matches", async () => {
    const result = await detector.detect("in conclusion in conclusion");
    expect(result.length).toBe(2);
  });

  it("returns empty array for empty text", async () => {
    const result = await detector.detect("");
    expect(result.length).toBe(0);
  });

  it("score bounded to 100 on repeated markers", async () => {
    const text = Array(20).fill("comprehensive").join(" ");
    const result = await detector.detect(text);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((d) => expect(d.score).toBeLessThanOrEqual(100));
  });

  it("suggestions non empty for markers with replacements", async () => {
    const result = await detector.detect("comprehensive solution");
    result.forEach((d) => {
      if (d.type === "lexical") {
        expect(d.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  it("detects French discourse structure markers", async () => {
    const result = await detector.detect("En outre, il convient de noter que cette approche permet de réussir.");
    expect(result.length).toBeGreaterThanOrEqual(2);
    const hasFrench = result.some((d) => d.text.toLowerCase().includes("en outre") || d.text.toLowerCase().includes("il convient"));
    expect(hasFrench).toBe(true);
  });

  it("detects transition connectors with correct type", async () => {
    const result = await detector.detect("Furthermore, moreover, additionally.");
    const transitions = result.filter((d) => d.type === "connector");
    expect(transitions.length).toBe(3);
  });
});
describe("LexicalDetector offsets", () => {
  it("keeps offsets on the original text when lowercasing changes its length (İ)", async () => {
    const text = "İstanbul. Furthermore, this is comprehensive.";
    const result = await new LexicalDetector().detect(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const d of result) {
      expect(text.slice(d.start, d.end).toLowerCase()).toBe(d.text.toLowerCase());
    }
  });
});
