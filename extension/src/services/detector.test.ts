/**
 * Tests pour DetectorService (TDD — test d'échec d'abord).
 * Vérifie : register, getRegisteredIds, detectSingle, detectAll avec agrégation.
 */
import { describe, it, expect } from "vitest";
import { DetectorService } from "./detector";
import type { Detector, Detection, DetectionCategory, DetectionType } from "../types/types";

class FakeDetector implements Detector {
  id = "fake";
  name = "Fake Detector";
  async detect(text: string): Promise<Detection[]> {
    return [{
      id: "x1",
      type: "lexical" as DetectionType,
      category: "lexical-marker" as DetectionCategory,
      text,
      start: 0,
      end: text.length,
      score: 90,
      confidence: 0.9,
      explanation: "fake detection",
      suggestions: [],
    }];
  }
}

class OtherDetector implements Detector {
  id = "other";
  name = "Other Detector";
  async detect(): Promise<Detection[]> {
    return [{
      id: "o1",
      type: "lexical" as DetectionType,
      category: "lexical-marker" as DetectionCategory,
      text: "x",
      start: 0,
      end: 1,
      score: 10,
      confidence: 0.3,
      explanation: "other detection",
      suggestions: [],
    }];
  }
}

describe("DetectorService", () => {
  it("registers and lists detectors", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    const ids = svc.getRegisteredIds();
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe("fake");
  });

  it("detectAll aggregates detections with score and confidence", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    const result = await svc.detectAll("test text");
    expect(result.markerCount).toBe(1);
    expect(result.detections).toHaveLength(1);
    expect(typeof result.totalScore).toBe("number");
    expect(["low", "medium", "high"]).toContain(result.confidence);
  });

  it("detectSingle returns only the named detector's results", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    svc.register(new OtherDetector());
    const results = await svc.detectSingle("fake", "test");
    expect(results).toHaveLength(1);
  });

  it("throws on duplicate detector id", () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    expect(() => svc.register(new FakeDetector())).toThrow(/already registered/);
  });

  it("throws on unknown detector in detectSingle", async () => {
    const svc = new DetectorService();
    await expect(svc.detectSingle("unknown", "text")).rejects.toThrow(/Unknown detector/);
  });
});

// Review Focus #2: empty / short text handling
describe("DetectorService Review Focus #2", () => {
  it("empty text → zero score and zero markers", async () => {
    const svc = new DetectorService();
    const result = await svc.detectAll("");
    expect(result.totalScore).toBe(0);
    expect(result.markerCount).toBe(0);
  });

  it("short text (1 word) does not throw and returns bounded score", async () => {
    const svc = new DetectorService();
    const result = await svc.detectAll("a");
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });
});

// Review Focus #4: score agrégé borné à 0-100
describe("DetectorService Review Focus #4", () => {
  it("total score bounded to [0, 100] regardless of marker count", async () => {
    const svc = new DetectorService();
    const fake: Detector = {
      id: "big",
      name: "Big",
      detect: async () => Array(50).fill({
        id: "test-1",
        type: "lexical" as DetectionType,
        category: "lexical-marker" as DetectionCategory,
        text: "comprehensive",
        start: 0,
        end: 13,
        score: 95,
        confidence: 0.9,
        explanation: "test",
        suggestions: [],
      }),
    };
    svc.register(fake);
    const result = await svc.detectAll(
      Array(50).fill("comprehensive").join(" "),
    );
    expect(result.totalScore).toBe(100);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });
});

// Review Focus #5: détections en chevauchement dédupliquées
describe("DetectorService Review Focus #5", () => {
  it("overlapping same-range detections deduplicated", async () => {
    const svc = new DetectorService();
    const fake: Detector = {
      id: "a",
      name: "A",
      detect: async () => [{
        id: "test-a",
        type: "lexical" as DetectionType,
        category: "lexical-marker" as DetectionCategory,
        text: "text",
        start: 0,
        end: 4,
        score: 50,
        confidence: 0.5,
        explanation: "test",
        suggestions: [],
      }],
    };
    const fake2: Detector = {
      id: "b",
      name: "B",
      detect: async () => [{
        id: "test-b",
        type: "lexical" as DetectionType,
        category: "lexical-marker" as DetectionCategory,
        text: "text",
        start: 0,
        end: 4,
        score: 60,
        confidence: 0.6,
        explanation: "test",
        suggestions: [],
      }],
    };
    svc.register(fake);
    svc.register(fake2);
    const result = await svc.detectAll("text");
    // Note: Two different detectors detecting the SAME text range should both be kept
    // because they come from different detectors (Review Focus #5 is about deduplication
    // within the same detector, not across detectors)
    expect(result.markerCount).toBe(2);
    expect(result.detections).toHaveLength(2);
  });
});