import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import { countWordsIn, type Segmented } from "../analysis/segment";
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

function measure(text: string, words: number) {
  const found = findConnectors(text);
  const ratio = words ? (found.length / words) * 100 / CONNECTOR_BASELINE : 0;
  return { found, words, ratio, score: ramp(ratio, 1, CONNECTOR_MAX_RATIO) };
}

export class ConnectorDetector implements Detector, GlobalDetector {
  readonly id = "connectors";
  readonly name = "Connector Detector";
  readonly family: SignalFamily = "connectors";

  async detect(text: string): Promise<Detection[]> {
    const { found, score } = measure(text, countWordsIn(text));
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
    const { found, words, ratio, score } = measure(text, seg.words.length);
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
