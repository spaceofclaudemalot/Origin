# Signes de l'IA en temps réel — Plan d'implémentation

> **Pour les agents d'exécution :** SOUS-SKILL REQUIS : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** étendre l'analyse en direct à tous les signes d'IA calculables localement : vocabulaire, connecteurs, formulations stéréotypées, rythme et paragraphes. Le score devient pondéré par famille et s'affiche avec ses signaux globaux et leur surlignage.

**Architecture :**
- `segment()` découpe le texte une fois pour toutes en mots, phrases et paragraphes.
- Chaque détecteur implémente `Detector`, et les détecteurs globaux implémentent aussi `GlobalDetector`.
- `DetectorService.detectAll` réunit les marqueurs ponctuels et les signaux, puis délègue le score à `computeScore` (`analysis/scoring.ts`).
- Dans l'éditeur, une nouvelle couche de décorations `SignalHighlights` surligne les phrases d'un signal. Le panneau affiche les familles, les signaux et l'avertissement.

**Stack technique :** TypeScript 5, React 19, TipTap 3 / ProseMirror, Vitest. Aucune nouvelle dépendance.

**Spec :** `docs/superpowers/specs/2026-10-08-signaux-ia-design.md`

**Branche :** `feat/signaux-ia` (issue de `feat/editor-integre`). Les commandes s'exécutent dans `extension/`. Les commits se terminent par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Écarts assumés par rapport à la spec :**
- `en conclusion` et `en définitive` quittent aussi le vocabulaire, puisqu'ils figurent dans la liste des connecteurs. On évite ainsi un double comptage.
- `Detection` gagne un champ facultatif `weight`, qui sert à pondérer les énumérations par trois à 0,5 dans la densité des stéréotypes.
- `Detector` gagne un champ facultatif `family` : une famille n'est mesurable que si un détecteur de cette famille est enregistré.
- Le panneau réinitialise son état (marqueurs visibles, signal surligné) quand on change de document. Cela corrige au passage le mineur M4 de la PR #1.

## Contraintes globales

- 100 % local, aucun appel réseau, CSP MV3 inchangée, Chrome 88 minimum (lookbehind et `\p{L}` disponibles).
- `detectAll` sur 20 000 caractères en moins de 50 ms (médiane de 5 exécutions).
- Poids : vocabulaire 0,30 ; connecteurs 0,20 ; stéréotypes 0,25 ; régularité 0,25.
- Seuils exacts : ceux de `thresholds.ts` (Tâche 1), recopiés de la spec.
- Les décorations (marqueurs et signaux) ne figurent jamais dans le JSON, dans l'historique ni dans les exports.
- Interface en français ; avertissement exact : « Indices stylistiques, pas une preuve. Les textes académiques formels et ceux d'auteurs non natifs produisent des faux positifs. »

## Points de vigilance

1. **Abréviations au milieu d'une phrase** (« M. Dupont », « e.g. Paris », « J. R. Tolkien ») : ne doivent pas couper la phrase, sinon le rythme est faussé. Test : Tâche 1.
2. **Mot marqueur inclus dans un mot accentué** (« crucial » dans « crucialité ») : ne doit pas déclencher. Test : Tâche 2.
3. **Faux ami du parallélisme négatif** (« It's not just because… ») : ne doit pas déclencher. Test : Tâche 4.
4. **Titres et éléments de liste courts** : ne doivent pas rendre des paragraphes « hétérogènes ». Test : Tâche 5.
5. **Texte modifié pendant qu'un signal est surligné** : le surlignage suit le texte ou disparaît, sans jamais rester sur des positions périmées. Test : Tâche 7 (remappage), puis vérification dans le navigateur à la Tâche 8.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/types/types.ts` | + `SignalFamily`, `SignalStatus`, `GlobalSignal`, `FamilyScore`, `GlobalDetector` ; `Detection.weight?`, `Detector.family?` ; `AnalysisResult` + `families`, `signals`, `wordCount` (Tâche 6) |
| `src/analysis/thresholds.ts` | Constantes de seuil et poids |
| `src/analysis/stats.ts` | `mean`, `std`, `ramp`, `formatFr`, `wordBoundary` |
| `src/analysis/segment.ts` | Mots, phrases, paragraphes |
| `src/detectors/lexical.ts`, `lexical-data.ts` | Frontière Unicode, liste mise à jour |
| `src/detectors/connectors.ts` | `ConnectorDetector` |
| `src/detectors/stereotypes.ts` | `StereotypeDetector` |
| `src/detectors/rhythm.ts` | `RhythmDetector` |
| `src/detectors/paragraphs.ts` | `ParagraphDetector` |
| `src/analysis/scoring.ts` | `computeScore`, `FAMILY_OF_TYPE`, `FAMILY_LABEL` |
| `src/services/detector.ts` | Orchestration et nouveau score |
| `src/analysis/service.ts` | Enregistre les 5 détecteurs |
| `src/analysis/positions.ts` | + `mapRange`, `mapRanges` |
| `src/editor/extensions/SignalHighlights.ts` | Décorations des signaux |
| `src/editor/AnalysisPanel.tsx` | Familles, signaux, marqueurs groupés, avertissement |

---

### Tâche 1 : types, constantes, statistiques et découpage

**Fichiers :**
- Modifier : `src/types/types.ts` (fin de fichier)
- Créer : `src/analysis/thresholds.ts`, `src/analysis/stats.ts`, `src/analysis/segment.ts`
- Test : `src/analysis/stats.test.ts`, `src/analysis/segment.test.ts`

**Interfaces :**
- Produit :
  - types `SignalFamily`, `SignalStatus`, `GlobalSignal`, `FamilyScore`, `GlobalDetector`, `Span`, `Sentence`, `Paragraph`, `Segmented` ;
  - fonctions `segment(text: string): Segmented`, `mean(xs: number[]): number`, `std(xs: number[]): number` (population), `ramp(v: number, zeroAt: number, fullAt: number): number` (0–100, entier, borné), `formatFr(n: number, digits?: number): string`, `wordBoundary(source: string, flags?: string): RegExp` ;
  - toutes les constantes de `thresholds.ts`.

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/analysis/stats.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { mean, std, ramp, formatFr, wordBoundary } from "./stats";

describe("stats", () => {
  it("mean and population std", () => {
    expect(mean([])).toBe(0);
    expect(mean([2, 4])).toBe(3);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(std([])).toBe(0);
  });

  it("ramp maps linearly to 0-100 in both directions and clamps", () => {
    expect(ramp(1, 1, 4)).toBe(0);
    expect(ramp(2.5, 1, 4)).toBe(50);
    expect(ramp(9, 1, 4)).toBe(100);
    expect(ramp(-0.25, -0.25, -0.55)).toBe(0);
    expect(ramp(-0.4, -0.25, -0.55)).toBe(50);
    expect(ramp(-1, -0.25, -0.55)).toBe(100);
  });

  it("formatFr uses a decimal comma and a true minus sign", () => {
    expect(formatFr(-0.523)).toBe("−0,52");
    expect(formatFr(1.8, 1)).toBe("1,8");
  });

  it("wordBoundary matches whole words with Unicode letters", () => {
    const re = wordBoundary("crucial", "giu");
    expect("La crucialité".match(re)).toBeNull();
    expect("Un point crucial.".match(re)?.[0]).toBe("crucial");
    expect("Néanmoins, oui".match(wordBoundary("néanmoins", "giu"))?.[0]).toBe("Néanmoins");
  });
});
```

`src/analysis/segment.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { segment } from "./segment";

const texts = (t: string) => segment(t).sentences.map((s) => s.text);

describe("segment", () => {
  it("splits sentences and keeps exact positions", () => {
    const t = "Bonjour. Ça va ? Oui !";
    const { sentences } = segment(t);
    expect(sentences.map((s) => s.text)).toEqual(["Bonjour.", "Ça va ?", "Oui !"]);
    for (const s of sentences) expect(t.slice(s.start, s.end)).toBe(s.text);
  });

  it("does not split on abbreviations or initials", () => {
    expect(texts("Il a vu M. Dupont, p. ex. hier. Then e.g. Paris and J. R. Tolkien arrived. Fin.")).toEqual([
      "Il a vu M. Dupont, p. ex. hier.",
      "Then e.g. Paris and J. R. Tolkien arrived.",
      "Fin.",
    ]);
  });

  it("does not split decimals", () => {
    expect(texts("Il mesure 3.5 mètres. Voilà.")).toEqual(["Il mesure 3.5 mètres.", "Voilà."]);
  });

  it("handles ellipsis and French quotes", () => {
    expect(texts("Il hésita… « Non ! » dit-elle. Puis rien.")).toEqual([
      "Il hésita…",
      "« Non ! » dit-elle.",
      "Puis rien.",
    ]);
  });

  it("ends a sentence at each block and builds paragraphs", () => {
    const { sentences, paragraphs } = segment("Titre\nPremière phrase. Deuxième ici.");
    expect(sentences.map((s) => s.text)).toEqual(["Titre", "Première phrase.", "Deuxième ici."]);
    expect(paragraphs.map((p) => ({ text: p.text, wordCount: p.wordCount, sentences: p.sentences }))).toEqual([
      { text: "Titre", wordCount: 1, sentences: [0] },
      { text: "Première phrase. Deuxième ici.", wordCount: 4, sentences: [1, 2] },
    ]);
  });

  it("counts words with apostrophes and digits", () => {
    expect(segment("Aujourd'hui l’été, 2026 !").words.map((w) => w.text)).toEqual(["Aujourd'hui", "l’été", "2026"]);
  });

  it("skips empty blocks and handles empty text", () => {
    expect(segment("")).toEqual({ words: [], sentences: [], paragraphs: [] });
    expect(segment("A.\n\n  \nB.").paragraphs.map((p) => p.text)).toEqual(["A.", "B."]);
  });

  it("gives each sentence its word count", () => {
    expect(segment("Un deux trois. Quatre.").sentences.map((s) => s.wordCount)).toEqual([3, 1]);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/analysis/stats.test.ts src/analysis/segment.test.ts`
Résultat attendu : ÉCHEC, modules `./stats` et `./segment` introuvables.

- [ ] **Étape 3 : ajouter les types à la fin de `src/types/types.ts`**

```ts
/** Familles de signaux composant le score global (spec signaux §5). */
export type SignalFamily = "vocabulary" | "connectors" | "stereotypes" | "regularity";
export type SignalStatus = "ok" | "alert" | "insufficient";

/** Signal portant sur tout le document (rythme, paragraphes, densité de connecteurs). */
export interface GlobalSignal {
  id: "connector-density" | "rhythm" | "paragraph-uniformity" | "topic-sentences";
  family: SignalFamily;
  label: string;
  value: number;
  display: string;
  score: number;
  status: SignalStatus;
  explanation: string;
  ranges: Array<{ start: number; end: number }>;
}

export interface FamilyScore {
  family: SignalFamily;
  score: number;
  weight: number;
  measurable: boolean;
}

/** Détecteur qui produit aussi des signaux globaux à partir du texte découpé. */
export interface GlobalDetector {
  signals(text: string, segmented: import("../analysis/segment").Segmented): GlobalSignal[];
}
```

Dans la même étape :
- dans l'interface `Detection`, ajouter après `suggestions: Suggestion[];` :

```ts
  /** Poids dans la densité de sa famille (1 par défaut). */
  weight?: number;
```

- dans l'interface `Detector`, ajouter après `readonly name: string;` :

```ts
  /** Famille alimentée par ce détecteur ("vocabulary" par défaut). */
  readonly family?: SignalFamily;
```

- [ ] **Étape 4 : créer `src/analysis/thresholds.ts`**

```ts
import type { SignalFamily } from "../types/types";

// Seuils de la spec « signaux » (docs/superpowers/specs/2026-10-08-signaux-ia-design.md)
export const MIN_WORDS_DENSITY = 30;
export const MIN_WORDS_CONFIDENT = 80;
export const ALERT_SCORE = 50;

export const VOCAB_MAX_DENSITY = 3;

export const CONNECTOR_BASELINE = 0.6;
export const CONNECTOR_ALERT_RATIO = 1.8;
export const CONNECTOR_MAX_RATIO = 4;

export const STEREOTYPE_MAX_DENSITY = 1.5;
export const TRIAD_MIN_COUNT = 2;
export const TRIAD_WEIGHT = 0.5;

export const RHYTHM_HUMAN = -0.25;
export const RHYTHM_AI = -0.55;
export const RHYTHM_MIN_SENTENCES = 5;
export const RHYTHM_BAND = 0.15;

export const PARAGRAPH_MIN_WORDS = 8;
export const PARAGRAPH_MIN_COUNT = 3;
export const PARAGRAPH_CV_AI = 0.15;
export const PARAGRAPH_CV_HUMAN = 0.45;
export const PARAGRAPH_CV_ALERT = 0.25;

export const TOPIC_HUMAN = 0.73;
export const TOPIC_AI = 0.94;
export const TOPIC_ALERT = 0.9;

export const FAMILY_WEIGHTS: Record<SignalFamily, number> = {
  vocabulary: 0.3,
  connectors: 0.2,
  stereotypes: 0.25,
  regularity: 0.25,
};
```

- [ ] **Étape 5 : créer `src/analysis/stats.ts`**

```ts
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

export function formatFr(n: number, digits = 2): string {
  return n.toFixed(digits).replace(".", ",").replace("-", "−");
}

/** Expression « mot entier » avec frontières Unicode (lettres accentuées comprises). */
export function wordBoundary(source: string, flags = "giu"): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, flags);
}
```

- [ ] **Étape 6 : créer `src/analysis/segment.ts`**

```ts
export interface Span {
  start: number;
  end: number;
  text: string;
}
export interface Sentence extends Span {
  wordCount: number;
}
export interface Paragraph extends Span {
  wordCount: number;
  /** Indices dans `sentences`. */
  sentences: number[];
}
export interface Segmented {
  words: Span[];
  sentences: Sentence[];
  paragraphs: Paragraph[];
}

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const TERMINATORS = ".!?…";
const CLOSERS = "\"'’”»)]";
const OPENERS = "«\"“'(";
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "m", "mme", "mlle", "dr", "mr", "mrs", "ms", "st", "cf", "ex", "p", "env", "no",
]);

function isSpace(c: string | undefined): boolean {
  return c !== undefined && /\s/.test(c);
}

/**
 * Une fin de phrase se reconnaît à un terminateur suivi d'un espace puis
 * d'une majuscule ou d'un guillemet ouvrant, sauf après une abréviation
 * ou une initiale (« M. Dupont », « J. R. Tolkien »).
 */
function isBoundary(text: string, blockStart: number, dot: number, after: number, blockEnd: number): boolean {
  if (!isSpace(text[after])) return false;
  let k = after;
  while (k < blockEnd && isSpace(text[k])) k++;
  if (k >= blockEnd) return true;
  const next = text[k];
  if (!/\p{Lu}/u.test(next) && !OPENERS.includes(next)) return false;
  if (text[dot] === ".") {
    const token = /([\p{L}.]+)$/u.exec(text.slice(blockStart, dot))?.[1];
    if (token) {
      if (ABBREVIATIONS.has(token.toLowerCase())) return false;
      if (token.length === 1 && /\p{Lu}/u.test(token)) return false;
    }
  }
  return true;
}

export function segment(text: string): Segmented {
  const words: Span[] = [...text.matchAll(WORD)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
    text: m[0],
  }));
  const sentences: Sentence[] = [];
  const paragraphs: Paragraph[] = [];

  const countWords = (start: number, end: number) =>
    words.reduce((n, w) => (w.start >= start && w.end <= end ? n + 1 : n), 0);

  const pushSentence = (start: number, end: number) => {
    while (start < end && isSpace(text[start])) start++;
    while (end > start && isSpace(text[end - 1])) end--;
    if (end > start) sentences.push({ start, end, text: text.slice(start, end), wordCount: countWords(start, end) });
  };

  let blockStart = 0;
  for (const block of text.split("\n")) {
    const blockEnd = blockStart + block.length;
    const firstSentence = sentences.length;
    let sentenceStart = blockStart;
    for (let i = blockStart; i < blockEnd; i++) {
      if (!TERMINATORS.includes(text[i])) continue;
      let j = i + 1;
      while (j < blockEnd && (TERMINATORS + CLOSERS).includes(text[j])) j++;
      if (j < blockEnd && !isBoundary(text, blockStart, i, j, blockEnd)) {
        i = j - 1;
        continue;
      }
      pushSentence(sentenceStart, j);
      sentenceStart = j;
      i = j - 1;
    }
    pushSentence(sentenceStart, blockEnd);

    let start = blockStart;
    let end = blockEnd;
    while (start < end && isSpace(text[start])) start++;
    while (end > start && isSpace(text[end - 1])) end--;
    if (end > start) {
      paragraphs.push({
        start,
        end,
        text: text.slice(start, end),
        wordCount: countWords(start, end),
        sentences: Array.from({ length: sentences.length - firstSentence }, (_, k) => firstSentence + k),
      });
    }
    blockStart = blockEnd + 1;
  }

  return { words, sentences, paragraphs };
}
```

- [ ] **Étape 7 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run src/analysis/stats.test.ts src/analysis/segment.test.ts && npx tsc --noEmit`
Résultat attendu : 12 tests PASS, aucune erreur de type.

