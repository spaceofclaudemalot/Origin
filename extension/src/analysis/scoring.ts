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
