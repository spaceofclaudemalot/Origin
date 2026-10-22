import { fr } from "./fr";
import { en } from "./en";

export type Lang = "fr" | "en";
export type Key = keyof typeof fr;
/** Clés au pluriel : « x.one » et « x.other » partagent la base « x ». */
export type PluralBase = Key extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

const DICT: Record<Lang, Record<Key, string>> = { fr, en };
const STORAGE_KEY = "textorigin:lang";

// Français par défaut : l'application choisit sa langue au démarrage avec initLang()
let current: Lang = "fr";
const listeners = new Set<() => void>();

export const getLang = (): Lang => current;

/** Langue d'interface : change tout de suite, prévient les composants et mémorise le choix si demandé. */
export function setLang(lang: Lang, persist = false): void {
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // stockage indisponible : le choix vaut pour cette session seulement
    }
  }
  if (lang === current) return;
  current = lang;
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

/** Choix mémorisé, sinon langue du navigateur (français si elle commence par « fr », anglais sinon). */
export function initLang(): Lang {
  let lang: Lang | undefined;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") lang = stored;
  } catch {
    // stockage indisponible : on retombe sur la langue du navigateur
  }
  lang ??= typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  setLang(lang);
  return lang;
}

export function t(key: Key, params?: Record<string, string | number>): string {
  const text = DICT[current][key] ?? fr[key];
  return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : text;
}

/** Pluriel : « base.one » pour 0 et 1, « base.other » au-delà ; {count} est ajouté aux paramètres. */
export function tn(base: PluralBase, count: number, params?: Record<string, string | number>): string {
  return t(`${base}.${count > 1 ? "other" : "one"}` as Key, { count, ...params });
}

/** Guillemets de la langue courante : « x » en français, “x” en anglais. */
export function quotes(): [string, string] {
  return current === "fr" ? ["« ", " »"] : ["“", "”"];
}

export const locale = (): string => (current === "fr" ? "fr-FR" : "en-GB");

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
