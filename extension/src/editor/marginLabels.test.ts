import { describe, it, expect } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { baseExtensions } from "./schema";
import { buildTextIndex } from "../analysis/positions";
import { blockAnnotations, reconcileAnnotations, stackLabels } from "./marginLabels";
import type { Detection, GlobalSignal } from "../types/types";

const schema = getSchema(baseExtensions());
const docOf = (content: JSONContent[]) => schema.nodeFromJSON({ type: "doc", content });
const p = (text: string): JSONContent => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] });

function det(text: string, full: string, score = 50, id = text): Detection {
  const start = full.indexOf(text);
  return { id, type: "lexical", category: "lexical-marker", text, start, end: start + text.length, score, confidence: 0.7, explanation: "", suggestions: [] };
}
function sig(id: GlobalSignal["id"], status: GlobalSignal["status"], ranges: Array<{ start: number; end: number }>): GlobalSignal {
  return { id, family: "connectors", label: id, value: 0, display: "", score: 0, status, explanation: "", ranges };
}

function run(content: JSONContent[], detections: (full: string) => Detection[], signals: (full: string) => GlobalSignal[] = () => []) {
  const doc = docOf(content);
  const index = buildTextIndex(doc);
  return blockAnnotations(doc, { detections: detections(index.text), signals: signals(index.text) }, index);
}

describe("blockAnnotations", () => {
  it("regroupe les marqueurs par paragraphe et ignore les paragraphes sans marqueur", () => {
    const out = run([p("Il est essentiel de souligner"), p("Rien ici"), p("Une dynamique remarquable")],
      (f) => [det("essentiel", f, 30), det("souligner", f, 80), det("remarquable", f, 50)]);
    expect(out.map((a) => [a.markerCount, a.maxLevel])).toEqual([[2, "high"], [1, "medium"]]);
  });
  it("éléments de liste et cellules de tableau comptent séparément", () => {
    const li = (t: string): JSONContent => ({ type: "listItem", content: [p(t)] });
    const cell = (t: string): JSONContent => ({ type: "tableCell", content: [p(t)] });
    const out = run([
      { type: "bulletList", content: [li("alpha marqueur"), li("beta marqueur")] },
      { type: "table", content: [{ type: "tableRow", content: [cell("gamma marqueur"), cell("delta")] }] },
    ], (f) => ["alpha", "beta", "gamma"].map((w) => det(w, f)));
    expect(out).toHaveLength(3);
    expect(out.every((a) => a.markerCount === 1)).toBe(true);
  });
  it("signaux : alert inclus, ok/insufficient exclus", () => {
    const out = run([p("Par ailleurs, ceci."), p("En outre, cela.")], () => [], (f) => [
      sig("connector-density", "alert", [{ start: 0, end: f.indexOf("\n") }]),
      sig("rhythm", "ok", [{ start: f.indexOf("En"), end: f.length }]),
      sig("paragraph-uniformity", "insufficient", [{ start: f.indexOf("En"), end: f.length }]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].signals).toEqual(["connector-density"]);
    expect(out[0].markerCount).toBe(0);
    expect(out[0].maxLevel).toBeNull();
    expect(out[0].signalRanges).toHaveLength(1);
  });
  it("un signal présent deux fois dans un bloc n'est listé qu'une fois", () => {
    const out = run([p("Un. Deux.")], () => [], () => [sig("rhythm", "alert", [{ start: 0, end: 3 }, { start: 4, end: 9 }])]);
    expect(out[0].signals).toEqual(["rhythm"]);
    expect(out[0].signalRanges).toHaveLength(2);
  });
  it("marqueur à cheval : compté dans le bloc de départ uniquement", () => {
    const out = run([p("début fin"), p("suite")], (f) => [{ ...det("fin", f), end: f.indexOf("suite") + 5 }]);
    expect(out).toHaveLength(1);
    expect(out[0].markerCount).toBe(1);
  });
  it("document vide → []", () => {
    expect(run([p("")], () => [])).toEqual([]);
  });
  it("détection hors texte ignorée sans erreur", () => {
    const out = run([p("court")], () => [{ ...det("court", "court"), start: 50, end: 60 }]);
    expect(out).toEqual([]);
  });
  it("pos désigne le nœud du bloc", () => {
    const doc = docOf([p("un"), p("deux marqueur")]);
    const index = buildTextIndex(doc);
    const [a] = blockAnnotations(doc, { detections: [det("marqueur", index.text)], signals: [] }, index);
    expect(doc.nodeAt(a.pos)?.textContent).toBe("deux marqueur");
  });
});

describe("stackLabels", () => {
  it("laisse en place des étiquettes espacées", () => {
    expect(stackLabels([{ top: 0, height: 20 }, { top: 100, height: 20 }], 4)).toEqual([0, 100]);
  });
  it("décale celles qui se chevauchent, en cascade", () => {
    expect(stackLabels([{ top: 0, height: 20 }, { top: 10, height: 20 }, { top: 12, height: 20 }], 4)).toEqual([0, 24, 48]);
  });
  it("liste vide", () => {
    expect(stackLabels([], 4)).toEqual([]);
  });
});

describe("reconcileAnnotations", () => {
  const a = (pos: number) => ({ pos, markerCount: 1, maxLevel: "low" as const, detectionIds: [`d${pos}`], signals: [], signalRanges: [] });
  const A = {}, B = {};
  it("analyse à jour : la remplace", () => {
    expect(reconcileAnnotations({ owner: A, list: [a(0)] }, A, [a(5)])).toEqual({ owner: A, list: [a(5)] });
  });
  it("analyse périmée, même éditeur : garde les étiquettes", () => {
    expect(reconcileAnnotations({ owner: A, list: [a(0)] }, A, null)).toEqual({ owner: A, list: [a(0)] });
  });
  it("analyse périmée, nouvel éditeur (autre document) : aucune étiquette", () => {
    expect(reconcileAnnotations({ owner: A, list: [a(0)] }, B, null)).toEqual({ owner: B, list: [] });
  });
});
