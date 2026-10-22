import { t } from "../i18n/core";

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
 * Lien mailto prérempli, dans la langue de l'interface. Le texte analysé n'est jamais joint :
 * seules la version et le navigateur le sont, pour aider à reproduire un bug.
 */
export function feedbackUrl(ctx: FeedbackContext): string {
  const body = t("feedback.body", {
    version: ctx.version ?? t("feedback.unknownVersion"),
    browser: ctx.userAgent ?? t("feedback.unknownBrowser"),
  }).replace(/\n/g, "\r\n");
  const query = [
    ["subject", t("feedback.subject")],
    ["body", body],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `mailto:${FEEDBACK_EMAIL}?${query}`;
}
