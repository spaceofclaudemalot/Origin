import { describe, it, expect } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { baseExtensions } from "../editor/schema";
import { buildTextIndex, mapRange, mapRanges, toRanges } from "./positions";
import type { Detection } from "../types/types";

const schema = getSchema(baseExtensions());
const docOf = (content: JSONContent[]) => schema.nodeFromJSON({ type: "doc", content });
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text, ...(marks ? { marks } : {}) });

function det(start: number, end: number, id = `d${start}`): Detection {
  return {
    id, type: "lexical", category: "lexical-marker", text: "", start, end,
    score: 50, confidence: 0.7, explanation: "", suggestions: [],
  };
}

/** Plage ProseMirror du premier `needle` dans le texte brut. */
function rangeOf(doc: ReturnType<typeof docOf>, needle: string) {
  const index = buildTextIndex(doc);
  const start = index.text.indexOf(needle);
  expect(start, `"${needle}" absent de ${JSON.stringify(index.text)}`).toBeGreaterThanOrEqual(0);
  const [r] = toRanges(index, [det(start, start + needle.length)]);
  return doc.textBetween(r.from, r.to, "\n");
}

describe("buildTextIndex", () => {
  it("joins textblocks with \\n and ignores marks", () => {
    const doc = docOf([p(t("Un "), t("gras", [{ type: "bold" }]), t(" fin")), p(t("Deux"))]);
    expect(buildTextIndex(doc).text).toBe("Un gras fin\nDeux");
  });

  it("maps hard breaks to \\n and skips images", () => {
    const doc = docOf([
      p(t("l1"), { type: "hardBreak" }, t("l2")),
      { type: "storedImage", attrs: { imageId: "i", width: 1, height: 1, alt: "" } },
      p(t("après")),
    ]);
    expect(buildTextIndex(doc).text).toBe("l1\nl2\naprès");
  });

  it("separates list items and table cells", () => {
    const doc = docOf([
      { type: "bulletList", content: [
        { type: "listItem", content: [p(t("a")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("b"))] }] }] },
      ] },
      { type: "table", content: [{ type: "tableRow", content: [
        { type: "tableCell", content: [p(t("c1"))] },
        { type: "tableCell", content: [p(t("c2"))] },
      ] }] },
    ]);
    expect(buildTextIndex(doc).text).toBe("a\nb\nc1\nc2");
  });
});

describe("toRanges", () => {
  it("maps a word in a single paragraph", () => {
    expect(rangeOf(docOf([p(t("Il faut delve ici"))]), "delve")).toBe("delve");
  });

  it("maps a word in a later paragraph", () => {
    expect(rangeOf(docOf([p(t("Un")), p(t("Deux delve"))]), "delve")).toBe("delve");
  });

  it("maps a range crossing marks", () => {
    const doc = docOf([p(t("a "), t("bold", [{ type: "bold" }]), t(" c"))]);
    expect(rangeOf(doc, "old c")).toBe("old c");
  });

  it("maps a word after a hard break, an image, inside nested lists and table cells", () => {
    const doc = docOf([
      p(t("l1"), { type: "hardBreak" }, t("l2 x")),
      { type: "storedImage", attrs: { imageId: "i", width: 1, height: 1, alt: "" } },
      { type: "bulletList", content: [{ type: "listItem", content: [p(t("item y"))] }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [p(t("cell z"))] }] }] },
    ]);
    expect(rangeOf(doc, "l2 x")).toBe("l2 x");
    expect(rangeOf(doc, "item y")).toBe("item y");
    expect(rangeOf(doc, "cell z")).toBe("cell z");
  });

  it("handles astral characters (UTF-16 surrogate pairs)", () => {
    expect(rangeOf(docOf([p(t("😀 é delve 🎉"))]), "delve")).toBe("delve");
    expect(rangeOf(docOf([p(t("😀 é delve 🎉"))]), "🎉")).toBe("🎉");
  });

  it("maps a range spanning two paragraphs", () => {
    const doc = docOf([p(t("Un")), p(t("Deux"))]);
    const index = buildTextIndex(doc);
    const [r] = toRanges(index, [det(1, 5)]);
    expect(doc.textBetween(r.from, r.to, "\n")).toBe(index.text.slice(1, 5)); // "n\nDe"
  });

  it("drops invalid ranges", () => {
    const index = buildTextIndex(docOf([p(t("abc"))]));
    expect(toRanges(index, [det(-1, 2), det(2, 2), det(3, 2), det(0, 99)])).toEqual([]);
  });

  it("keeps the detection object on the range", () => {
    const index = buildTextIndex(docOf([p(t("abc"))]));
    const d = det(0, 1, "keep");
    expect(toRanges(index, [d])[0].detection).toBe(d);
  });
});

describe("mapRange / mapRanges", () => {
  it("maps plain ranges and drops invalid ones", () => {
    const doc = docOf([p(t("Un deux")), p(t("Trois"))]);
    const index = buildTextIndex(doc);
    const r = mapRange(index, 3, 7)!;
    expect(doc.textBetween(r.from, r.to)).toBe("deux");
    expect(mapRange(index, 5, 5)).toBeNull();
    expect(mapRanges(index, [{ start: 0, end: 2 }, { start: -1, end: 2 }, { start: 8, end: 13 }]).map((x) => doc.textBetween(x.from, x.to))).toEqual(["Un", "Trois"]);
  });
});
