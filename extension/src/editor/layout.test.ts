import { describe, it, expect } from "vitest";
import { layoutFor, readPrefs, writePrefs, LAYOUT_KEY } from "./layout";

describe("layoutFor", () => {
  it("≥1440 : docs épinglés, analyse en colonne, étiquettes en gouttière", () => {
    expect(layoutFor(1600, {})).toEqual({ docs: "pinned", analysis: "column", labels: "gutter" });
  });
  it("1200–1439 : docs en tiroir", () => {
    expect(layoutFor(1300, {})).toEqual({ docs: "drawer", analysis: "column", labels: "gutter" });
  });
  it("960–1199 : analyse en tiroir, étiquettes dans la marge", () => {
    expect(layoutFor(1000, {})).toEqual({ docs: "drawer", analysis: "drawer", labels: "inset" });
  });
  it("<960 : tout en tiroir", () => {
    expect(layoutFor(800, {})).toEqual({ docs: "drawer", analysis: "drawer", labels: "inset" });
  });
  it("respecte un désépinglage explicite au-dessus de 1440", () => {
    expect(layoutFor(1600, { docsPinned: false }).docs).toBe("drawer");
  });
  it("respecte un épinglage explicite entre 1200 et 1439", () => {
    expect(layoutFor(1300, { docsPinned: true }).docs).toBe("pinned");
  });
  it("ignore l'épinglage sous 1200 px", () => {
    expect(layoutFor(1100, { docsPinned: true }).docs).toBe("drawer");
  });
  it("analyse masquée explicitement → tiroir même en grand", () => {
    expect(layoutFor(1600, { analysisShown: false }).analysis).toBe("drawer");
  });
  it("analyse montrée explicitement sous 1200 reste en tiroir (pas la place)", () => {
    expect(layoutFor(1000, { analysisShown: true }).analysis).toBe("drawer");
  });
  it("bornes exactes", () => {
    expect(layoutFor(1440, {}).docs).toBe("pinned");
    expect(layoutFor(1439, {}).docs).toBe("drawer");
    expect(layoutFor(1200, {}).analysis).toBe("column");
    expect(layoutFor(1199, {}).analysis).toBe("drawer");
  });
});

describe("préférences", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it("aller-retour", () => {
    const s = mem();
    writePrefs({ docsPinned: true }, s);
    expect(readPrefs(s)).toEqual({ docsPinned: true });
  });
  it("JSON corrompu → {}", () => {
    const s = mem();
    s.setItem(LAYOUT_KEY, "{oops");
    expect(readPrefs(s)).toEqual({});
  });
  it("stockage qui lève → {} et pas d'exception à l'écriture", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(readPrefs(bad)).toEqual({});
    expect(() => writePrefs({ docsPinned: true }, bad)).not.toThrow();
  });
  it("valeurs non booléennes ignorées", () => {
    const s = mem();
    s.setItem(LAYOUT_KEY, JSON.stringify({ docsPinned: "yes", analysisShown: false }));
    expect(readPrefs(s)).toEqual({ analysisShown: false });
  });
});
