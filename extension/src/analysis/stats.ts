import { getLang, type Lang } from "../i18n/core";

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Écart-type de population. */
export function std(xs: number[]): number {
  if (!xs.length) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** 0 à `zeroAt`, 100 à `fullAt`, linéaire entre les deux, borné ; fonctionne dans les deux sens. */
export function ramp(v: number, zeroAt: number, fullAt: number): number {
  const t = (v - zeroAt) / (fullAt - zeroAt);
  return Math.round(100 * Math.min(1, Math.max(0, t)));
}

/** Nombre affiché selon la langue : virgule décimale en français, point en anglais ; vrai signe moins. */
export function formatNum(n: number, digits = 2, lang: Lang = getLang()): string {
  const s = n.toFixed(digits).replace("-", "−");
  return lang === "fr" ? s.replace(".", ",") : s;
}

export const formatFr = (n: number, digits = 2): string => formatNum(n, digits, "fr");

/**
 * Expression « mot entier » avec frontières Unicode (lettres accentuées comprises,
 * y compris les accents combinants d'un texte décomposé NFD).
 */
export function wordBoundary(source: string, flags = "giu"): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])(?:${source})(?![\\p{L}\\p{N}\\p{M}])`, flags);
}