- [ ] **Étape 8 : commiter**

```bash
git add src/types/types.ts src/analysis/thresholds.ts src/analysis/stats.ts src/analysis/stats.test.ts src/analysis/segment.ts src/analysis/segment.test.ts
git commit -m "feat(analysis): découpage mots/phrases/paragraphes, seuils et statistiques"
```

---

### Tâche 2 : détecteur de vocabulaire (frontière Unicode, liste mise à jour)

**Fichiers :**
- Modifier : `src/detectors/lexical.ts`
- Modifier : `src/detectors/lexical-data.ts`
- Modifier : `src/detectors/lexical.test.ts`

**Interfaces :**
- Consomme : `wordBoundary` (Tâche 1).
- Produit : `LexicalDetector` avec `family = "vocabulary"`. Il n'émet plus que des détections `type: "lexical"`.

- [ ] **Étape 1 : adapter les tests existants et ajouter les tests qui échouent**

Dans `src/detectors/lexical.test.ts` :

(a) Remplacer le texte du test « detects known lexical markers in English text » :

```ts
    const result = await detector.detect("We delve into this comprehensive approach.");
```

(b) Remplacer le corps du test « applies language filter correctly » :

```ts
    const enOnly = await detector.detect("un enjeu primordial", "en");
    const frOrAny = await detector.detect("un enjeu primordial");
    expect(enOnly.length).toBe(0);
    expect(frOrAny.length).toBe(1);
```

(c) Remplacer le test « detects French discourse structure markers » par :

```ts
  it("detects French vocabulary markers", async () => {
    const result = await detector.detect("Un enjeu primordial et incontournable.");
    expect(result.map((d) => d.text)).toEqual(["primordial", "incontournable"]);
  });
```

(d) Remplacer le test « detects transition connectors with correct type » par :

```ts
  it("no longer reports connectors or stock phrases (moved to their own detectors)", async () => {
    expect(await detector.detect("Furthermore, moreover, additionally.")).toEqual([]);
    expect(await detector.detect("En outre, il convient de noter que cette approche permet de réussir.")).toEqual([]);
  });

  it("does not match a marker inside an accented word", async () => {
    expect(await detector.detect("La crucialité du sujet.")).toEqual([]);
  });

  it("detects added English and French terms", async () => {
    const en = await detector.detect("A robust, seamless and holistic plan.");
    expect(en.map((d) => d.text)).toEqual(["robust", "seamless", "holistic"]);
    const fr = await detector.detect("C'est la pierre angulaire, incontestablement.");
    expect(fr.map((d) => d.text)).toEqual(["pierre angulaire", "incontestablement"]);
  });

  it("belongs to the vocabulary family", () => {
    expect(detector.family).toBe("vocabulary");
  });
```

(e) Dans le test « keeps offsets on the original text when lowercasing changes its length (İ) », remplacer la ligne `const text = …` par :

```ts
    const text = "İstanbul. We delve into this comprehensive topic.";
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/detectors/lexical.test.ts`
Résultat attendu : ÉCHEC sur « no longer reports connectors », « does not match a marker inside an accented word », « detects added English and French terms », « belongs to the vocabulary family » et « detects French vocabulary markers ».

- [ ] **Étape 3 : mettre à jour `src/detectors/lexical-data.ts`**

