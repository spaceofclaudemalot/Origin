import type {
  Detection,
  AnalysisResult,
  Detector,
  DetectionCategory,
} from "../types/types";

export class DetectorService {
  private detectors: Map<string, Detector> = new Map();

  register(detector: Detector): void {
    if (this.detectors.has(detector.id)) {
      throw new Error(`Detector with id "${detector.id}" is already registered`);
    }
    this.detectors.set(detector.id, detector);
  }

  getRegisteredIds(): string[] {
    return Array.from(this.detectors.keys());
  }

  async detectSingle(name: string, text: string): Promise<Detection[]> {
    const detector = this.detectors.get(name);
    if (!detector) {
      throw new Error(`Unknown detector: ${name}`);
    }
    return detector.detect(text);
  }

  async detectAll(text: string): Promise<AnalysisResult> {
    const detections: Detection[] = [];
    const categories: Record<DetectionCategory, number> = {
      "lexical-marker": 0,
      "discourse-structure": 0,
      transition: 0,
      "style-regularity": 0,
      anomaly: 0,
    };
    const scores: number[] = [];

    for (const detector of this.detectors.values()) {
      const results = await detector.detect(text);
      detections.push(...results);
      for (const d of results) {
        categories[d.category] += 1;
        scores.push(d.score);
      }
    }

    // Score agrégé : moyenne des scores pondérée par la confiance, bornée 0–100
    let totalScore = 0;
    if (scores.length > 0) {
      const weightedSum = scores.reduce(
        (acc, score) => acc + score,
        0,
      );
      totalScore = Math.min(100, Math.max(0, Math.round(weightedSum / scores.length)));
    }

    // Niveau de confiance global
    let confidence: "low" | "medium" | "high" = "low";
    if (detections.length >= 3) {
      confidence = detections.every((d) => d.confidence >= 0.7) ? "high" : "medium";
    } else if (detections.length > 0) {
      confidence = detections[0].confidence >= 0.7 ? "medium" : "low";
    }

    return {
      totalScore,
      confidence,
      markerCount: detections.length,
      categories,
      detections,
    };
  }
}