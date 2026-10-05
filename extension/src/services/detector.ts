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

    // Score agrégé : moyenne des scores, bornée 0–100
    // Avec bonus pour plusieurs détections de haute confiance
    let totalScore = 0;
    if (scores.length > 0) {
      const averageScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;
      // Bonus pour plusieurs détections de haute confiance (confidence >= 0.7)
      const highConfidenceCount = scores.filter((_, index) =>
        detections[index].confidence >= 0.7).length;
      const confidenceBonus = Math.min(0.2, highConfidenceCount * 0.01); // jusqu'à +20%
      totalScore = Math.min(100, Math.max(0, Math.round(averageScore * (1 + confidenceBonus))));
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