Remplacer tout le tableau `LEXICAL_ENTRIES` (de `export const LEXICAL_ENTRIES: LexicalEntry[] = [` jusqu'au `];` final) par :

```ts
export const LEXICAL_ENTRIES: LexicalEntry[] = [
  // anglais — structure de conclusion
  { term: "in conclusion", language: "en", category: "discourse-structure", confidence: 0.72, replacements: ["To sum up", "Overall"] },

  // anglais — vocabulaire en excès (Kobak et al.)
  { term: "delve", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["explore", "look into", "examine"] },
  { term: "underscores", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["highlights", "emphasizes", "shows"] },
  { term: "intricate", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["complex", "detailed", "elaborate"] },
  { term: "pivotal", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["key", "important", "central"] },
  { term: "crucial", language: "en", category: "lexical-marker", confidence: 0.66, replacements: ["important", "essential", "vital"] },
  { term: "showcasing", language: "en", category: "lexical-marker", confidence: 0.68, replacements: ["showing", "demonstrating", "presenting"] },
  { term: "comprehensive", language: "en", category: "lexical-marker", confidence: 0.7, replacements: ["complete", "thorough", "full"] },
  { term: "meticulous", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["careful", "detailed", "thorough"] },
  { term: "tapestry", language: "en", category: "lexical-marker", confidence: 0.75, replacements: ["variety", "range", "mix"] },
  { term: "certainly", language: "en", category: "lexical-marker", confidence: 0.55, replacements: ["surely", "indeed", "of course"] },
  { term: "leverage", language: "en", category: "lexical-marker", confidence: 0.72, replacements: ["use", "draw on", "take advantage of"] },
  { term: "realm", language: "en", category: "lexical-marker", confidence: 0.65, replacements: ["field", "area", "world"] },
  { term: "landscape", language: "en", category: "lexical-marker", confidence: 0.5, replacements: ["field", "scene", "situation"] },
  { term: "robust", language: "en", category: "lexical-marker", confidence: 0.6, replacements: ["strong", "solid", "reliable"] },
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
];
```

Remarque : `crucial` apparaît en anglais et en français. Le filtre de langue reste valable ; sans filtre, la déduplication par position `start-end` garde une seule détection.

- [ ] **Étape 4 : mettre à jour `src/detectors/lexical.ts`**

(a) Remplacer les imports par :

```ts
import type { Detection, DetectionCategory, Detector, SignalFamily } from "../types/types";
import { LEXICAL_ENTRIES } from "./lexical-data";
import type { LexicalEntry } from "./lexical-data";
import { wordBoundary } from "../analysis/stats";
```

(b) Après `name = "Lexical Detector";`, ajouter :

```ts
  readonly family: SignalFamily = "vocabulary";
```

(c) Remplacer les lignes de construction de l'expression :

```ts
      const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use word boundaries to match terms as whole words (avoid substring matches)
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
```

par :

```ts
      // Frontières Unicode : « crucial » ne doit pas matcher dans « crucialité »
      const regex = wordBoundary(escapeRegex(entry.term));
```

(d) Remplacer `type: entry.category === "transition" ? "connector" : "lexical",` par `type: "lexical",`.

(e) Remplacer toute la méthode `calculateScore` par :

```ts
  private calculateScore(entry: LexicalEntry, text: string): number {
    // score = confiance pondérée par la fréquence du terme dans le texte
    const occurrences = (text.match(wordBoundary(escapeRegex(entry.term))) || []).length;
    const frequencyFactor = 1 + Math.min(0.3, (occurrences - 1) * 0.1);
    return Math.min(100, Math.round(entry.confidence * 100 * frequencyFactor));
  }
```

(f) Remplacer `return Array.from(matches.values());` par (résultats dans l'ordre du texte) :

```ts
    return Array.from(matches.values()).sort((a, b) => a.start - b.start);
```

(g) Ajouter à la fin du fichier :

```ts
function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Étape 5 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run src/detectors/lexical.test.ts && npx tsc --noEmit`
Résultat attendu : tous les tests du fichier PASS, aucune erreur de type.

Commande : `npx vitest run`
Résultat attendu : la suite complète PASS.

- [ ] **Étape 6 : commiter**

```bash
git add src/detectors
git commit -m "feat(detection): vocabulaire avec frontières Unicode et liste FR/EN enrichie"
```

---

### Tâche 3 : détecteur de connecteurs

**Fichiers :**
- Créer : `src/detectors/connectors.ts`
- Test : `src/detectors/connectors.test.ts`

**Interfaces :**
- Consomme : `segment`, `Segmented` (Tâche 1) ; `wordBoundary`, `ramp`, `formatFr` (Tâche 1) ; constantes `CONNECTOR_*`, `MIN_WORDS_DENSITY`.
- Produit : `ConnectorDetector implements Detector, GlobalDetector`, avec `id = "connectors"` et `family = "connectors"`. Il émet des détections `type: "connector"`, `category: "transition"`, et le signal `connector-density`.

- [ ] **Étape 1 : écrire le test qui échoue**

`src/detectors/connectors.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { ConnectorDetector } from "./connectors";
import { segment } from "../analysis/segment";

const filler = (n: number) => Array(n).fill("mot").join(" ");
const detector = new ConnectorDetector();
const signal = (text: string) => detector.signals(text, segment(text))[0];

describe("ConnectorDetector", () => {
  it("detects EN and FR connectors with their original case", async () => {
    const result = await detector.detect("Furthermore, it works. Néanmoins, par conséquent, rien. In addition, yes.");
    expect(result.map((d) => d.text)).toEqual(["Furthermore", "Néanmoins", "par conséquent", "In addition"]);
    expect(result.every((d) => d.type === "connector" && d.category === "transition")).toBe(true);
    expect(result[0].suggestions.length).toBeGreaterThan(0);
  });

  it("does not match inside words", async () => {
    expect(await detector.detect("Thusly the ainsite thereforex.")).toEqual([]);
  });

  it("stays ok just below 1.8x the human baseline", () => {
    const s = signal(`However ${filler(99)}.`); // 1 / 100 mots → ×1,67
    expect(s.status).toBe("ok");
    expect(s.value).toBeCloseTo(1.667, 2);
    expect(s.score).toBe(22);
  });

  it("alerts above 1.8x the baseline and highlights the sentences", () => {
    const text = `However ${filler(48)}. Moreover ${filler(50)}.`; // 2 / 100 mots → ×3,33
    const s = signal(text);
    expect(s.status).toBe("alert");
    expect(s.score).toBe(78);
    expect(s.display).toBe("×3,3 la norme humaine (seuil ×1,8)");
    expect(s.ranges.map((r) => text.slice(r.start, r.end).split(" ")[0])).toEqual(["However", "Moreover"]);
  });

  it("is insufficient under 30 words", () => {
    expect(signal("However, short.").status).toBe("insufficient");
  });

  it("gives each detection the family score", async () => {
    const text = `However ${filler(48)}. Moreover ${filler(50)}.`;
    const result = await detector.detect(text);
    expect(result.every((d) => d.score === 78)).toBe(true);
  });

  it("belongs to the connectors family", () => {
    expect(detector.family).toBe("connectors");
  });
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/detectors/connectors.test.ts`
Résultat attendu : ÉCHEC, module `./connectors` introuvable.

- [ ] **Étape 3 : créer `src/detectors/connectors.ts`**

```ts
import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import { segment, type Segmented } from "../analysis/segment";
import { formatFr, ramp, wordBoundary } from "../analysis/stats";
import { CONNECTOR_ALERT_RATIO, CONNECTOR_BASELINE, CONNECTOR_MAX_RATIO, MIN_WORDS_DENSITY } from "../analysis/thresholds";

/** Connecteurs de transition surreprésentés (1,8 à 4× la fréquence humaine). */
const CONNECTORS: Record<string, string[]> = {
  // anglais
  furthermore: ["also", "besides"],
  moreover: ["also", "what's more"],
  additionally: ["also", "too"],
  "in addition": ["also", "too"],
  consequently: ["so", "as a result"],
  therefore: ["so"],
  however: ["but", "still"],
  nevertheless: ["still", "yet"],
  thus: ["so"],
  hence: ["so"],
  notably: ["especially"],
  ultimately: ["in the end"],
  overall: ["all in all"],
  // français
  "en outre": ["aussi", "et puis"],
  "par ailleurs": ["aussi", "d'autre part"],
  "de plus": ["aussi", "et"],
  notamment: ["surtout"],
  ainsi: ["donc"],
  toutefois: ["mais", "pourtant"],
  néanmoins: ["pourtant", "mais"],
  "en effet": ["car"],
  "par conséquent": ["donc"],
  "dès lors": ["donc"],
  "en définitive": ["au final"],
  "en conclusion": ["pour finir"],
  enfin: ["et"],
};

// Les expressions longues d'abord, pour que « in addition » passe avant un éventuel mot isolé
const PATTERN = wordBoundary(
  Object.keys(CONNECTORS)
    .sort((a, b) => b.length - a.length)
    .map((c) => c.replace(/ /g, "\\s+"))
    .join("|"),
);

function findConnectors(text: string): Array<{ start: number; end: number; text: string }> {
  return [...text.matchAll(PATTERN)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, text: m[0] }));
}

function measure(text: string, seg: Segmented) {
  const found = findConnectors(text);
  const words = seg.words.length;
  const ratio = words ? (found.length / words) * 100 / CONNECTOR_BASELINE : 0;
  return { found, words, ratio, score: ramp(ratio, 1, CONNECTOR_MAX_RATIO) };
}

export class ConnectorDetector implements Detector, GlobalDetector {
  readonly id = "connectors";
  readonly name = "Connector Detector";
  readonly family: SignalFamily = "connectors";

  async detect(text: string): Promise<Detection[]> {
    const { found, score } = measure(text, segment(text));
    return found.map((c): Detection => ({
      id: crypto.randomUUID(),
      type: "connector",
      category: "transition",
      text: c.text,
      start: c.start,
      end: c.end,
      score,
      confidence: 0.7,
      explanation: `« ${c.text} » est un connecteur de transition surutilisé par les LLM (1,8 à 4 fois plus que dans un texte humain).`,
      suggestions: (CONNECTORS[c.text.toLowerCase().replace(/\s+/g, " ")] ?? []).map((rep) => ({
        type: "replace",
        text: rep,
        reason: `Remplacer « ${c.text} » par « ${rep} », ou reformuler sans connecteur.`,
      })),
    }));
  }

  signals(text: string, seg: Segmented): GlobalSignal[] {
    const { found, words, ratio, score } = measure(text, seg);
    const insufficient = words < MIN_WORDS_DENSITY;
    const ranges = seg.sentences
      .filter((s) => found.some((c) => c.start >= s.start && c.end <= s.end))
      .map(({ start, end }) => ({ start, end }));
    return [
      {
        id: "connector-density",
        family: "connectors",
        label: "Densité de connecteurs",
        value: ratio,
        display: `×${formatFr(ratio, 1)} la norme humaine (seuil ×${formatFr(CONNECTOR_ALERT_RATIO, 1)})`,
        score: insufficient ? 0 : score,
        status: insufficient ? "insufficient" : ratio >= CONNECTOR_ALERT_RATIO ? "alert" : "ok",
        explanation: "Les LLM enchaînent les connecteurs (furthermore, en outre…) bien plus souvent qu'un auteur humain.",
        ranges,
      },
    ];
  }
}
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/detectors/connectors.test.ts && npx tsc --noEmit`
Résultat attendu : 7 tests PASS, aucune erreur de type.

- [ ] **Étape 5 : commiter**

```bash
git add src/detectors/connectors.ts src/detectors/connectors.test.ts
git commit -m "feat(detection): densité de connecteurs rapportée à la norme humaine"
```

---

### Tâche 4 : détecteur de formulations stéréotypées

**Fichiers :**
- Créer : `src/detectors/stereotypes.ts`
- Test : `src/detectors/stereotypes.test.ts`

**Interfaces :**
- Consomme : constantes `TRIAD_MIN_COUNT`, `TRIAD_WEIGHT`.
- Produit : `StereotypeDetector implements Detector`, avec `id = "stereotypes"` et `family = "stereotypes"`. Il émet des détections `type: "structural"`, `category: "discourse-structure"` ; les énumérations par trois portent `weight: 0.5`.

- [ ] **Étape 1 : écrire le test qui échoue**

`src/detectors/stereotypes.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { StereotypeDetector } from "./stereotypes";

const detector = new StereotypeDetector();
const found = async (text: string) => (await detector.detect(text)).map((d) => d.text);

describe("StereotypeDetector", () => {
  it("detects English negative parallelisms", async () => {
    expect(await found("It's not just a tool, it's a revolution.")).toEqual(["It's not just a tool, it's"]);
    expect(await found("This is not merely a trend — but a shift.")).toEqual(["This is not merely a trend — but"]);
  });

  it("detects French negative parallelisms, straight and curly apostrophes", async () => {
    expect(await found("Ce n'est pas seulement un outil, c'est une révolution.")).toEqual(["Ce n'est pas seulement un outil, c'est"]);
    expect(await found("Ce n’est pas qu’une mode, c’est un mouvement.")).toEqual(["Ce n’est pas qu’une mode, c’est"]);
  });

  it("ignores false friends", async () => {
    expect(await found("It's not just because of the rain, it's the wind.")).toEqual([]);
    expect(await found("Not only that.")).toEqual([]);
    expect(await found("Ce n'est pas seulement pour cela que je pars.")).toEqual([]);
  });

  it("detects inflated conclusions in English and French", async () => {
    expect(await found("This serves as a testament to our values and plays a crucial role.")).toEqual([
      "serves as a testament to",
      "plays a crucial role",
    ]);
    expect(await found("Cela témoigne de notre engagement et joue un rôle clé. Il convient de noter ceci.")).toEqual([
      "témoigne de",
      "joue un rôle clé",
      "Il convient de noter",
    ]);
  });

  it("reports triads only when they repeat, with half weight", async () => {
    expect(await found("We need trust, transparency, and accountability.")).toEqual([]);
    const result = await detector.detect(
      "We need trust, transparency, and accountability. Il faut écoute, rigueur et patience.",
    );
    expect(result).toHaveLength(2);
    expect(result.every((d) => d.weight === 0.5 && d.confidence === 0.4)).toBe(true);
  });

  it("returns nothing on plain text", async () => {
    expect(await found("The cat sat on the mat. Le chat dort.")).toEqual([]);
  });

  it("marks detections as structural in the stereotypes family", async () => {
    const [d] = await detector.detect("It's not just a tool, it's a revolution.");
    expect(d.type).toBe("structural");
    expect(d.category).toBe("discourse-structure");
    expect(detector.family).toBe("stereotypes");
  });
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/detectors/stereotypes.test.ts`
Résultat attendu : ÉCHEC, module `./stereotypes` introuvable.

- [ ] **Étape 3 : créer `src/detectors/stereotypes.ts`**

```ts
import type { Detection, Detector, SignalFamily } from "../types/types";
import { TRIAD_MIN_COUNT, TRIAD_WEIGHT } from "../analysis/thresholds";

interface Pattern {
  kind: "parallel" | "conclusion" | "triad";
  regex: RegExp;
  confidence: number;
}

const A = "['’]"; // apostrophe droite ou typographique
const ITEM = "\\p{L}+(?: \\p{L}+){0,2}";

const PATTERNS: Pattern[] = [
  {
    kind: "parallel",
    regex: new RegExp(
      `\\b(?:it${A}?s|it is|this is|that${A}?s) not (?:just|only|merely|simply)(?!\\s+because\\b) [^.!?]{1,80}?[,;—–-]\\s*(?:it${A}?s|it is|but)\\b`,
      "giu",
    ),
    confidence: 0.8,
  },
  {
    kind: "parallel",
    regex: new RegExp(`\\bce n${A}est pas (?:seulement|simplement|uniquement|qu${A})[^.!?]{1,80}?[,;—–-]\\s*c${A}est\\b`, "giu"),
    confidence: 0.8,
  },
  {
    kind: "conclusion",
    regex: new RegExp(
      [
        "(?:serves|stands) as a testament to",
        "underscor(?:es|ing) (?:its|the) importance",
        "highlighting the (?:importance|significance)",
        "plays a (?:crucial|pivotal|vital) role",
        `témoigne d(?:e|${A})`,
        `souligne l${A}importance`,
        "joue un rôle (?:crucial|essentiel|clé|majeur)",
        "il convient de noter",
        "il est important de souligner",
        "cette approche permet de",
      ].join("|"),
      "giu",
    ),
    confidence: 0.7,
  },
  {
    kind: "triad",
    regex: new RegExp(`(?<![\\p{L}])${ITEM}, ${ITEM},? (?:and|et) ${ITEM}(?![\\p{L}])`, "gu"),
    confidence: 0.4,
  },
];

const EXPLANATION: Record<Pattern["kind"], string> = {
  parallel: "Parallélisme négatif (« ce n'est pas X, c'est Y ») : tournure très fréquente dans les textes générés par des LLM.",
  conclusion: "Formule de conclusion enflée, typique des textes générés par des LLM.",
  triad: "Énumération par trois répétée : rythme ternaire caractéristique des textes générés par des LLM.",
};

export class StereotypeDetector implements Detector {
  readonly id = "stereotypes";
  readonly name = "Stereotype Detector";
  readonly family: SignalFamily = "stereotypes";

  async detect(text: string): Promise<Detection[]> {
    const out: Detection[] = [];
    const seen = new Set<string>();
    for (const p of PATTERNS) {
      const matches = [...text.matchAll(p.regex)];
      if (p.kind === "triad" && matches.length < TRIAD_MIN_COUNT) continue;
      for (const m of matches) {
        const start = m.index!;
        const end = start + m[0].length;
        const key = `${start}-${end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: crypto.randomUUID(),
          type: "structural",
          category: "discourse-structure",
          text: m[0],
          start,
          end,
          score: Math.round(p.confidence * 100),
          confidence: p.confidence,
          explanation: EXPLANATION[p.kind],
          suggestions: [],
          ...(p.kind === "triad" ? { weight: TRIAD_WEIGHT } : {}),
        });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }
}
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/detectors/stereotypes.test.ts && npx tsc --noEmit`
Résultat attendu : 7 tests PASS. Si l'énumération par trois capture plus de mots que prévu (par exemple « need trust, transparency, and accountability »), c'est accepté : le test ne vérifie que le nombre, le poids et la confiance.

- [ ] **Étape 5 : commiter**

```bash
git add src/detectors/stereotypes.ts src/detectors/stereotypes.test.ts
git commit -m "feat(detection): formulations stéréotypées (parallélismes, conclusions, triades)"
```

---

### Tâche 5 : détecteurs de rythme et de paragraphes

**Fichiers :**
- Créer : `src/detectors/rhythm.ts`, `src/detectors/paragraphs.ts`
- Test : `src/detectors/rhythm.test.ts`, `src/detectors/paragraphs.test.ts`

**Interfaces :**
- Consomme : `segment`, `Segmented` ; `mean`, `std`, `ramp`, `formatFr` ; constantes `RHYTHM_*`, `PARAGRAPH_*`, `TOPIC_*`, `ALERT_SCORE`.
- Produit :
  - `RhythmDetector implements Detector, GlobalDetector` (`id = "rhythm"`, `family = "regularity"`, `detect` renvoie `[]`), signal `rhythm` ;
  - `ParagraphDetector implements Detector, GlobalDetector` (`id = "paragraphs"`, `family = "regularity"`), signaux `paragraph-uniformity` et `topic-sentences`.

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/detectors/rhythm.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { RhythmDetector } from "./rhythm";
import { segment } from "../analysis/segment";

const sentence = (n: number) => `Mot${" mot".repeat(n - 1)}.`;
const text = (lengths: number[]) => lengths.map(sentence).join(" ");
const signal = (t: string) => new RhythmDetector().signals(t, segment(t))[0];

describe("RhythmDetector", () => {
  it("alerts on perfectly regular sentences", () => {
    const t = text([10, 10, 10, 10, 10, 10]);
    const s = signal(t);
    expect(s.value).toBe(-1);
    expect(s.score).toBe(100);
    expect(s.status).toBe("alert");
    expect(s.ranges).toHaveLength(6);
    expect(s.display).toBe("B = −1,00 (seuil −0,25)");
  });

  it("is ok on varied sentences", () => {
    const s = signal(text([3, 25, 8, 40, 5, 15]));
    expect(s.value).toBeCloseTo(-0.104, 2);
    expect(s.score).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("highlights only sentences within 15% of the mean", () => {
    const t = text([10, 10, 10, 11, 9, 13]); // μ = 10,5 ; bande ±1,575
    const s = signal(t);
    expect(s.ranges).toHaveLength(5);
    expect(s.ranges.every((r) => t.slice(r.start, r.end).split(" ").length !== 13)).toBe(true);
  });

  it("is insufficient under 5 sentences", () => {
    expect(signal(text([10, 10, 10, 10])).status).toBe("insufficient");
  });

  it("emits no point detections and belongs to regularity", async () => {
    const d = new RhythmDetector();
    expect(await d.detect(text([10, 10, 10, 10, 10]))).toEqual([]);
    expect(d.family).toBe("regularity");
  });
});
```

