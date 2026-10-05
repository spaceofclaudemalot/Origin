/**
 * Test de validation de typage — compilé par `npx tsc --noEmit`.
 * Vérifie que les valeurs sont assignables aux types de types.ts.
 */

import type { DetectionCategory, DetectionType } from "./types";

// @ts-expect-error — "invalid" n'est pas une catégorie valide
export const badCategory: DetectionCategory = "invalid";
// @ts-expect-error — "unknown" n'est pas un type valide
export const badType: DetectionType = "unknown";

// Doit compiler sans erreur
export const goodCategory: DetectionCategory = "lexical-marker";
export const goodType: DetectionType = "lexical";