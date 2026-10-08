import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { baseExtensions } from "./schema";

const schema = getSchema(baseExtensions());

describe("baseExtensions schema", () => {
  it("exposes every node and mark of scope B", () => {
    for (const n of [
      "doc", "paragraph", "heading", "blockquote", "bulletList", "orderedList",
      "listItem", "hardBreak", "table", "tableRow", "tableCell", "tableHeader", "storedImage",
    ]) {
      expect(schema.nodes[n], n).toBeDefined();
    }
    for (const m of ["bold", "italic", "underline", "link", "textStyle", "highlight"]) {
      expect(schema.marks[m], m).toBeDefined();
    }
  });

  it("drops code, codeBlock, strike and horizontalRule", () => {
    expect(schema.nodes.codeBlock).toBeUndefined();
    expect(schema.nodes.horizontalRule).toBeUndefined();
    expect(schema.marks.code).toBeUndefined();
    expect(schema.marks.strike).toBeUndefined();
  });

  it("round-trips paragraph attributes and textStyle attributes", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", lineHeight: "1.5" },
          content: [
            {
              type: "text",
              text: "Bonjour",
              marks: [
                { type: "textStyle", attrs: { fontFamily: "Georgia", fontSize: "14pt", color: "#ff0000" } },
                { type: "highlight", attrs: { color: "#fef08a" } },
              ],
            },
          ],
        },
        { type: "storedImage", attrs: { imageId: "img-1", width: 800, height: 600, alt: "chat" } },
      ],
    };
    const doc = schema.nodeFromJSON(json);
    const back = doc.toJSON();
    expect(back.content[0].attrs).toMatchObject({ textAlign: "center", lineHeight: "1.5" });
    expect(back.content[0].content[0].marks[0].attrs).toMatchObject({
      fontFamily: "Georgia", fontSize: "14pt", color: "#ff0000",
    });
    expect(back.content[1].attrs).toEqual({ imageId: "img-1", width: 800, height: 600, alt: "chat" });
  });
});
