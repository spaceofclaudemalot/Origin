import type { Detection, Detector, GlobalDetector, GlobalSignal, SignalFamily } from "../types/types";
import type { Segmented } from "../analysis/segment";
import { formatNum, mean, ramp, std } from "../analysis/stats";
import { t } from "../i18n/core";
import { ALERT_SCORE, MIN_WORDS_DENSITY, RHYTHM_AI, RHYTHM_BAND, RHYTHM_HUMAN, RHYTHM_MIN_SENTENCES } from "../analysis/thresholds";

/** Variabilité du rythme (burstiness) : B = (σ − μ) / (σ + μ) sur la longueur des phrases. */
export class RhythmDetector implements Detector, GlobalDetector {
  readonly id = "rhythm";
  readonly name = "Rhythm Detector";
  readonly family: SignalFamily = "regularity";

  async detect(_text: string): Promise<Detection[]> {
    return [];
  }

  signals(_text: string, seg: Segmented): GlobalSignal[] {
    const sentences = seg.sentences.filter((s) => s.wordCount > 0);
    const lengths = sentences.map((s) => s.wordCount);
    const mu = mean(lengths);
    const sigma = std(lengths);
    const b = sigma + mu > 0 ? (sigma - mu) / (sigma + mu) : 0;
    // Une liste courte (titres, lignes de quelques mots) n'a pas de « rythme » mesurable
    const insufficient = sentences.length < RHYTHM_MIN_SENTENCES || seg.words.length < MIN_WORDS_DENSITY;
    const score = insufficient ? 0 : ramp(b, RHYTHM_HUMAN, RHYTHM_AI);
    return [
      {
        id: "rhythm",
        family: "regularity",
        label: t("rhythm.label"),
        value: b,
        display: t("rhythm.display", { b: formatNum(b), threshold: formatNum(RHYTHM_HUMAN) }),
        score,
        status: insufficient ? "insufficient" : score >= ALERT_SCORE ? "alert" : "ok",
        explanation: t("rhythm.why"),
        ranges: sentences
          .filter((s) => Math.abs(s.wordCount - mu) <= RHYTHM_BAND * mu)
          .map(({ start, end }) => ({ start, end })),
      },
    ];
  }
}
