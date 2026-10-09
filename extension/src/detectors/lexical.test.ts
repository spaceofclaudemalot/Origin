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
    const result = await detector.detect("We delve into this comprehensive approach.");
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
    const enOnly = await detector.detect("un enjeu primordial", "en");
    const frOrAny = await detector.detect("un enjeu primordial");
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

  it("detects French vocabulary markers", async () => {
    const result = await detector.detect("Un enjeu primordial et incontournable.");
    expect(result.map((d) => d.text)).toEqual(["primordial", "incontournable"]);
  });

  it("no longer reports connectors or stock phrases (moved to their own detectors)", async () => {
    expect(await detector.detect("Furthermore, moreover, additionally.")).toEqual([]);
    expect(await detector.detect("En outre, il convient de noter que cette approche permet de réussir.")).toEqual([]);
  });

  it("does not match a marker inside an accented word", async () => {
    expect(await detector.detect("La crucialité du sujet.")).toEqual([]);
  });

  it("detects added English and French terms", async () => {
    const en = await detector.detect("A robust, seamless and holistic plan.");
    expect(en.map((d) => d.text)).toEqual(["robust", "seamless", "holistic"]);
    const fr = await detector.detect("C'est la pierre angulaire, incontestablement.");
    expect(fr.map((d) => d.text)).toEqual(["pierre angulaire", "incontestablement"]);
  });

  it("belongs to the vocabulary family", () => {
    expect(detector.family).toBe("vocabulary");
  });
});
describe("LexicalDetector offsets", () => {
  it("keeps offsets on the original text when lowercasing changes its length (İ)", async () => {
    const text = "İstanbul. We delve into this comprehensive topic.";
    const result = await new LexicalDetector().detect(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const d of result) {
      expect(text.slice(d.start, d.end).toLowerCase()).toBe(d.text.toLowerCase());
    }
  });
});
