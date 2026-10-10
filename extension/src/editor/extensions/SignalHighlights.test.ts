import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../schema";
import { signalHighlightsPlugin, setSignalHighlight, signalDecorations } from "./SignalHighlights";

const schema = getSchema(baseExtensions());
const stateWith = (text: string) =>
  EditorState.create({
    schema,
    doc: schema.nodeFromJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }),
    plugins: [signalHighlightsPlugin()],
  });

describe("SignalHighlights", () => {
  it("adds dotted-underline decorations outside history and without changing the doc", () => {
    let state = stateWith("Une phrase. Une autre.");
    const before = JSON.stringify(state.doc.toJSON());
    const tr = setSignalHighlight(state, [{ from: 1, to: 12 }]);
    expect(tr.getMeta("addToHistory")).toBe(false);
    state = state.apply(tr);
    const [d] = signalDecorations(state).find();
    expect([d.from, d.to]).toEqual([1, 12]);
    expect(JSON.stringify(state.doc.toJSON())).toBe(before);
  });

  it("follows edits, then clears", () => {
    let state = stateWith("Une phrase. Une autre.");
    state = state.apply(setSignalHighlight(state, [{ from: 13, to: 23 }]));
    state = state.apply(state.tr.insertText("Oh. ", 1));
    const [d] = signalDecorations(state).find();
    expect(state.doc.textBetween(d.from, d.to)).toBe("Une autre.");
    state = state.apply(setSignalHighlight(state, null));
    expect(signalDecorations(state).find()).toHaveLength(0);
  });
});
