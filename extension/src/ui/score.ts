export type ScoreBand = "low" | "mid" | "notable" | "high";

export const BAND_LABEL: Record<ScoreBand, string> = { low: "Faible", mid: "Modéré", notable: "Notable", high: "Élevé" };

/** Bandes du score global (mêmes seuils que l'ancien code couleur : 21 / 41 / 61). */
export const scoreBand = (score: number): ScoreBand =>
  score < 21 ? "low" : score < 41 ? "mid" : score < 61 ? "notable" : "high";
