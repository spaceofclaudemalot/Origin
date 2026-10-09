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

  async detect(_text: string): Promise<Detection[]> {
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
