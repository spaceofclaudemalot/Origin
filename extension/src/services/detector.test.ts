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