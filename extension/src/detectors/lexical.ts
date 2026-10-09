import type { Detection, DetectionCategory, Detector, SignalFamily } from "../types/types";
import { LEXICAL_ENTRIES } from "./lexical-data";
import type { LexicalEntry } from "./lexical-data";
import { wordBoundary } from "../analysis/stats";

/**
 * Détection basée sur une base de termes et expressions (module 1 du cahier des charges).
 * Prend en compte le contexte :
 *  - correspondance avec séparateurs de mots (évite les faux positifs de sous-mot) ;
 *  - prise en compte de la langue du texte détectée via un paramètre optionnel ;
 *  - pondération par la confiance de l'entrée.
 */
export class LexicalDetector implements Detector {
  id = "lexical";
  name = "Lexical Detector";
  readonly family: SignalFamily = "vocabulary";

  async detect(text: string, language?: "en" | "fr"): Promise<Detection[]> {
    const matches = new Map<string, Detection>(); // clef = start-end pour dédup

    for (const entry of LEXICAL_ENTRIES) {
      if (language && entry.language !== language) {
        continue; // règles spécifiques à chaque langue (section 19)
      }
      // Frontières Unicode : « crucial » ne doit pas matcher dans « crucialité »
      const regex = wordBoundary(escapeRegex(entry.term));
      // Recherche sur le texte d'origine (drapeau i) : toLowerCase() peut changer
      // la longueur (« İ » → 2 unités) et décaler les positions renvoyées.
      const found = [...text.matchAll(regex)];
      // Score calculé une fois par terme : la fréquence est le nombre d'occurrences trouvées
      const score = this.calculateScore(entry, found.length);
      for (const m of found) {
        const key = `${m.index}-${m.index + m[0].length}`;
        if (matches.has(key)) {
          continue; // déduplication des chevauchements (Review Focus #5)
        }
        matches.set(key, {
          id: crypto.randomUUID(),
          type: "lexical",
          category: entry.category as DetectionCategory,
          text: m[0],
          start: m.index!,
          end: m.index! + m[0].length,
          score,
          confidence: entry.confidence,
          explanation: this.makeExplanation(entry, m[0]),
          suggestions: entry.replacements.map((rep) => ({
            type: "replace",
            text: rep,
            reason: `Remplacer « ${m[0]} » par « ${rep} » pour un style plus naturel.`,
          })),
        });
      }
    }

    return Array.from(matches.values()).sort((a, b) => a.start - b.start);
  }

  private calculateScore(entry: LexicalEntry, occurrences: number): number {
    // score = confiance pondérée par la fréquence du terme dans le texte
    const frequencyFactor = 1 + Math.min(0.3, (occurrences - 1) * 0.1);
    return Math.min(100, Math.round(entry.confidence * 100 * frequencyFactor));
  }

  private makeExplanation(entry: { term: string; language: string; category: DetectionCategory }, matched: string): string {
    const categoryText: Record<DetectionCategory, string> = {
      "lexical-marker": "terme fréquemment observé dans des textes générés par des LLM",
      "discourse-structure": "structure discursive stéréotypée souvent observée dans des textes générés par des LLM",
      "transition": "connecteur souvent utilisé de manière excessive dans des textes générés par des LLM",
      "style-regularity": "régularité stylistique observée dans des textes générés par des LLM",
      "anomaly": "formulation inhabituelle observée dans des textes générés par des LLM",
    };
    return `Le terme « ${matched} » est ${categoryText[entry.category]}.`;
  }
}

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
