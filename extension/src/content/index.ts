import type { AnalysisResult } from "../types/types";
import { highlightText, clearHighlights } from "./highlighter";

// Load CSS for highlights and tooltips
import "./styles.css";

const ANALYZE_BUTTON_ID = "textorigin-analyze-button";
const STORAGE_KEY = "textorigin:selection";

/**
 * Capture la sélection utilisateur sur la PAGE (window.getSelection du
 * content script voit le DOM partagé, pas celui du popup).
 */
function getSelectedText(): string | null {
  // getSelection() renvoie "" pour une sélection dans un <textarea>/<input>
  const active = document.activeElement;
  if (
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLInputElement && active.type === "text")
  ) {
    const { selectionStart, selectionEnd, value } = active;
    if (selectionStart != null && selectionEnd != null && selectionEnd > selectionStart) {
      return value.slice(selectionStart, selectionEnd);
    }
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  return selection.toString();
}

/**
 * Nettoyage des marqueurs et toasts (navigation SPA).
 * Le bouton flottant est conservé.
 */
function cleanUI(): void {
  clearHighlights();
  document.querySelectorAll(".textorigin-toast").forEach((el) => el.remove());
}

/**
 * Sauvegarde la dernière sélection analysée (persistance locale).
 */
async function persistSelection(text: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: text });
  } catch (e) {
    console.error("[TextOrigin] échec persistance:", e);
  }
}

const TOAST_COLORS = {
  info: "rgba(59, 130, 246, 0.9)",
  warning: "rgba(245, 158, 11, 0.9)",
  error: "rgba(239, 68, 68, 0.9)",
} as const;

/**
 * Affiche un toast de notification dans la page.
 * Styles inline : les classes Tailwind n'existent pas sur la page hôte.
 */
function showToast(
  message: string,
  type: keyof typeof TOAST_COLORS = "info",
): void {
  document.querySelectorAll(".textorigin-toast").forEach((el) => el.remove());

  const toast = document.createElement("div");
  toast.className = "textorigin-toast";
  toast.setAttribute("role", "status");
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "72px",
    right: "24px",
    zIndex: "2147483641",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    background: TOAST_COLORS[type],
    opacity: "0",
    transform: "translateY(8px)",
    transition: "opacity 300ms, transform 300ms",
  });
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Analyse le texte via le service background, avec gestion d'erreurs.
 */
async function analyzeText(text: string): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "ANALYZE_TEXT", text },
      (response: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
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

/**
 * Lance l'analyse depuis le bouton flottant.
 */
async function handlePageAnalysis(): Promise<void> {
  const selection = window.getSelection();
  const text = getSelectedText();

  if (!selection || !text || !text.trim()) {
    showToast("Veuillez sélectionner du texte à analyser", "warning");
    return;
  }

  if (text.trim().split(/\s+/).length === 1) {
    showToast("Analyse d'un mot unique - résultat limité", "info");
  }

  // La plage doit être capturée avant que le DOM ne soit modifié
  const range = selection.getRangeAt(0).cloneRange();

  await persistSelection(text);
  try {
    const result = await analyzeText(text);
    console.log("[TextOrigin] analyse:", result);
    highlightText(text, result.detections, range);
    if (result.detections.length === 0) {
      showToast("Aucun marqueur détecté", "info");
    }
  } catch (error) {
    console.error("[TextOrigin] erreur :", error);
    showToast("Erreur lors de l'analyse", "error");
  }
}

/**
 * Crée le bouton flottant "Analyze" (accessibilité : title + focus).
 */
function createFloatingButton(): void {
  // Évite la double création
  if (document.getElementById(ANALYZE_BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = ANALYZE_BUTTON_ID;
  button.textContent = "Analyze";
  button.title = "TextOrigin AI - analyser la sélection";
  button.setAttribute("aria-label", "Analyze selected text with TextOrigin AI");
  button.setAttribute("type", "button");
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
  // Empêche le clic de faire perdre la sélection de la page
  button.addEventListener("mousedown", (e) => e.preventDefault());
  button.addEventListener("click", handlePageAnalysis);
  document.body.appendChild(button);
}

// Injection du bouton flottant au chargement
createFloatingButton();

// Répondre au popup qui demande la sélection de la page
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse: any) => {
  if (message.type === "GET_PAGE_SELECTION") {
    const text = getSelectedText();
    sendResponse({ text: text ?? "" });
    return false;
  }
});

// Navigation SPA : retirer les marqueurs devenus obsolètes
window.addEventListener("hashchange", () => cleanUI());
window.addEventListener("popstate", () => cleanUI());
