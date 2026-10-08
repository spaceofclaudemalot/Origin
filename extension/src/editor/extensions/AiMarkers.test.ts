import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../schema";
import {
  aiMarkersPlugin, setMarkers, setMarkersVisible, markersVisible, visibleDecorations,
  findMarkerRange, markerLevel, markerAttrs,
} from "./AiMarkers";
import type { Detection } from "../../types/types";

const schema = getSchema(baseExtensions());

function stateWith(text: string) {
  return EditorState.create({
    schema,
    doc: schema.nodeFromJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }),
    plugins: [aiMarkersPlugin()],
  });
}

const det = (id: string, score = 50): Detection => ({
  id, type: "lexical", category: "lexical-marker", text: "", start: 0, end: 0,
  score, confidence: 0.7, explanation: "", suggestions: [],
});

describe("markerLevel", () => {
  it("buckets scores", () => {
    expect(markerLevel(0)).toBe("low");
    expect(markerLevel(39)).toBe("low");
    expect(markerLevel(40)).toBe("medium");
    expect(markerLevel(69)).toBe("medium");
    expect(markerLevel(70)).toBe("high");
  });
});

describe("AiMarkers plugin", () => {
  it("adds inline decorations with level class and detection id, outside history", () => {
    let state = stateWith("Il faut delve ici");
    // « delve » commence à l'offset 8, position ProseMirror 9 (après l'ouverture du paragraphe)
    const tr = setMarkers(state, [{ from: 9, to: 14, detection: det("a", 80) }]);
    expect(tr.getMeta("addToHistory")).toBe(false);
    expect(tr.docChanged).toBe(false);
    state = state.apply(tr);

    const [deco] = visibleDecorations(state).find();
    expect(deco.from).toBe(9);
    expect(deco.to).toBe(14);
    expect(deco.spec.detectionId).toBe("a");
    expect(markerAttrs(det("a", 80))).toEqual({
      class: "to-marker to-marker--high",
      "data-detection-id": "a",
    });
  });

  it("maps markers through edits until the next analysis", () => {
    let state = stateWith("Il faut delve ici");
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: det("a") }]));
    state = state.apply(state.tr.insertText("Oui. ", 1));
    expect(findMarkerRange(state, "a")).toEqual({ from: 14, to: 19 });
    expect(state.doc.textBetween(14, 19)).toBe("delve");
  });

  it("drops a marker whose text was deleted", () => {
    let state = stateWith("Il faut delve ici");
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: det("a") }]));
    state = state.apply(state.tr.delete(9, 14));
    expect(findMarkerRange(state, "a")).toBeNull();
  });

  it("replaces previous markers on a new set", () => {
    let state = stateWith("abc def");
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    state = state.apply(setMarkers(state, [{ from: 5, to: 8, detection: det("b") }]));
    expect(findMarkerRange(state, "a")).toBeNull();
    expect(findMarkerRange(state, "b")).toEqual({ from: 5, to: 8 });
  });

  it("hides decorations without forgetting them", () => {
    let state = stateWith("abc");
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    state = state.apply(setMarkersVisible(state, false));
    expect(markersVisible(state)).toBe(false);
    expect(visibleDecorations(state).find()).toHaveLength(0);
    expect(findMarkerRange(state, "a")).toEqual({ from: 1, to: 4 });
    state = state.apply(setMarkersVisible(state, true));
    expect(visibleDecorations(state).find()).toHaveLength(1);
  });

  it("never alters the document JSON", () => {
    let state = stateWith("abc");
    const before = JSON.stringify(state.doc.toJSON());
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    expect(JSON.stringify(state.doc.toJSON())).toBe(before);
  });
});
