import { describe, it, expect } from "vitest";
import { computeScore } from "./scoring";
import type { Detection, DetectionType, GlobalSignal, SignalFamily } from "../types/types";

const det = (type: DetectionType, confidence = 1, weight?: number): Detection => ({
  id: Math.random().toString(), type, category: "lexical-marker", text: "x", start: 0, end: 1,
  score: 50, confidence, explanation: "", suggestions: [], ...(weight ? { weight } : {}),
});
const sig = (id: GlobalSignal["id"], score: number, status: GlobalSignal["status"] = "ok"): GlobalSignal => ({
  id, family: id === "connector-density" ? "connectors" : "regularity", label: "", value: 0, display: "",
  score, status, explanation: "", ranges: [],
});
const ALL = new Set<SignalFamily>(["vocabulary", "connectors", "stereotypes", "regularity"]);
const family = (r: ReturnType<typeof computeScore>, f: SignalFamily) => r.families.find((x) => x.family === f)!;

describe("computeScore", () => {
  it("scores vocabulary by confidence density: 3 full markers per 100 words = 100", () => {
    const r = computeScore({ detections: [det("lexical"), det("lexical"), det("lexical")], signals: [], wordCount: 100, registered: ALL });
    expect(family(r, "vocabulary").score).toBe(100);
    const half = computeScore({ detections: [det("lexical", 0.5), det("lexical", 0.5), det("lexical", 0.5)], signals: [], wordCount: 100, registered: ALL });
    expect(family(half, "vocabulary").score).toBe(50);
  });

  it("scores stereotypes by weighted density: 1.5 per 100 words = 100", () => {
    const r = computeScore({ detections: [det("structural"), det("structural", 0.4, 0.5)], signals: [], wordCount: 100, registered: ALL });
    expect(family(r, "stereotypes").score).toBe(100);
  });

  it("uses signal scores for connectors and the max of regularity signals", () => {
    const r = computeScore({
      detections: [], wordCount: 200, registered: ALL,
      signals: [sig("connector-density", 40), sig("rhythm", 30), sig("paragraph-uniformity", 70), sig("topic-sentences", 90, "insufficient")],
    });
    expect(family(r, "connectors").score).toBe(40);
    expect(family(r, "regularity").score).toBe(70);
  });

  it("excludes non-measurable families and renormalises weights", () => {
    // seul le vocabulaire est enregistré : 100 × 0,30 / 0,30 = 100
    const r = computeScore({ detections: Array(5).fill(det("lexical")), signals: [], wordCount: 50, registered: new Set(["vocabulary"]) });
    expect(r.totalScore).toBe(100);
    expect(r.families.filter((f) => f.measurable).map((f) => f.family)).toEqual(["vocabulary"]);
  });

  it("marks density families as not measurable under 30 words", () => {
    const r = computeScore({ detections: [det("lexical")], signals: [], wordCount: 20, registered: ALL });
    expect(family(r, "vocabulary").measurable).toBe(false);
    expect(r.totalScore).toBe(0);
  });

  it("computes the weighted mean over measurable families", () => {
    // vocabulaire 100 (0,30), stéréotypes 0 (0,25), connecteurs 50 (0,20), régularité 100 (0,25) → 65
    const r = computeScore({
      detections: [det("lexical"), det("lexical"), det("lexical")], wordCount: 100, registered: ALL,
      signals: [sig("connector-density", 50), sig("rhythm", 100)],
    });
    expect(r.totalScore).toBe(Math.round((100 * 0.3 + 0 * 0.25 + 50 * 0.2 + 100 * 0.25) / 1));
  });

  it("needs several families above 50 for higher confidence", () => {
    const base = { wordCount: 200, registered: ALL };
    const one = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [] });
    expect(one.confidence).toBe("low");
    const two = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80)] });
    expect(two.confidence).toBe("medium");
    const three = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80), sig("connector-density", 60)] });
    expect(three.confidence).toBe("high");
    const short = computeScore({ ...base, wordCount: 79, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80), sig("connector-density", 60)] });
    expect(short.confidence).toBe("low");
  });

  it("returns 0 and low confidence for empty input", () => {
    expect(computeScore({ detections: [], signals: [], wordCount: 0, registered: ALL })).toMatchObject({ totalScore: 0, confidence: "low" });
  });
});