`src/detectors/paragraphs.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { ParagraphDetector } from "./paragraphs";
import { segment } from "../analysis/segment";

const para = (words: number) => `Mot${" mot".repeat(words - 1)}.`;
const signals = (t: string) => {
  const list = new ParagraphDetector().signals(t, segment(t));
  return { uniformity: list.find((s) => s.id === "paragraph-uniformity")!, topic: list.find((s) => s.id === "topic-sentences")! };
};

describe("ParagraphDetector — uniformity", () => {
  it("alerts on paragraphs of identical length", () => {
    const s = signals([20, 20, 20].map(para).join("\n")).uniformity;
    expect(s.value).toBe(0);
    expect(s.score).toBe(100);
    expect(s.status).toBe("alert");
    expect(s.ranges).toHaveLength(3);
  });

  it("is ok on heterogeneous paragraphs", () => {
    const s = signals([10, 40, 80].map(para).join("\n")).uniformity;
    expect(s.value).toBeCloseTo(0.66, 1);
    expect(s.score).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("ignores titles and short list items", () => {
    const s = signals(["Titre court", para(20), "Item", para(20), para(20)].join("\n")).uniformity;
    expect(s.value).toBe(0);
    expect(s.ranges).toHaveLength(3);
  });

  it("is insufficient with fewer than 3 kept paragraphs", () => {
    expect(signals([para(20), para(20)].join("\n")).uniformity.status).toBe("insufficient");
  });
});

describe("ParagraphDetector — topic sentences", () => {
  const thematic = [
    "Le jardinage urbain transforme les villes modernes. Le jardinage urbain demande peu d'espace. Les villes deviennent plus vertes grâce à lui.",
    "Le compost domestique réduit les déchets ménagers. Un compost bien entretenu limite les déchets. Il nourrit aussi le sol du jardin.",
    "Les abeilles sauvages pollinisent nos cultures fruitières. Ces abeilles protègent les cultures locales. Elles ont besoin de fleurs variées.",
  ];
  const plain = [
    "Il pleuvait fort ce matin-là. Personne ne sortait dans la rue. Le facteur passa très tard.",
    "Marie rangeait sa cuisine en chantant. Le téléphone sonna deux fois. Elle ne répondit pas.",
    "La voiture refusait de démarrer encore. Paul appela son frère. Ils prirent finalement le bus.",
  ];

  it("alerts when nearly every paragraph opens with a topic sentence", () => {
    const s = signals(thematic.join("\n")).topic;
    expect(s.value).toBe(1);
    expect(s.status).toBe("alert");
    expect(s.score).toBe(100);
    expect(s.ranges).toHaveLength(3);
  });

  it("is ok on narrative paragraphs", () => {
    const s = signals(plain.join("\n")).topic;
    expect(s.value).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("counts single-sentence paragraphs as non-thematic", () => {
    const s = signals([...thematic.slice(0, 2), "Une seule phrase assez longue pour compter ici vraiment."].join("\n")).topic;
    expect(s.value).toBeCloseTo(2 / 3, 5);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/detectors/rhythm.test.ts src/detectors/paragraphs.test.ts`
