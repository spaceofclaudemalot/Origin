// Entrypoint du service worker principal de l'extension Chrome.
// Sert l'analyse rapide demandée par le popup (ANALYZE_TEXT).
import { createDetectorService } from "../analysis/service";
import type { AnalysisResult } from "../types/types";

const service = createDetectorService();

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
