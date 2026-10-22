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
  // anglais — structure de conclusion
  { term: "in conclusion", language: "en", category: "discourse-structure", confidence: 0.72, replacements: ["To sum up", "Overall"] },

  // anglais — vocabulaire en excès (Kobak et al.)
  { term: "delve", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["explore", "look into", "examine"] },
  { term: "underscores", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["shows", "points to"] },
  { term: "intricate", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["complex", "detailed", "elaborate"] },
  { term: "pivotal", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["important", "central"] },
  { term: "crucial", language: "en", category: "lexical-marker", confidence: 0.66, replacements: ["important", "necessary"] },
  { term: "showcasing", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["showing", "presenting"] },
  { term: "comprehensive", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["complete", "thorough", "full"] },
  { term: "meticulous", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["careful", "detailed", "thorough"] },
  { term: "tapestry", language: "en", category: "lexical-marker", confidence: 0.75, replacements: ["variety", "range", "mix"] },
  { term: "certainly", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["surely", "indeed", "of course"] },
  { term: "leverage", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["use", "draw on", "take advantage of"] },
  { term: "realm", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["field", "area", "world"] },
  { term: "landscape", language: "en", category: "lexical-marker", confidence: 0.5, replacements: ["field", "scene", "situation"] },
  { term: "robust", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["strong", "reliable"] },
  { term: "seamless", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["smooth", "easy", "simple"] },
  { term: "multifaceted", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["varied", "complex", "many-sided"] },
  { term: "nuanced", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["subtle", "careful", "detailed"] },
  { term: "foster", language: "en", category: "lexical-marker", confidence: 0.62, replacements: ["encourage", "build", "support"] },
  { term: "elevate", language: "en", category: "lexical-marker", confidence: 0.62, replacements: ["raise", "improve", "lift"] },
  { term: "navigate", language: "en", category: "lexical-marker", confidence: 0.5, replacements: ["handle", "deal with", "get through"] },
  { term: "paramount", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["essential", "most important", "vital"] },
  { term: "holistic", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["overall", "complete", "whole"] },
  { term: "commendable", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["admirable", "good", "worthy"] },
  { term: "noteworthy", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["notable", "interesting", "worth noting"] },
  { term: "invaluable", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["very useful", "precious", "essential"] },

  // anglais — mots et tournures du catalogue Humanizer (§12, §15, §16, §18)
  // « additionally » et « actually » sont déjà comptés par le détecteur de connecteurs.
  { term: "underscored", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["showed", "pointed to"] },
  { term: "underscoring", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["showing", "pointing to"] },
  { term: "vibrant", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["lively", "busy"] },
  { term: "garner", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["gain", "attract", "win"] },
  { term: "interplay", language: "en", category: "lexical-marker", confidence: 0.62, replacements: ["relationship", "interaction"] },
  { term: "enduring", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["lasting", "long-standing"] },
  { term: "intricacies", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["details", "complexities"] },
  { term: "deep dive", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["close look", "detailed look"] },
  { term: "nestled", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["located", "set"] },
  { term: "breathtaking", language: "en", category: "lexical-marker", confidence: 0.62, replacements: ["impressive", "striking"] },
  { term: "groundbreaking", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["new", "original"] },
  { term: "diverse array", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["range", "variety"] },
  { term: "must-visit", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["worth visiting"] },
  { term: "boasts", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["has"] },
  { term: "serves as", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["is"] },
  { term: "stands as", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["is"] },
  { term: "fostering", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["encouraging", "building"] },

  // français — vocabulaire en excès
  { term: "crucial", language: "fr", category: "lexical-marker", confidence: 0.62, replacements: ["important", "décisif", "clé"] },
  { term: "essentiel", language: "fr", category: "lexical-marker", confidence: 0.5, replacements: ["important", "nécessaire", "central"] },
  { term: "incontournable", language: "fr", category: "lexical-marker", confidence: 0.68, replacements: ["indispensable", "obligé", "central"] },
  { term: "primordial", language: "fr", category: "lexical-marker", confidence: 0.66, replacements: ["essentiel", "capital", "premier"] },
  { term: "méticuleux", language: "fr", category: "lexical-marker", confidence: 0.62, replacements: ["soigneux", "minutieux", "attentif"] },
  { term: "minutieux", language: "fr", category: "lexical-marker", confidence: 0.55, replacements: ["soigneux", "précis", "attentif"] },
  { term: "exhaustif", language: "fr", category: "lexical-marker", confidence: 0.6, replacements: ["complet", "détaillé", "entier"] },
  { term: "approfondi", language: "fr", category: "lexical-marker", confidence: 0.55, replacements: ["détaillé", "poussé", "sérieux"] },
  { term: "pierre angulaire", language: "fr", category: "lexical-marker", confidence: 0.72, replacements: ["base", "fondement", "pilier"] },
  { term: "fondamental", language: "fr", category: "lexical-marker", confidence: 0.5, replacements: ["essentiel", "de base", "central"] },
  { term: "indéniable", language: "fr", category: "lexical-marker", confidence: 0.62, replacements: ["certain", "évident", "réel"] },
  { term: "incontestablement", language: "fr", category: "lexical-marker", confidence: 0.66, replacements: ["sans doute", "clairement", "vraiment"] },
  { term: "en somme", language: "fr", category: "discourse-structure", confidence: 0.6, replacements: ["bref", "au fond", "pour résumer"] },

  // français — tournures du catalogue Humanizer (§12, §16, §18)
  { term: "niché", language: "fr", category: "lexical-marker", confidence: 0.6, replacements: ["situé", "installé"] },
  { term: "à couper le souffle", language: "fr", category: "lexical-marker", confidence: 0.7, replacements: ["impressionnant", "saisissant"] },
  { term: "tapisserie", language: "fr", category: "lexical-marker", confidence: 0.65, replacements: ["variété", "diversité"] },
  { term: "holistique", language: "fr", category: "lexical-marker", confidence: 0.65, replacements: ["global", "complet", "d'ensemble"] },
  { term: "paysage numérique", language: "fr", category: "lexical-marker", confidence: 0.6, replacements: ["monde numérique", "secteur", "contexte"] },
  { term: "paysage en constante évolution", language: "fr", category: "lexical-marker", confidence: 0.7, replacements: ["contexte changeant", "secteur qui bouge"] },
  { term: "mettre en lumière", language: "fr", category: "lexical-marker", confidence: 0.58, replacements: ["montrer", "révéler"] },
  { term: "se positionne comme", language: "fr", category: "lexical-marker", confidence: 0.6, replacements: ["est"] },
  { term: "fait figure de", language: "fr", category: "lexical-marker", confidence: 0.5, replacements: ["est"] },
  { term: "inestimable", language: "fr", category: "lexical-marker", confidence: 0.55, replacements: ["très utile", "précieux"] },
];