Résultat attendu : ÉCHEC, modules introuvables.

- [ ] **Étape 3 : créer `src/detectors/rhythm.ts`**

```ts
import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import type { Segmented } from "../analysis/segment";
import { formatFr, mean, ramp, std } from "../analysis/stats";
import { ALERT_SCORE, RHYTHM_AI, RHYTHM_BAND, RHYTHM_HUMAN, RHYTHM_MIN_SENTENCES } from "../analysis/thresholds";

/** Variabilité du rythme (burstiness) : B = (σ − μ) / (σ + μ) sur la longueur des phrases. */
export class RhythmDetector implements Detector, GlobalDetector {
  readonly id = "rhythm";
  readonly name = "Rhythm Detector";
  readonly family: SignalFamily = "regularity";

  async detect(): Promise<Detection[]> {
    return [];
  }

  signals(_text: string, seg: Segmented): GlobalSignal[] {
    const sentences = seg.sentences.filter((s) => s.wordCount > 0);
    const lengths = sentences.map((s) => s.wordCount);
    const mu = mean(lengths);
    const sigma = std(lengths);
    const b = sigma + mu > 0 ? (sigma - mu) / (sigma + mu) : 0;
    const insufficient = sentences.length < RHYTHM_MIN_SENTENCES;
    const score = insufficient ? 0 : ramp(b, RHYTHM_HUMAN, RHYTHM_AI);
    return [
      {
        id: "rhythm",
        family: "regularity",
        label: "Rythme des phrases",
        value: b,
        display: `B = ${formatFr(b)} (seuil ${formatFr(RHYTHM_HUMAN)})`,
        score,
        status: insufficient ? "insufficient" : score >= ALERT_SCORE ? "alert" : "ok",
        explanation: "Un humain alterne phrases courtes et longues ; un LLM garde une cadence régulière (B très négatif).",
        ranges: sentences
          .filter((s) => Math.abs(s.wordCount - mu) <= RHYTHM_BAND * mu)
          .map(({ start, end }) => ({ start, end })),
      },
    ];
  }
}
```

- [ ] **Étape 4 : créer `src/detectors/paragraphs.ts`**

```ts
import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import type { Paragraph, Segmented } from "../analysis/segment";
import { formatFr, mean, ramp, std } from "../analysis/stats";
import {
  PARAGRAPH_CV_AI, PARAGRAPH_CV_ALERT, PARAGRAPH_CV_HUMAN, PARAGRAPH_MIN_COUNT, PARAGRAPH_MIN_WORDS,
  TOPIC_AI, TOPIC_ALERT, TOPIC_HUMAN,
} from "../analysis/thresholds";

const STOPWORDS = new Set(
  (
    "this that with from have been were they their there these those which while about into over also very more most such than " +
    "then them what when where will would could should other some only just your each many much because being here " +
    "dans pour avec sans sont etre avoir cette leur leurs nous vous elle elles mais donc ainsi aussi plus tres tout tous toute toutes " +
    "comme entre sous chez dont meme faire fait peut peuvent encore alors apres avant depuis leur notre votre quand celui celle ceux"
  ).split(" "),
);

/** Mots porteurs : ≥ 4 lettres, hors mots vides, comparés sans accents sur 5 lettres. */
function carriers(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.match(/\p{L}+/gu) ?? []) {
    const w = raw.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    if (w.length >= 4 && !STOPWORDS.has(w)) out.add(w.slice(0, 5));
  }
  return out;
}

function isThematic(p: Paragraph, seg: Segmented): boolean {
  if (p.sentences.length < 2) return false;
  const [first, ...rest] = p.sentences.map((i) => seg.sentences[i]);
  const restWords = carriers(rest.map((s) => s.text).join(" "));
  let shared = 0;
  for (const w of carriers(first.text)) if (restWords.has(w)) shared++;
  return shared >= 2;
}

export class ParagraphDetector implements Detector, GlobalDetector {
  readonly id = "paragraphs";
  readonly name = "Paragraph Detector";
  readonly family: SignalFamily = "regularity";

  async detect(): Promise<Detection[]> {
    return [];
  }

  signals(_text: string, seg: Segmented): GlobalSignal[] {
    const kept = seg.paragraphs.filter((p) => p.wordCount >= PARAGRAPH_MIN_WORDS);
    const insufficient = kept.length < PARAGRAPH_MIN_COUNT;
    const lengths = kept.map((p) => p.wordCount);
    const mu = mean(lengths);
    const cv = mu > 0 ? std(lengths) / mu : 0;
    const thematic = kept.filter((p) => isThematic(p, seg));
    const rate = kept.length ? thematic.length / kept.length : 0;

    return [
      {
        id: "paragraph-uniformity",
        family: "regularity",
        label: "Homogénéité des paragraphes",
        value: cv,
        display: `CV = ${formatFr(cv)} (seuil ${formatFr(PARAGRAPH_CV_ALERT)})`,
        score: insufficient ? 0 : ramp(cv, PARAGRAPH_CV_HUMAN, PARAGRAPH_CV_AI),
        status: insufficient ? "insufficient" : cv < PARAGRAPH_CV_ALERT ? "alert" : "ok",
        explanation: "Des paragraphes de longueur presque identique trahissent une génération calibrée.",
        ranges: kept.map(({ start, end }) => ({ start, end })),
      },
      {
        id: "topic-sentences",
        family: "regularity",
        label: "Phrases d'ouverture thématiques",
        value: rate,
        display: `${Math.round(rate * 100)} % des paragraphes (seuil ${Math.round(TOPIC_ALERT * 100)} %)`,
        score: insufficient ? 0 : ramp(rate, TOPIC_HUMAN, TOPIC_AI),
        status: insufficient ? "insufficient" : rate >= TOPIC_ALERT ? "alert" : "ok",
        explanation:
          "Indice approximatif : un LLM ouvre presque chaque paragraphe par une phrase qui annonce son thème (~94 % contre ~73 % chez l'humain).",
        ranges: thematic.map((p) => seg.sentences[p.sentences[0]]).map(({ start, end }) => ({ start, end })),
      },
    ];
  }
}
```

- [ ] **Étape 5 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run src/detectors/rhythm.test.ts src/detectors/paragraphs.test.ts && npx tsc --noEmit`
Résultat attendu : 12 tests PASS, aucune erreur de type.

- [ ] **Étape 6 : commiter**

```bash
git add src/detectors/rhythm.ts src/detectors/rhythm.test.ts src/detectors/paragraphs.ts src/detectors/paragraphs.test.ts
git commit -m "feat(detection): rythme des phrases et structure des paragraphes"
```

---

### Tâche 6 : score par famille, orchestration et calibration

**Fichiers :**
- Créer : `src/analysis/scoring.ts`
- Modifier : `src/types/types.ts` (`AnalysisResult`)
- Modifier : `src/services/detector.ts`
- Modifier : `src/analysis/service.ts`
- Test : `src/analysis/scoring.test.ts`, `src/analysis/calibration.test.ts` ; modifier `src/analysis/live.test.ts`

**Interfaces :**
- Consomme : tous les détecteurs (Tâches 2 à 5), `segment`, constantes.
- Produit :
  - `FAMILY_OF_TYPE: Record<DetectionType, SignalFamily>`, `FAMILY_LABEL: Record<SignalFamily, string>` ;
  - `computeScore(input: { detections: Detection[]; signals: GlobalSignal[]; wordCount: number; registered: Set<SignalFamily> }): { totalScore: number; confidence: "low" | "medium" | "high"; families: FamilyScore[] }` ;
  - `AnalysisResult` + `families: FamilyScore[]`, `signals: GlobalSignal[]`, `wordCount: number` ;
  - `createDetectorService()` enregistre lexical, connectors, stereotypes, rhythm et paragraphs.

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/analysis/scoring.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { computeScore } from "./scoring";
import type { Detection, DetectionType, GlobalSignal, SignalFamily } from "../types/types";

const det = (type: DetectionType, confidence = 1, weight?: number): Detection => ({
  id: Math.random().toString(), type, category: "lexical-marker", text: "x", start: 0, end: 1,
  score: 50, confidence, explanation: "", suggestions: [], ...(weight ? { weight } : {}),
});
const sig = (id: GlobalSignal["id"], score: number, status: GlobalSignal["status"] = "ok"): GlobalSignal => ({
  id, family: id === "connector-density" ? "connectors" : "regularity", label: "", value: 0, display: "",
  score, status, explanation: "", ranges: [],
});
const ALL = new Set<SignalFamily>(["vocabulary", "connectors", "stereotypes", "regularity"]);
const family = (r: ReturnType<typeof computeScore>, f: SignalFamily) => r.families.find((x) => x.family === f)!;

describe("computeScore", () => {
  it("scores vocabulary by confidence density: 3 full markers per 100 words = 100", () => {
    const r = computeScore({ detections: [det("lexical"), det("lexical"), det("lexical")], signals: [], wordCount: 100, registered: ALL });
    expect(family(r, "vocabulary").score).toBe(100);
    const half = computeScore({ detections: [det("lexical", 0.5), det("lexical", 0.5), det("lexical", 0.5)], signals: [], wordCount: 100, registered: ALL });
    expect(family(half, "vocabulary").score).toBe(50);
  });

  it("scores stereotypes by weighted density: 1.5 per 100 words = 100", () => {
    const r = computeScore({ detections: [det("structural"), det("structural", 0.4, 0.5)], signals: [], wordCount: 100, registered: ALL });
    expect(family(r, "stereotypes").score).toBe(100);
  });

  it("uses signal scores for connectors and the max of regularity signals", () => {
    const r = computeScore({
      detections: [], wordCount: 200, registered: ALL,
      signals: [sig("connector-density", 40), sig("rhythm", 30), sig("paragraph-uniformity", 70), sig("topic-sentences", 90, "insufficient")],
    });
    expect(family(r, "connectors").score).toBe(40);
    expect(family(r, "regularity").score).toBe(70);
  });

  it("excludes non-measurable families and renormalises weights", () => {
    // seul le vocabulaire est enregistré : 100 × 0,30 / 0,30 = 100
    const r = computeScore({ detections: Array(5).fill(det("lexical")), signals: [], wordCount: 50, registered: new Set(["vocabulary"]) });
    expect(r.totalScore).toBe(100);
    expect(r.families.filter((f) => f.measurable).map((f) => f.family)).toEqual(["vocabulary"]);
  });

  it("marks density families as not measurable under 30 words", () => {
    const r = computeScore({ detections: [det("lexical")], signals: [], wordCount: 20, registered: ALL });
    expect(family(r, "vocabulary").measurable).toBe(false);
    expect(r.totalScore).toBe(0);
  });

  it("computes the weighted mean over measurable families", () => {
    // vocabulaire 100 (0,30), stéréotypes 0 (0,25), connecteurs 50 (0,20), régularité 100 (0,25) → 65
    const r = computeScore({
      detections: [det("lexical"), det("lexical"), det("lexical")], wordCount: 100, registered: ALL,
      signals: [sig("connector-density", 50), sig("rhythm", 100)],
    });
    expect(r.totalScore).toBe(Math.round((100 * 0.3 + 0 * 0.25 + 50 * 0.2 + 100 * 0.25) / 1));
  });

  it("needs several families above 50 for higher confidence", () => {
    const base = { wordCount: 200, registered: ALL };
    const one = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [] });
    expect(one.confidence).toBe("low");
    const two = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80)] });
    expect(two.confidence).toBe("medium");
    const three = computeScore({ ...base, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80), sig("connector-density", 60)] });
    expect(three.confidence).toBe("high");
    const short = computeScore({ ...base, wordCount: 79, detections: Array(6).fill(det("lexical")), signals: [sig("rhythm", 80), sig("connector-density", 60)] });
    expect(short.confidence).toBe("low");
  });

  it("returns 0 and low confidence for empty input", () => {
    expect(computeScore({ detections: [], signals: [], wordCount: 0, registered: ALL })).toMatchObject({ totalScore: 0, confidence: "low" });
  });
});
```

