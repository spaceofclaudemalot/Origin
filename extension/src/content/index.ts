// Entrypoint du content script de l'extension Chrome.
// Implémenté dans la Tâche 5 (messagerie background ↔ content script).
console.log('TextOrigin AI content script loaded');
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

// Afficher un toast de notification
function showToast(message: string, type: "info" | "warning" | "error" = "info"): void {
  // Supprimer les toasts existants
  document.querySelectorAll('.textorigin-toast').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = `textorigin-toast fixed bottom-4 right-4 px-4 py-2 rounded-lg text-xs font-medium
    z-[9999] transition-all duration-300 transform
    ${type === "error" ? "bg-red-500 bg-opacity-90 text-white" :
      type === "warning" ? "bg-amber-500 bg-opacity-90 text-white" :
      "bg-blue-500 bg-opacity-90 text-white"}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animation d'entrée
  requestAnimationFrame(() => {
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  // Auto-suppression après 3 secondes
  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Entrée : écouter un click sur le badge / popup, lancer l'analyse
async function handlePageAnalysis(): Promise<void> {
  const text = getSelectedText();

  // Gestion du texte vide ou trop court
  if (!text) {
    showToast("Veuillez sélectionner du texte à analyser", "warning");
    return;
  }

  if (text.trim().split(/\s+/).filter(Boolean).length === 0) {
    showToast("Veuillez sélectionner du texte valide", "warning");
    return;
  }

  if (text.trim().split(/\s+/).filter(Boolean).length === 1) {
    showToast("Analyse d'un mot unique - résultat limité", "info");
  }

  await persistSelection(text);
  try {
    const result = await analyzeText(text);
    console.log("TextOrigin AI - analyse:", result);
    highlightText(result.detections);
  } catch (error) {
    console.error("TextOrigin AI - erreur :", error);
    showToast("Erreur lors de l'analyse", "error");
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

// Répondre au popup qui demande la sélection de la page
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse: any) => {
  if (message.type === "GET_PAGE_SELECTION") {
    const text = getSelectedText();
    sendResponse({text: text ?? ""});
    return false;
  }
});
export {};