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
