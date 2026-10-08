import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import type { JSONContent } from "@tiptap/core";
import { buildDocument, toHex, toHalfPoints, type DocxOptions } from "./toDocx";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../editor/schema";
import { aiMarkersPlugin, setMarkers } from "../editor/extensions/AiMarkers";

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

const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
const numIds = (xml: string) => [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);

// PNG 1×1 transparent
const PNG = Uint8Array.from(atob(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
), (c) => c.charCodeAt(0));

describe("toDocx — lists, links, tables, images", () => {
  it("exports bullet and nested lists with levels", async () => {
    const xml = await documentXml([{ type: "bulletList", content: [
      li(p([t("a")]), { type: "bulletList", content: [li(p([t("b")]))] }),
    ] }]);
    expect(xml).toMatch(/<w:ilvl w:val="0"\/>/);
    expect(xml).toMatch(/<w:ilvl w:val="1"\/>/);
  });

  it("restarts numbering for two separate ordered lists", async () => {
    const xml = await documentXml([
      { type: "orderedList", content: [li(p([t("un")])), li(p([t("deux")]))] },
      p([t("entre")]),
      { type: "orderedList", content: [li(p([t("un bis")]))] },
    ]);
    const ids = numIds(xml);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("indents extra paragraphs of a list item without numbering them", async () => {
    const xml = await documentXml([{ type: "bulletList", content: [li(p([t("a")]), p([t("suite")]))] }]);
    expect(numIds(xml)).toHaveLength(1);
    expect(xml).toMatch(/<w:ind w:left="720"/);
  });

  it("exports links as hyperlinks with relationship", async () => {
    const zip = await exportZip([p([t("site", [{ type: "link", attrs: { href: "https://example.com" } }])])]);
    const xml = await zip.file("word/document.xml")!.async("string");
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(xml).toMatch(/<w:hyperlink [^>]*r:id="[^"]+"/);
    expect(rels).toContain("https://example.com");
  });

  it("exports tables with header cells in bold", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [
        { type: "tableHeader", content: [p([t("H")])] },
        { type: "tableHeader", content: [p([t("H2")])] },
      ] },
      { type: "tableRow", content: [
        { type: "tableCell", content: [p([t("c1")])] },
        { type: "tableCell", content: [p([t("c2")])] },
      ] },
    ] }]);
    expect(xml).toMatch(/<w:tbl>/);
    expect(xml.match(/<w:tr[ >]/g)).toHaveLength(2);
    expect(xml).toMatch(/<w:b\/>.*H<\/w:t>/s);
  });

  it("keeps merged cells from pasted tables", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 2, rowspan: 1 }, content: [p([t("fusion")])] }] },
      { type: "tableRow", content: [
        { type: "tableCell", content: [p([t("a")])] },
        { type: "tableCell", content: [p([t("b")])] },
      ] },
    ] }]);
    expect(xml).toMatch(/<w:gridSpan w:val="2"\/>/);
  });

  it("gives an empty cell an empty paragraph", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [{ type: "tableCell", content: [] }] },
    ] }]);
    expect(xml).toMatch(/<w:tc>.*<w:p[ >\/].*<\/w:tc>/s);
  });

  it("embeds stored images scaled to the 16 cm content width", async () => {
    const zip = await exportZip(
      [{ type: "storedImage", attrs: { imageId: "img", width: 1210, height: 605, alt: "" } }],
      async (id) => (id === "img" ? new Blob([PNG], { type: "image/png" }) : undefined),
    );
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:drawing>/);
    // 1210×605 réduit à 605×303 px ; 1 px = 9525 EMU
    expect(xml).toMatch(/<wp:extent cx="5762625" cy="2886075"\/>/);
    expect(Object.keys(zip.files).some((f) => f.startsWith("word/media/"))).toBe(true);
  });

  it("skips missing images and unsupported formats without failing", async () => {
    const xml = await documentXml(
      [
        { type: "storedImage", attrs: { imageId: "missing", width: 10, height: 10, alt: "" } },
        { type: "storedImage", attrs: { imageId: "svg", width: 10, height: 10, alt: "" } },
        p([t("après")]),
      ],
      async (id) => (id === "svg" ? new Blob(["<svg/>"], { type: "image/svg+xml" }) : undefined),
    );
    expect(xml).not.toMatch(/<w:drawing>/);
    expect(xml).toMatch(/après/);
  });

  it("never exports AI markers", async () => {
    const schema = getSchema(baseExtensions());
    let state = EditorState.create({
      schema,
      doc: schema.nodeFromJSON({ type: "doc", content: [p([t("Il faut delve ici")])] }),
      plugins: [aiMarkersPlugin()],
    });
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: {
      id: "a", type: "lexical", category: "lexical-marker", text: "delve", start: 8, end: 13,
      score: 90, confidence: 0.9, explanation: "", suggestions: [],
    } }]));
    const xml = await documentXml(state.doc.toJSON().content);
    expect(xml).not.toMatch(/to-marker|detection/);
    expect(xml).toMatch(/Il faut delve ici/);
  });
});
