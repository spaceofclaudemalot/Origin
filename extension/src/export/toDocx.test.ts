import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import type { JSONContent } from "@tiptap/core";
import { buildDocument, toHex, toHalfPoints, type DocxOptions } from "./toDocx";

const noImages: DocxOptions["getImage"] = async () => undefined;

async function exportZip(content: JSONContent[], getImage = noImages) {
  const doc = await buildDocument({ type: "doc", content }, { title: "T", getImage });
  return JSZip.loadAsync(await Packer.toBuffer(doc));
}

async function documentXml(content: JSONContent[], getImage = noImages) {
  return (await exportZip(content, getImage)).file("word/document.xml")!.async("string");
}

const p = (content: JSONContent[], attrs?: Record<string, unknown>): JSONContent => ({ type: "paragraph", ...(attrs ? { attrs } : {}), content });
const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text, ...(marks ? { marks } : {}) });

describe("toHex", () => {
  it("normalises css colours", () => {
    expect(toHex("#abc")).toBe("AABBCC");
    expect(toHex("#fef08a")).toBe("FEF08A");
    expect(toHex("rgb(255, 0, 16)")).toBe("FF0010");
    expect(toHex("rgba(0,0,0,0.5)")).toBe("000000");
    expect(toHex("red")).toBeUndefined();
    expect(toHex(null)).toBeUndefined();
  });
});

describe("toHalfPoints", () => {
  it("converts pt, px and unitless sizes", () => {
    expect(toHalfPoints("12pt")).toBe(24);
    expect(toHalfPoints("16px")).toBe(24);
    expect(toHalfPoints("14")).toBe(28);
    expect(toHalfPoints("big")).toBeUndefined();
    expect(toHalfPoints(undefined)).toBeUndefined();
  });
});

describe("toDocx — text and blocks", () => {
  it("exports an empty document as one empty paragraph", async () => {
    const xml = await documentXml([]);
    expect(xml).toMatch(/<w:body>.*<w:p[ >\/]/s);
  });

  it("exports paragraph text", async () => {
    expect(await documentXml([p([t("Bonjour")])])).toMatch(/<w:t[^>]*>Bonjour<\/w:t>/);
  });

  it("exports headings 1-3 as Word heading styles", async () => {
    const xml = await documentXml([1, 2, 3].map((level) => ({ type: "heading", attrs: { level }, content: [t(`H${level}`)] })));
    expect(xml).toMatch(/w:pStyle w:val="Heading1"/);
    expect(xml).toMatch(/w:pStyle w:val="Heading2"/);
    expect(xml).toMatch(/w:pStyle w:val="Heading3"/);
  });

  it("exports bold, italic, underline", async () => {
    const xml = await documentXml([p([t("x", [{ type: "bold" }, { type: "italic" }, { type: "underline" }])])]);
    expect(xml).toMatch(/<w:b\/>/);
    expect(xml).toMatch(/<w:i\/>/);
    expect(xml).toMatch(/<w:u w:val="single"\/>/);
  });

  it("exports font family, size, colour and highlight", async () => {
    const xml = await documentXml([p([t("x", [
      { type: "textStyle", attrs: { fontFamily: "\"Times New Roman\", serif", fontSize: "14pt", color: "#ff0000" } },
      { type: "highlight", attrs: { color: "#fef08a" } },
    ])])]);
    expect(xml).toMatch(/w:ascii="Times New Roman"/);
    expect(xml).toMatch(/<w:sz w:val="28"\/>/);
    expect(xml).toMatch(/<w:color w:val="FF0000"\/>/);
    expect(xml).toMatch(/<w:shd [^>]*w:fill="FEF08A"/);
  });

  it("uses yellow when highlight has no colour", async () => {
    const xml = await documentXml([p([t("x", [{ type: "highlight" }])])]);
    expect(xml).toMatch(/<w:shd [^>]*w:fill="FEF08A"/);
  });

  it("exports alignment and line height", async () => {
    const xml = await documentXml([
      p([t("c")], { textAlign: "center", lineHeight: "1.5" }),
      p([t("j")], { textAlign: "justify" }),
    ]);
    expect(xml).toMatch(/<w:jc w:val="center"\/>/);
    expect(xml).toMatch(/<w:jc w:val="both"\/>/);
    expect(xml).toMatch(/<w:spacing [^>]*w:line="360"/);
  });

  it("exports blockquote paragraphs indented with a left border", async () => {
    const xml = await documentXml([{ type: "blockquote", content: [p([t("cité")])] }]);
    expect(xml).toMatch(/<w:ind w:left="720"/);
    expect(xml).toMatch(/<w:pBdr>.*<w:left /s);
  });

  it("exports hard breaks", async () => {
    const xml = await documentXml([p([t("a"), { type: "hardBreak" }, t("b")])]);
    expect(xml).toMatch(/<w:br\/>/);
  });

  it("sets A4 page with 2.5 cm margins", async () => {
    const xml = await documentXml([p([t("x")])]);
    expect(xml).toMatch(/<w:pgSz [^>]*w:w="11906"[^>]*w:h="16838"/);
    expect(xml).toMatch(/<w:pgMar [^>]*w:top="1417"/);
  });

  it("produces a Blob through toDocx", async () => {
    const { toDocx } = await import("./toDocx");
    const blob = await toDocx({ type: "doc", content: [p([t("x")])] }, { title: "T", getImage: noImages });
    expect(blob.size).toBeGreaterThan(0);
  });
});
