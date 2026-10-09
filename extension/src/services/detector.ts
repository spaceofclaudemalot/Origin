import type {
  Detection,
  AnalysisResult,
  Detector,
  DetectionCategory,
  GlobalDetector,
  GlobalSignal,
  SignalFamily,
} from "../types/types";
import { segment } from "../analysis/segment";
import { computeScore } from "../analysis/scoring";

function isGlobal(d: Detector): d is Detector & GlobalDetector {
  return typeof (d as Partial<GlobalDetector>).signals === "function";
}

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
    const segmented = segment(text);
    const detections: Detection[] = [];
    const signals: GlobalSignal[] = [];
    const registered = new Set<SignalFamily>();
    const categories: Record<DetectionCategory, number> = {
      "lexical-marker": 0,
      "discourse-structure": 0,
      transition: 0,
      "style-regularity": 0,
      anomaly: 0,
    };

    for (const detector of this.detectors.values()) {
      registered.add(detector.family ?? "vocabulary");
      const results = await detector.detect(text);
      detections.push(...results);
      for (const d of results) categories[d.category] += 1;
      if (isGlobal(detector)) signals.push(...detector.signals(text, segmented));
    }

    const wordCount = segmented.words.length;
    const { totalScore, confidence, families } = computeScore({ detections, signals, wordCount, registered });

    return {
      totalScore,
      confidence,
      markerCount: detections.length,
      categories,
      detections,
      families,
      signals,
      wordCount,
    };
  }

}