import type { JSONContent } from "@tiptap/core";

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
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (day(ts) === day(now)) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  if (day(ts) === day(now - 86_400_000)) return "hier";
  return dateFmt.format(ts);
}
