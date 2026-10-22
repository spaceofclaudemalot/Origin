import type { JSONContent } from "@tiptap/core";
import { locale, t } from "../i18n/core";
import { DEFAULT_TITLE } from "../storage/documents";

/**
 * Titre affiché : le titre par défaut est enregistré en français (« Sans titre »), on l'affiche
 * dans la langue courante. Un titre choisi par l'utilisateur est affiché tel quel.
 */
export const displayTitle = (title: string): string =>
  !title.trim() || title === DEFAULT_TITLE ? t("editor.untitled") : title;

function collect(node: JSONContent, out: string[]): void {
  if (node.type === "text" && node.text) out.push(node.text);
  if (node.type === "hardBreak") out.push(" ");
  node.content?.forEach((c) => collect(c, out));
  if (node.type === "paragraph" || node.type === "heading") out.push(" ");
}

/** Nombre de mots d'un document enregistré (sans charger l'éditeur). */
export function wordCountOf(content: JSONContent | null | undefined): number {
  if (!content) return 0;
  const parts: string[] = [];
  collect(content, parts);
  return parts.join("").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

const day = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dateFmt = (ts: number) =>
  new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(ts);

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return t("date.now");
  if (diff < 3_600_000) return t("date.minutes", { count: Math.floor(diff / 60_000) });
  if (day(ts) === day(now)) return t("date.hours", { count: Math.floor(diff / 3_600_000) });
  if (day(ts) === day(now - 86_400_000)) return t("date.yesterday");
  return dateFmt(ts);
}