`src/analysis/calibration.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { createDetectorService } from "./service";

const AI_EN = `In today's rapidly evolving digital landscape, artificial intelligence plays a pivotal role in shaping how organizations operate. Furthermore, it offers a comprehensive framework for improving efficiency across many sectors. This transformation is not just a technological shift, it is a profound cultural change. Moreover, companies must navigate an intricate web of challenges to remain competitive.
Data privacy remains a crucial concern for organizations adopting artificial intelligence today. Additionally, robust governance frameworks help ensure responsible and ethical deployment. These measures foster trust, transparency, and accountability among users. Consequently, leaders must leverage these frameworks to build lasting confidence.
Education also stands to benefit greatly from artificial intelligence in many ways. Furthermore, personalized learning tools adapt to the unique needs of each student. This approach underscores the importance of flexible and inclusive teaching methods. Moreover, teachers can focus on mentoring, creativity, and critical thinking skills.
Ultimately, the future of artificial intelligence depends on thoughtful and collaborative leadership. Its responsible adoption serves as a testament to human ingenuity and vision. Organizations that embrace this change will thrive in a complex world. Overall, artificial intelligence represents a pivotal opportunity for meaningful progress.`;

const HUMAN_EN = `I tried the new bakery on Fifth Street yesterday. Huge mistake? Not at all. The croissants were flaky in a way I haven't seen since that trip to Lyon, years ago, when my sister dragged me out of bed at six to queue behind a dozen locals who clearly knew something we didn't.
Prices are steep, though. Four dollars for a croissant. My dad would have laughed.
The owner, a tall guy with flour on his glasses, told me he gets the butter from a farm upstate and that he nearly quit last winter because the oven kept breaking down and the repairman never called back. He seemed tired but proud. I bought two more for the road.
Will I go back? Probably on Sunday, if the rain holds off and my knee stops complaining.`;

const AI_FR = `Dans un monde en constante évolution, l'intelligence artificielle joue un rôle crucial dans la transformation des entreprises. En outre, elle offre des outils incontournables pour améliorer la productivité des équipes. Ce n'est pas seulement une avancée technique, c'est une véritable révolution culturelle. Par ailleurs, les organisations doivent adopter une approche méticuleuse et réfléchie.
La protection des données demeure un enjeu primordial pour les organisations modernes. De plus, une gouvernance robuste permet de garantir une utilisation éthique et responsable. Ces mesures favorisent la confiance, la transparence et la responsabilité des utilisateurs. Par conséquent, les dirigeants doivent s'appuyer sur ces principes pour bâtir l'avenir.
L'éducation constitue également un domaine essentiel pour l'intelligence artificielle aujourd'hui. En effet, les outils personnalisés s'adaptent aux besoins spécifiques de chaque élève. Cette évolution souligne l'importance de méthodes pédagogiques flexibles et inclusives. Ainsi, les enseignants peuvent se concentrer sur la créativité, l'écoute et l'esprit critique.
En définitive, l'avenir de l'intelligence artificielle repose sur une vision collective et ambitieuse. Son adoption responsable témoigne de l'ingéniosité humaine et de notre capacité d'adaptation. Les organisations qui embrassent ce changement réussiront dans un monde complexe. En somme, l'intelligence artificielle représente une opportunité incontestablement majeure pour notre société.`;

const HUMAN_FR = `Hier soir, panne de courant dans tout le quartier. On a sorti les bougies, évidemment, et mon fils a décrété que c'était la meilleure soirée de l'année.
Bon. Le congélateur, lui, n'était pas d'accord.
J'ai passé une bonne heure à vider les bacs dans la baignoire remplie de glaçons que la voisine du troisième nous avait gentiment apportés, en râlant contre le fournisseur d'électricité, contre moi-même qui n'avais jamais acheté de groupe électrogène malgré les promesses répétées depuis trois hivers, et contre le chat qui se faufilait partout.
Le courant est revenu vers minuit. Trop tard pour les glaces. Tant pis, on les a mangées.`;

const service = createDetectorService();

