import { t } from "../i18n/core";

export type ScoreBand = "low" | "mid" | "notable" | "high";

export const bandLabel = (band: ScoreBand): string => t(`band.${band}`);

/** Bandes du score global (mêmes seuils que l'ancien code couleur : 21 / 41 / 61). */
export const scoreBand = (score: number): ScoreBand =>
  score < 21 ? "low" : score < 41 ? "mid" : score < 61 ? "notable" : "high";
