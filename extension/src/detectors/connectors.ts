import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import { countWordsIn, type Segmented } from "../analysis/segment";
import { formatNum, ramp, wordBoundary } from "../analysis/stats";
import { t } from "../i18n/core";
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

// « de plus » comparatif (« de plus en plus », « une fois de plus », « 3 de plus »)
// et « ainsi que » (coordination) ne sont pas des connecteurs de transition.
const COMPARATIVE_BEFORE = /(?:^|[^\p{L}])(?:fois|rien|pas|jamais|guère|personne|un|une|deux|trois|quatre|cinq|\d+)\s+$/iu;

function isConnectorUse(text: string, start: number, end: number, matched: string): boolean {
  const lower = matched.toLowerCase().replace(/\s+/g, " ");
  const after = text.slice(end, end + 12);
  if (lower === "de plus") {
    if (/^\s+en\s+plus/i.test(after)) return false;
    if (COMPARATIVE_BEFORE.test(text.slice(Math.max(0, start - 15), start))) return false;
  }
  if (lower === "ainsi" && /^\s+que\b/i.test(after)) return false;
  return true;
}

function findConnectors(text: string): Array<{ start: number; end: number; text: string }> {
  return [...text.matchAll(PATTERN)]
    .map((m) => ({ start: m.index!, end: m.index! + m[0].length, text: m[0] }))
    .filter((c) => isConnectorUse(text, c.start, c.end, c.text));
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
      explanation: t("conn.why", { text: c.text }),
      suggestions: (CONNECTORS[c.text.toLowerCase().replace(/\s+/g, " ")] ?? []).map((rep) => ({
        type: "replace",
        text: rep,
        reason: t("conn.reason", { text: c.text, rep }),
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
        label: t("conn.signal.label"),
        value: ratio,
        display: t("conn.signal.display", { ratio: formatNum(ratio, 1), threshold: formatNum(CONNECTOR_ALERT_RATIO, 1) }),
        score: insufficient ? 0 : score,
        status: insufficient ? "insufficient" : ratio >= CONNECTOR_ALERT_RATIO ? "alert" : "ok",
        explanation: t("conn.signal.why"),
        ranges,
      },
    ];
  }
}