describe("calibration", () => {
  it("scores typical AI English at least 25 points above varied human English", async () => {
    const ai = await service.detectAll(AI_EN);
    const human = await service.detectAll(HUMAN_EN);
    expect(ai.totalScore - human.totalScore).toBeGreaterThanOrEqual(25);
  });

  it("scores typical AI French at least 25 points above varied human French", async () => {
    const ai = await service.detectAll(AI_FR);
    const human = await service.detectAll(HUMAN_FR);
    expect(ai.totalScore - human.totalScore).toBeGreaterThanOrEqual(25);
  });

  it("returns the four families and four signals", async () => {
    const r = await service.detectAll(AI_EN);
    expect(r.families.map((f) => f.family)).toEqual(["vocabulary", "connectors", "stereotypes", "regularity"]);
    expect(r.signals.map((s) => s.id).sort()).toEqual(["connector-density", "paragraph-uniformity", "rhythm", "topic-sentences"]);
    expect(r.wordCount).toBeGreaterThan(150);
  });

  it("analyses 20 000 characters in under 50 ms (median of 5)", async () => {
    let text = "";
    while (text.length < 20_000) text += AI_EN + "\n";
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      await service.detectAll(text);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
  });
});
```

Dans `src/analysis/live.test.ts`, remplacer le test `describe("createDetectorService", …)` par :

```ts
describe("createDetectorService", () => {
  it("registers the five detectors", () => {
    expect(createDetectorService().getRegisteredIds()).toEqual(["lexical", "connectors", "stereotypes", "rhythm", "paragraphs"]);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/analysis/scoring.test.ts src/analysis/calibration.test.ts src/analysis/live.test.ts`
Résultat attendu : ÉCHEC, `./scoring` introuvable ; `families` et `signals` indéfinis ; seulement `["lexical"]` enregistré.

- [ ] **Étape 3 : créer `src/analysis/scoring.ts`**

```ts
import type { Detection, DetectionType, FamilyScore, GlobalSignal, SignalFamily } from "../types/types";
import { ALERT_SCORE, FAMILY_WEIGHTS, MIN_WORDS_CONFIDENT, MIN_WORDS_DENSITY, STEREOTYPE_MAX_DENSITY, VOCAB_MAX_DENSITY } from "./thresholds";

export const FAMILY_OF_TYPE: Record<DetectionType, SignalFamily> = {
  lexical: "vocabulary",
  connector: "connectors",
  structural: "stereotypes",
  stylistic: "regularity",
};

export const FAMILY_LABEL: Record<SignalFamily, string> = {
  vocabulary: "Vocabulaire",
  connectors: "Connecteurs",
  stereotypes: "Formulations",
  regularity: "Régularité",
};

const FAMILIES: SignalFamily[] = ["vocabulary", "connectors", "stereotypes", "regularity"];

interface ScoreInput {
  detections: Detection[];
  signals: GlobalSignal[];
  wordCount: number;
  /** Familles dont au moins un détecteur est enregistré. */
  registered: Set<SignalFamily>;
}

export function computeScore({ detections, signals, wordCount, registered }: ScoreInput) {
  const per100 = (sum: number) => (wordCount ? (sum / wordCount) * 100 : 0);
  const of = (f: SignalFamily) => detections.filter((d) => FAMILY_OF_TYPE[d.type] === f);
  const measured = (s: GlobalSignal | undefined): s is GlobalSignal => !!s && s.status !== "insufficient";
  const enoughWords = wordCount >= MIN_WORDS_DENSITY;

  const compute = (f: SignalFamily): { score: number; measurable: boolean } => {
    if (!registered.has(f)) return { score: 0, measurable: false };
    switch (f) {
      case "vocabulary": {
        const density = per100(of(f).reduce((a, d) => a + d.confidence, 0));
        return { score: Math.round(Math.min(100, (density / VOCAB_MAX_DENSITY) * 100)), measurable: enoughWords };
      }
      case "stereotypes": {
        const density = per100(of(f).reduce((a, d) => a + (d.weight ?? 1), 0));
        return { score: Math.round(Math.min(100, (density / STEREOTYPE_MAX_DENSITY) * 100)), measurable: enoughWords };
      }
      case "connectors": {
        const s = signals.find((x) => x.id === "connector-density");
        return measured(s) ? { score: s.score, measurable: true } : { score: 0, measurable: false };
      }
      case "regularity": {
        const list = signals.filter((x) => x.family === "regularity").filter(measured);
        return list.length ? { score: Math.max(...list.map((x) => x.score)), measurable: true } : { score: 0, measurable: false };
      }
    }
  };

  const families: FamilyScore[] = FAMILIES.map((family) => ({ family, weight: FAMILY_WEIGHTS[family], ...compute(family) }));
  const active = families.filter((f) => f.measurable);
  const weights = active.reduce((a, f) => a + f.weight, 0);
  const totalScore = weights
    ? Math.min(100, Math.max(0, Math.round(active.reduce((a, f) => a + f.score * f.weight, 0) / weights)))
    : 0;

  const alerts = active.filter((f) => f.score >= ALERT_SCORE).length;
  const confidence: "low" | "medium" | "high" =
    wordCount < MIN_WORDS_CONFIDENT || alerts <= 1 ? "low" : alerts === 2 ? "medium" : "high";

  return { totalScore, confidence, families };
}
```

- [ ] **Étape 4 : étendre `AnalysisResult` dans `src/types/types.ts`**

Dans l'interface `AnalysisResult`, ajouter après `detections: Detection[];` :

```ts
  /** Scores par famille (spec signaux §5). */
  families: FamilyScore[];
  /** Signaux portant sur tout le document. */
  signals: GlobalSignal[];
  wordCount: number;
```

- [ ] **Étape 5 : réécrire `detectAll` dans `src/services/detector.ts`**

Remplacer les imports par :

```ts
import type {
  Detection,
  AnalysisResult,
  Detector,
  DetectionCategory,
  GlobalDetector,
  GlobalSignal,
  SignalFamily,
} from "../types/types";
import { segment } from "../analysis/segment";
import { computeScore } from "../analysis/scoring";

function isGlobal(d: Detector): d is Detector & GlobalDetector {
  return typeof (d as Partial<GlobalDetector>).signals === "function";
}
```

Remplacer toute la méthode `detectAll` par :

```ts
  async detectAll(text: string): Promise<AnalysisResult> {
    const segmented = segment(text);
    const detections: Detection[] = [];
    const signals: GlobalSignal[] = [];
    const registered = new Set<SignalFamily>();
    const categories: Record<DetectionCategory, number> = {
      "lexical-marker": 0,
      "discourse-structure": 0,
      transition: 0,
      "style-regularity": 0,
      anomaly: 0,
    };

    for (const detector of this.detectors.values()) {
      registered.add(detector.family ?? "vocabulary");
      const results = await detector.detect(text);
      detections.push(...results);
      for (const d of results) categories[d.category] += 1;
      if (isGlobal(detector)) signals.push(...detector.signals(text, segmented));
    }

    const wordCount = segmented.words.length;
    const { totalScore, confidence, families } = computeScore({ detections, signals, wordCount, registered });

    return {
      totalScore,
      confidence,
      markerCount: detections.length,
      categories,
      detections,
      families,
      signals,
      wordCount,
    };
  }
```

- [ ] **Étape 6 : enregistrer les cinq détecteurs dans `src/analysis/service.ts`**

```ts
import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";
import { ConnectorDetector } from "../detectors/connectors";
import { StereotypeDetector } from "../detectors/stereotypes";
import { RhythmDetector } from "../detectors/rhythm";
import { ParagraphDetector } from "../detectors/paragraphs";

export function createDetectorService(): DetectorService {
  const service = new DetectorService();
  service.register(new LexicalDetector());
  service.register(new ConnectorDetector());
  service.register(new StereotypeDetector());
  service.register(new RhythmDetector());
  service.register(new ParagraphDetector());
  return service;
}
```

- [ ] **Étape 7 : lancer toute la suite**

Commande : `npx tsc --noEmit && npx vitest run`
Résultat attendu : aucune erreur de type, tous les tests PASS, y compris les tests existants de `services/detector.test.ts`. Ces derniers enregistrent des détecteurs sans famille, comptés comme « vocabulaire » ; le test « bounded to 100 » obtient donc 100.

**Si la calibration échoue** (écart inférieur à 25 points), afficher les familles des quatre textes (`console.log(JSON.stringify(r.families))`) et identifier la famille qui ne sépare pas les textes. Ajuster **le seuil de cette famille** dans `thresholds.ts`, dans les bornes de la spec, et le consigner. Ne jamais modifier les textes de référence pour faire passer le test.

**Si le test de performance échoue**, mesurer chaque détecteur séparément ; le suspect le plus probable est `countWords` dans `segment.ts`, qui est quadratique. Le remplacer par un pointeur qui avance sur `words`, puisque les phrases sont produites dans l'ordre.

- [ ] **Étape 8 : commiter**

```bash
git add src/analysis src/services src/types
git commit -m "feat(analysis): score pondéré par famille, signaux globaux et calibration"
```

---

### Tâche 7 : positions des plages et couche de surlignage des signaux

**Fichiers :**
- Modifier : `src/analysis/positions.ts`
- Modifier : `src/analysis/positions.test.ts`
- Créer : `src/editor/extensions/SignalHighlights.ts`
- Test : `src/editor/extensions/SignalHighlights.test.ts`

**Interfaces :**
- Consomme : `TextIndex` (existant).
- Produit :
  - `mapRange(index: TextIndex, start: number, end: number): { from: number; to: number } | null` ;
  - `mapRanges(index: TextIndex, ranges: Array<{ start: number; end: number }>): Array<{ from: number; to: number }>` ;
  - `signalHighlightKey`, `signalHighlightsPlugin()`, `SignalHighlights` (extension) ;
  - `setSignalHighlight(state: EditorState, ranges: Array<{ from: number; to: number }> | null): Transaction` ;
  - `signalDecorations(state: EditorState): DecorationSet`.

- [ ] **Étape 1 : écrire les tests qui échouent**

À la fin de `src/analysis/positions.test.ts` :

```ts
import { mapRange, mapRanges } from "./positions";

describe("mapRange / mapRanges", () => {
  it("maps plain ranges and drops invalid ones", () => {
    const doc = docOf([p(t("Un deux")), p(t("Trois"))]);
    const index = buildTextIndex(doc);
    const r = mapRange(index, 3, 7)!;
    expect(doc.textBetween(r.from, r.to)).toBe("deux");
    expect(mapRange(index, 5, 5)).toBeNull();
    expect(mapRanges(index, [{ start: 0, end: 2 }, { start: -1, end: 2 }, { start: 8, end: 13 }]).map((x) => doc.textBetween(x.from, x.to))).toEqual(["Un", "Trois"]);
  });
});
```

Déplacer la ligne `import { mapRange, mapRanges } from "./positions";` en haut du fichier, en la fusionnant avec l'import existant de `./positions`.

`src/editor/extensions/SignalHighlights.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../schema";
import { signalHighlightsPlugin, setSignalHighlight, signalDecorations } from "./SignalHighlights";

const schema = getSchema(baseExtensions());
const stateWith = (text: string) =>
  EditorState.create({
    schema,
    doc: schema.nodeFromJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }),
    plugins: [signalHighlightsPlugin()],
  });

describe("SignalHighlights", () => {
  it("adds dotted-underline decorations outside history and without changing the doc", () => {
    let state = stateWith("Une phrase. Une autre.");
    const before = JSON.stringify(state.doc.toJSON());
    const tr = setSignalHighlight(state, [{ from: 1, to: 12 }]);
    expect(tr.getMeta("addToHistory")).toBe(false);
    state = state.apply(tr);
    const [d] = signalDecorations(state).find();
    expect([d.from, d.to]).toEqual([1, 12]);
    expect(JSON.stringify(state.doc.toJSON())).toBe(before);
  });

  it("follows edits, then clears", () => {
    let state = stateWith("Une phrase. Une autre.");
    state = state.apply(setSignalHighlight(state, [{ from: 13, to: 23 }]));
    state = state.apply(state.tr.insertText("Oh. ", 1));
    const [d] = signalDecorations(state).find();
    expect(state.doc.textBetween(d.from, d.to)).toBe("Une autre.");
    state = state.apply(setSignalHighlight(state, null));
    expect(signalDecorations(state).find()).toHaveLength(0);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/analysis/positions.test.ts src/editor/extensions/SignalHighlights.test.ts`
Résultat attendu : ÉCHEC, `mapRange` non exporté, `./SignalHighlights` introuvable.

- [ ] **Étape 3 : ajouter `mapRange` et `mapRanges` dans `src/analysis/positions.ts`**

Remplacer toute la fonction `toRanges` par :

```ts
export function mapRange(index: TextIndex, start: number, end: number): { from: number; to: number } | null {
  if (start < 0 || end > index.text.length || start >= end) return null;
  const from = index.toPos(start, "start");
  const to = index.toPos(end, "end");
  return from == null || to == null || from >= to ? null : { from, to };
}

export function mapRanges(index: TextIndex, ranges: Array<{ start: number; end: number }>): Array<{ from: number; to: number }> {
  return ranges.map((r) => mapRange(index, r.start, r.end)).filter((r): r is { from: number; to: number } => r != null);
}

export function toRanges(index: TextIndex, detections: Detection[]): MarkerRange[] {
  const ranges: MarkerRange[] = [];
  for (const detection of detections) {
    const r = mapRange(index, detection.start, detection.end);
    if (r) ranges.push({ ...r, detection });
  }
  return ranges;
}
```

- [ ] **Étape 4 : créer `src/editor/extensions/SignalHighlights.ts`**

```ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type Ranges = Array<{ from: number; to: number }> | null;

export const signalHighlightKey = new PluginKey<DecorationSet>("signalHighlights");

/**
 * Surlignage des phrases d'un signal global. Comme les marqueurs : simple
 * décoration, hors document, hors historique, hors exports.
 */
export function signalHighlightsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: signalHighlightKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set, _old, newState) {
        const meta = tr.getMeta(signalHighlightKey) as Ranges | undefined;
        if (meta !== undefined) {
          return meta
            ? DecorationSet.create(newState.doc, meta.map((r) => Decoration.inline(r.from, r.to, { class: "to-signal" })))
            : DecorationSet.empty;
        }
        return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
      },
    },
    props: {
      decorations: (state) => signalDecorations(state),
    },
  });
}

export function signalDecorations(state: EditorState): DecorationSet {
  return signalHighlightKey.getState(state) ?? DecorationSet.empty;
}

export function setSignalHighlight(state: EditorState, ranges: Ranges): Transaction {
  return state.tr.setMeta(signalHighlightKey, ranges).setMeta("addToHistory", false);
}

export const SignalHighlights = Extension.create({
  name: "signalHighlights",
  addProseMirrorPlugins() {
    return [signalHighlightsPlugin()];
  },
});
```

- [ ] **Étape 5 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run && npx tsc --noEmit`
Résultat attendu : toute la suite PASS, aucune erreur de type.

- [ ] **Étape 6 : commiter**

```bash
git add src/analysis/positions.ts src/analysis/positions.test.ts src/editor/extensions/SignalHighlights.ts src/editor/extensions/SignalHighlights.test.ts
git commit -m "feat(editor): couche de surlignage des signaux globaux"
```

---

### Tâche 8 : panneau d'analyse (familles, signaux, avertissement) et branchement

**Fichiers :**
- Modifier : `src/editor/AnalysisPanel.tsx` (réécriture)
- Modifier : `src/editor/EditorApp.tsx` (`editorExtensions`)
- Modifier : `src/editor/editor.css`, `src/editor/print.css`
- Modifier : `extension/e2e-manual-test.md` (section D)

**Interfaces :**
- Consomme : `FAMILY_LABEL`, `FAMILY_OF_TYPE` (Tâche 6), `setSignalHighlight`, `SignalHighlights` (Tâche 7), `buildTextIndex`, `mapRanges` (Tâche 7), `AnalysisResult.families/signals/wordCount`.
- Produit : un panneau conforme à la spec §6 ; `CATEGORY_LABEL`, `applySuggestion` et `scoreColor` restent exportés (utilisés par `MarkerTooltip`).

- [ ] **Étape 1 : réécrire `src/editor/AnalysisPanel.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Detection, DetectionCategory, GlobalSignal, SignalFamily } from "../types/types";
import { findMarkerRange, markerLevel, markersVisible, setMarkersVisible } from "./extensions/AiMarkers";
import { setSignalHighlight } from "./extensions/SignalHighlights";
import { matchCase } from "../analysis/live";
import { buildTextIndex, mapRanges } from "../analysis/positions";
import { FAMILY_LABEL, FAMILY_OF_TYPE } from "../analysis/scoring";
import type { useLiveAnalysis } from "./useLiveAnalysis";

export const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Formulation stéréotypée",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

const LEVEL_DOT = { low: "bg-blue-400", medium: "bg-amber-400", high: "bg-red-500" } as const;
const CONFIDENCE_LABEL: Record<string, string> = { high: "Haute", medium: "Moyenne", low: "Faible" };
const STATUS_ICON: Record<GlobalSignal["status"], string> = { ok: "✓", alert: "⚠", insufficient: "⋯" };
const MARKER_FAMILIES: SignalFamily[] = ["vocabulary", "connectors", "stereotypes"];

export const WARNING =
  "Indices stylistiques, pas une preuve. Les textes académiques formels et ceux d'auteurs non natifs produisent des faux positifs.";

export function scoreColor(score: number): string {
  return score < 21 ? "text-natural-500" : score < 41 ? "text-primary-500" : score < 61 ? "text-verify-500" : "text-alert-500";
}

/** Remplace le passage marqué ; transaction normale, donc annulable par Ctrl+Z. */
export function applySuggestion(editor: Editor, detection: Detection, original: string, replacement: string): boolean {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return false;
  const text = matchCase(original, replacement);
  const tr = text
    ? editor.state.tr.insertText(text, range.from, range.to)
    : editor.state.tr.delete(range.from, range.to);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

function reveal(editor: Editor, detection: Detection) {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return;
  editor.chain().focus().setTextSelection(range).scrollIntoView().run();
}

export const AnalysisPanel: React.FC<{ editor: Editor | null; analysis: ReturnType<typeof useLiveAnalysis> }> = ({
  editor, analysis,
}) => {
  const { result, state, sourceText } = analysis;
  const [visible, setVisible] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<GlobalSignal["id"] | null>(null);

  // Nouveau document (nouvel éditeur) : état d'affichage remis à zéro
  useEffect(() => {
    setVisible(true);
    setHighlighted(null);
    setOpenId(null);
  }, [editor]);

  // Le surlignage suit chaque nouvelle analyse, ou disparaît si le signal n'est plus en alerte
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const signal = highlighted ? result?.signals.find((s) => s.id === highlighted) : undefined;
    if (!signal || signal.status !== "alert") {
      if (highlighted) setHighlighted(null);
      editor.view.dispatch(setSignalHighlight(editor.state, null));
      return;
    }
    const index = buildTextIndex(editor.state.doc);
    if (index.text !== sourceText) return; // une analyse plus récente va suivre
    editor.view.dispatch(setSignalHighlight(editor.state, mapRanges(index, signal.ranges)));
  }, [editor, result, sourceText, highlighted]);

  const toggleVisible = () => {
    if (!editor) return;
    const next = !markersVisible(editor.state);
    editor.view.dispatch(setMarkersVisible(editor.state, next));
    setVisible(next);
  };

  const detections = [...(result?.detections ?? [])].sort((a, b) => a.start - b.start);

  return (
    <aside className="no-print w-80 shrink-0 border-l border-gray-200 bg-white overflow-auto" aria-label="Analyse">
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analyse</h2>

        {state === "empty" && <p className="text-sm text-gray-500">Écrivez ou collez du texte pour l'analyser.</p>}
        {state === "error" && <p className="text-sm text-alert-600" role="alert">Analyse indisponible. Nouvel essai à la prochaine modification.</p>}

        {result && state !== "empty" && (
          <>
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor(result.totalScore)}`}>{result.totalScore}<span className="text-base text-gray-400">/100</span></div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">AI Marker Score</div>
              <div className="text-xs text-gray-500 mt-1">
                Confiance : {CONFIDENCE_LABEL[result.confidence] ?? result.confidence} · {result.wordCount} mots
                {state === "running" && " · mise à jour…"}
              </div>
            </div>

            <section aria-label="Familles">
              <ul className="space-y-1.5">
                {result.families.map((f) => (
                  <li key={f.family} className={`text-sm ${f.measurable ? "" : "text-gray-400"}`}>
                    <div className="flex justify-between">
                      <span>{FAMILY_LABEL[f.family]} <span className="text-xs text-gray-400">({Math.round(f.weight * 100)} %)</span></span>
                      <span className="font-medium">{f.measurable ? f.score : "texte trop court"}</span>
                    </div>
                    {f.measurable && (
                      <div className="h-1.5 bg-gray-100 rounded" aria-hidden="true">
                        <div className="h-1.5 rounded bg-primary-500" style={{ width: `${f.score}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Signaux globaux" className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signaux globaux</h3>
              {result.signals.map((s) => (
                <div key={s.id} className={`border rounded-lg p-2 text-sm ${s.status === "alert" ? "border-verify-400 bg-orange-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span aria-label={s.status}>{STATUS_ICON[s.status]}</span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{s.status === "insufficient" ? "Texte trop court" : s.display}</div>
                  <p className="text-xs text-gray-500 mt-1">{s.explanation}</p>
                  {s.status === "alert" && (
                    <button
                      onClick={() => setHighlighted(highlighted === s.id ? null : s.id)}
                      className="mt-1 text-xs underline text-secondary-600"
                    >
                      {highlighted === s.id ? "Retirer le surlignage" : "Surligner les phrases"}
                    </button>
                  )}
                </div>
              ))}
            </section>

            <button onClick={toggleVisible} className="w-full text-sm py-1.5 rounded border border-gray-300 hover:bg-gray-50">
              {visible ? "Masquer les marqueurs" : "Afficher les marqueurs"}
            </button>

            {detections.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun marqueur détecté.</p>
            ) : (
              MARKER_FAMILIES.map((family) => {
                const list = detections.filter((d) => FAMILY_OF_TYPE[d.type] === family);
                if (!list.length) return null;
                return (
                  <section key={family} aria-label={FAMILY_LABEL[family]}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {FAMILY_LABEL[family]} ({list.length})
                    </h3>
                    <ul className="space-y-2">
                      {list.map((d) => {
                        const original = sourceText.slice(d.start, d.end) || d.text;
                        return (
                          <li key={d.id} className="border rounded-lg p-2 text-sm">
                            <button
                              className="w-full text-left flex items-center gap-2"
                              onClick={() => { if (editor) reveal(editor, d); setOpenId(openId === d.id ? null : d.id); }}
                            >
                              <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[markerLevel(d.score)]}`} aria-hidden="true" />
                              <span className="font-medium truncate">« {original} »</span>
                            </button>
                            {openId === d.id && (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-gray-600">{d.explanation}</p>
                                <div className="flex flex-wrap gap-1">
                                  {d.suggestions.map((s) => (
                                    <button
                                      key={s.text}
                                      title={s.reason}
                                      onClick={() => editor && applySuggestion(editor, d, original, s.text)}
                                      className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100"
                                    >
                                      {s.text ? `→ ${matchCase(original, s.text)}` : "Supprimer"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </>
        )}

        <p className="text-xs text-gray-500 border-t pt-3" role="note">{WARNING}</p>
      </div>
    </aside>
  );
};
```

- [ ] **Étape 2 : brancher la couche de surlignage**

Dans `src/editor/EditorApp.tsx` :
- ajouter l'import `import { SignalHighlights } from "./extensions/SignalHighlights";` ;
- remplacer `return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers];` par :

```ts
  return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers, SignalHighlights];
```

- [ ] **Étape 3 : ajouter les styles**

À la fin de `src/editor/editor.css` :

```css
/* Phrases d'un signal global (rythme, paragraphes, connecteurs) */
.to-signal {
  text-decoration: underline dotted #7c3aed 2px;
  text-underline-offset: 3px;
}
```

Dans `src/editor/print.css`, dans le bloc `@media print`, après la règle `.to-marker { … }` :

```css
  .to-signal {
    text-decoration: none !important;
  }
```

- [ ] **Étape 4 : build et vérification dans le navigateur**

Commande : `npx tsc --noEmit && npx vitest run && npm run build`
Résultat attendu : aucune erreur de type, tous les tests PASS, « Contrôle du bundle OK ».

Vérification : servir `dist` en local (`python -m http.server 5180 --bind 127.0.0.1` depuis `dist`), ouvrir `/src/editor/index.html` et coller le texte `AI_EN` de la Tâche 6. Contrôler :
1. Les 4 familles s'affichent avec leurs barres ; le score dépasse 50 ; la confiance est « Moyenne » ou « Haute ».
2. Les 4 cartes « Signaux globaux » s'affichent, et au moins « Densité de connecteurs » est en alerte.
3. « Surligner les phrases » sur une carte en alerte souligne des phrases en pointillé violet. Un second clic retire le surlignage ; un clic sur une autre carte déplace le surlignage.
4. Taper au milieu d'une phrase surlignée : le surlignage suit le texte puis se met à jour après l'analyse.
5. Les marqueurs sont groupés en « Vocabulaire », « Connecteurs » et « Formulations ».
6. L'avertissement est présent en bas du panneau.
7. Changer de document : aucun surlignage ne reste, et le bouton affiche « Masquer les marqueurs ».
8. Export .docx : le XML ne contient ni `to-signal` ni `to-marker`. PDF : aucun soulignement pointillé.
9. Coller `HUMAN_EN` dans un nouveau document : le score est nettement plus bas, et le rythme ainsi que les paragraphes sont « ok ».

- [ ] **Étape 5 : mettre à jour `extension/e2e-manual-test.md`**

Remplacer la section `## D. Analyse` par :

```markdown
## D. Analyse
Texte : coller un paragraphe d'IA typique (4 paragraphes réguliers, connecteurs, « serves as a testament to »).
- [ ] Surlignage ~0,5 s après la frappe ; panneau à jour (score, confiance, nombre de mots).
- [ ] 4 familles avec barres et poids ; famille non mesurable → « texte trop court ».
- [ ] 4 signaux globaux (connecteurs, rythme, homogénéité, phrases d'ouverture) avec valeur et seuil.
- [ ] « Surligner les phrases » : pointillé violet ; second clic retire ; un seul signal à la fois.
- [ ] Marqueurs groupés Vocabulaire / Connecteurs / Formulations ; survol → infobulle.
- [ ] « → Moreover » sur « Furthermore » garde la majuscule ; Ctrl+Z rétablit.
- [ ] Masquer / afficher les marqueurs ; le score reste.
- [ ] Avertissement « Indices stylistiques, pas une preuve… » visible en permanence.
- [ ] Texte humain varié → score nettement plus bas, rythme « ok ».
- [ ] Document vide → « Écrivez ou collez du texte pour l'analyser. »
```

- [ ] **Étape 6 : commiter**

```bash
git add src/editor e2e-manual-test.md
git commit -m "feat(editor): panneau des familles, signaux globaux et avertissement"
```
