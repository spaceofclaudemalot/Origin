import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";

export function createDetectorService(): DetectorService {
  const service = new DetectorService();
  service.register(new LexicalDetector());
  return service;
}
