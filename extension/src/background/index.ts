// Entrypoint du service worker principal de l'extension Chrome.
// Sert l'analyse rapide demandée par le popup (ANALYZE_TEXT).
import { createDetectorService } from "../analysis/service";
import type { AnalysisResult, AnalyzeRequest, AnalyzeResponse } from "../types/types";

const service = createDetectorService();

chrome.runtime.onMessage.addListener(
  (
    message: Partial<AnalyzeRequest> | undefined,
    _sender,
    sendResponse: (response: AnalyzeResponse) => void,
  ) => {
    // Ignorer les messages destinés à d'autres listeners
    if (message?.type !== "ANALYZE_TEXT") return false;

    if (typeof message.text !== "string" || !message.text.trim()) {
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
