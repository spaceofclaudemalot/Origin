// Entrypoint du service worker principal de l'extension Chrome.
// Implémenté dans la Tâche 5 (messagerie background ↔ content script).
import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";
import type { AnalysisResult } from "../types/types";

const service = new DetectorService();
service.register(new LexicalDetector());

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; text?: string },
    _sender,
    sendResponse: (response: {
      type: "ANALYSIS_READY" | "ANALYSIS_ERROR";
      result?: AnalysisResult;
      error?: string;
    }) => void,
  ) => {
    // Ignorer les messages destinés à d'autres listeners
    if (message.type !== "ANALYZE_TEXT") return false;

    if (!message.text?.trim()) {
      sendResponse({ type: "ANALYSIS_ERROR", error: "Texte manquant" });
      return false;
    }
    service
      .detectAll(message.text)
      .then((result: AnalysisResult) => sendResponse({ type: "ANALYSIS_READY", result }))
      .catch((error: Error) =>
        sendResponse({ type: "ANALYSIS_ERROR", error: error.message }),
      );
    return true; // message asynchrone
  },
);
export {};
