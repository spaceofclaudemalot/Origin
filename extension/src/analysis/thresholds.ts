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
