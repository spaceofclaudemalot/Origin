export const FEEDBACK_EMAIL = "claude.malot@creativeori.com";

interface FeedbackContext {
  version?: string;
  userAgent?: string;
}

/** Version de l'extension ; absente quand l'éditeur tourne hors extension (serveur de dev). */
export function extensionContext(): FeedbackContext {
  let version: string | undefined;
  try {
    version = typeof chrome !== "undefined" ? chrome.runtime?.getManifest?.().version : undefined;
  } catch {
    // API indisponible : le mail partira sans version
  }
  return { version, userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined };
}

/**
 * Lien mailto prérempli. Le texte analysé n'est jamais joint : seules la version et le
 * navigateur le sont, pour aider à reproduire un bug.
 */
export function feedbackUrl(ctx: FeedbackContext): string {
  const body = [
    "Type : Retour ou Bug (gardez l'un des deux)",
    "",
    "Décrivez votre retour, ou ce que vous attendiez et ce qui s'est passé :",
    "",
    "",
    "Pour un bug, les étapes pour le reproduire :",
    "1.",
    "",
    "---",
    `Version : ${ctx.version ?? "inconnue"}`,
    `Navigateur : ${ctx.userAgent ?? "inconnu"}`,
    "Le texte analysé n'est pas joint à ce message ; ajoutez un extrait si c'est utile.",
  ].join("\r\n");
  const query = [
    ["subject", "[TextOrigin AI] Retour ou bug"],
    ["body", body],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `mailto:${FEEDBACK_EMAIL}?${query}`;
}
