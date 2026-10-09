import { describe, it, expect } from "vitest";
import { contrastRatio, TOKENS } from "./contrast";

describe("contrastes des jetons", () => {
  it("référence WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  for (const theme of ["light", "dark"] as const) {
    const t = TOKENS[theme];
    it(`${theme} : texte principal ≥ 4.5 sur surface et raised`, () => {
      expect(contrastRatio(t.ink, t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.ink, t.raised)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme} : texte secondaire ≥ 4.5 sur surface`, () => {
      expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme} : texte sur accent ≥ 3 (gras ≥ 13 px)`, () => {
      expect(contrastRatio(t.accentInk, t.accent)).toBeGreaterThanOrEqual(3);
    });
  }
});
