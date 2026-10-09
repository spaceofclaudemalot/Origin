import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";
import { ConnectorDetector } from "../detectors/connectors";
import { StereotypeDetector } from "../detectors/stereotypes";
import { RhythmDetector } from "../detectors/rhythm";
import { ParagraphDetector } from "../detectors/paragraphs";

export function createDetectorService(): DetectorService {
  const service = new DetectorService();
  service.register(new LexicalDetector());
  service.register(new ConnectorDetector());
  service.register(new StereotypeDetector());
  service.register(new RhythmDetector());
  service.register(new ParagraphDetector());
  return service;
}
