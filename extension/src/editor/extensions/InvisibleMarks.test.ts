import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../schema";
import { invisibleMarksPlugin, setInvisibleMarks, invisibleDecorations } from "./InvisibleMarks";
import { cleanupTransaction } from "../invisibleCleanup";
import { buildTextIndex } from "../../analysis/positions";
import { findInvisibles } from "../../detectors/invisibles";

const schema = getSchema(baseExtensions());
const stateWith = (...paragraphs: string[]) =>
  EditorState.create({
    schema,
    doc: schema.nodeFromJSON({
      type: "doc",
      content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
    }),
    plugins: [invisibleMarksPlugin()],
  });

describe("InvisibleMarks", () => {
  it("shows a labelled badge outside history and without changing the doc", () => {
    let state = stateWith("Bon​jour");
    const before = JSON.stringify(state.doc.toJSON());
    const tr = setInvisibleMarks(state, [{ from: 4, to: 5, label: "ZWSP", severity: "hint" }]);
    expect(tr.getMeta("addToHistory")).toBe(false);
    state = state.apply(tr);
    const [d] = invisibleDecorations(state).find();
    expect([d.from, d.to]).toEqual([4, 5]);
    expect(JSON.stringify(state.doc.toJSON())).toBe(before);
  });

  it("clears with an empty list", () => {
    let state = stateWith("Bon​jour");
    state = state.apply(setInvisibleMarks(state, [{ from: 4, to: 5, label: "ZWSP", severity: "hint" }]));
    state = state.apply(setInvisibleMarks(state, []));
    expect(invisibleDecorations(state).find()).toHaveLength(0);
  });
});

describe("cleanupTransaction", () => {
  it("cleans every paragraph in one undoable transaction, keeping French typography", () => {
    const state = stateWith("the model​ said", "Bonjour ! fin\u{E0041}");
    const index = buildTextIndex(state.doc);
    const tr = cleanupTransaction(state, index, findInvisibles(index.text));
    expect(tr.getMeta("addToHistory")).not.toBe(false);
    const next = state.apply(tr);
    expect(next.doc.textBetween(0, next.doc.content.size, "\n")).toBe("the model said\nBonjour ! fin");
  });
});
