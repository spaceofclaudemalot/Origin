/**
 * Base de termes et expressions fréquemment observés dans des textes générés par des LLM.
 * Configurable depuis le back-office (section 17 du cahier des charges) :
 * administrateur peut ajouter/supprimer, modifier le poids (confiance),
 * ajouter des variantes, définir la langue et la catégorie.
 */

export interface LexicalEntry {
  term: string;
  language: "en" | "fr";
  category: DetectionCategory;
  confidence: number; // 0–1, sert de poids
  replacements: string[];
}

// Re-import the type from types.ts
import type { DetectionCategory } from "../types/types";

/** Liste initiale anglaise + française — le cahier des charges exige les deux langues (section 19) */
export const LEXICAL_ENTRIES: LexicalEntry[] = [
  // anglais — connecteurs excessifs
  { term: "furthermore", language: "en", category: "transition", confidence: 0.78, replacements: ["Moreover", "Additionally", "In addition"] },
  { term: "moreover", language: "en", category: "transition", confidence: 0.78, replacements: ["Additionally", "Furthermore"] },
  { term: "additionally", language: "en", category: "transition", confidence: 0.72, replacements: ["Also", "Moreover"] },
  { term: "consequently", language: "en", category: "transition", confidence: 0.7, replacements: ["Therefore", "As a result", "So"] },
  { term: "therefore", language: "en", category: "transition", confidence: 0.68, replacements: ["So", "Thus", "Hence"] },
  { term: "however", language: "en", category: "transition", confidence: 0.55, replacements: ["But", "Yet", "Still"] },
  { term: "in conclusion", language: "en", category: "discourse-structure", confidence: 0.72, replacements: ["To sum up", "Overall"] },

  // anglais — vocabulaire caractéristique (exemples du cahier des charges)
  { term: "delve", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["explore", "look into", "examine"] },
  { term: "underscores", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["highlights", "emphasizes", "shows"] },
  { term: "intricate", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["complex", "detailed", "elaborate"] },
  { term: "pivotal", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["crucial", "key", "important"] },
  { term: "crucial", language: "en", category: "lexical-marker", confidence: 0.66, replacements: ["important", "essential", "vital"] },
  { term: "showcasing", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["showing", "demonstrating", "presenting"] },
  { term: "comprehensive", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["complete", "thorough", "full"] },
  { term: "meticulous", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["careful", "detailed", "thorough"] },
  { term: "tapestry", language: "en", category: "lexical-marker", confidence: 0.75, replacements: ["variety", "range", "mix"] },
  { term: "certainly", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["Surely", "Indeed", "Of course"] },
  { term: "leverage", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["use", "utilize", "take advantage of"] },

  // français — connecteurs et structures discursives
  { term: "en outre", language: "fr", category: "transition", confidence: 0.72, replacements: ["De plus", "Par ailleurs", "Également"] },
  { term: "par ailleurs", language: "fr", category: "transition", confidence: 0.72, replacements: ["De plus", "En outre", "Également"] },
  { term: "notamment", language: "fr", category: "transition", confidence: 0.62, replacements: ["Surtout", "Particulièrement", "Entre autres"] },
  { term: "de plus", language: "fr", category: "transition", confidence: 0.6, replacements: ["Également", "En outre", "Aussi"] },
  { term: "en conclusion", language: "fr", category: "discourse-structure", confidence: 0.7, replacements: ["Pour conclure", "En résumé", "En définitive"] },
  { term: "en définitive", language: "fr", category: "discourse-structure", confidence: 0.65, replacements: ["Finalement", "Au final", "Pour terminer"] },
  { term: "il convient de noter", language: "fr", category: "discourse-structure", confidence: 0.75, replacements: ["À noter", "Signalons que", "On peut observer que"] },
  { term: "il est important de souligner", language: "fr", category: "discourse-structure", confidence: 0.75, replacements: ["Il faut noter", "Retenons que", "Observons que"] },
  { term: "cette approche permet de", language: "fr", category: "discourse-structure", confidence: 0.68, replacements: ["Cette méthode améliore", "Cela permet de", "On peut ainsi"] },
  { term: "ce n'est pas simplement X, c'est Y", language: "fr", category: "discourse-structure", confidence: 0.7, replacements: [] },
];