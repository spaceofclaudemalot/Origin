// Entrypoint du content script de l'extension Chrome.
// Implémenté dans la Tâche 5 (messagerie background ↔ content script).
import type { AnalysisResult } from "../types/types";
import { highlightText } from "./highlighter";

const STORAGE_KEY = "textorigin:selection";

// Capture la sélection utilisateur
function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  return selection.toString();
}

// Envoyer l'analyse vers le background
async function analyzeText(text: string): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "ANALYZE_TEXT", text },
      (response: any) => {
        if (!response) {
          reject(new Error("Réponse vide du service background."));
          return;
        }
        if (response.type === "ANALYSIS_READY") {
          resolve(response.result);
        } else {
          reject(new Error(response.error || "Erreur d'analyse."));
        }
      },
    );
  });
}

// Persistance locale de la dernière sélection (storage API)
async function persistSelection(text: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: text });
}

// Entrée : écouter un click sur le badge / popup, lancer l'analyse
async function handlePageAnalysis(): Promise<void> {
  const text = getSelectedText();
  if (!text) {
    // texte vide → afficher message d'erreur poli (section 13 du cahier)
    return;
  }
  await persistSelection(text);
  try {
    const result = await analyzeText(text);
    console.log("TextOrigin AI - analyse:", result);
    highlightText(result.detections);
  } catch (error) {
    console.error("TextOrigin AI - erreur :", error);
  }
}

// Bouton flottant créé dynamiquement
function createFloatingButton(): void {
  const button = document.createElement("button");
  button.id = "textorigin-floating-btn";
  button.textContent = "Analyze";
  button.title = "TextOrigin AI - analyser la sélection";
  Object.assign(button.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483640",
    padding: "10px 16px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  });
  button.addEventListener("click", handlePageAnalysis);
  document.body.appendChild(button);
}

createFloatingButton();
export {};