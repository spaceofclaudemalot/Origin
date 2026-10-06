/**
 * Tests de validation de typage — vitest.
 * Vérifie que les valeurs sont assignables aux types de types.ts.
 */

import { describe, it, expect } from "vitest";
import type { DetectionCategory, DetectionType } from "./types";

describe("DetectionCategory", () => {
  it("accepts valid category values", () => {
    const goodCategory: DetectionCategory = "lexical-marker";
    expect(goodCategory).toBe("lexical-marker");
  });
  it("rejects invalid category values at compile time", () => {
    // @ts-expect-error — "invalid" n'est pas une catégorie valide
    const badCategory: DetectionCategory = "invalid";
    expect(badCategory).toBe("invalid");
  });
});

describe("DetectionType", () => {
  it("accepts valid type values", () => {
    const goodType: DetectionType = "lexical";
    expect(goodType).toBe("lexical");
  });
  it("rejects invalid type values at compile time", () => {
    // @ts-expect-error — "unknown" n'est pas un type valide
    const badType: DetectionType = "unknown";
    expect(badType).toBe("unknown");
  });
});