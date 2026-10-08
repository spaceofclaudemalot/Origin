import { describe, it, expect } from "vitest";
import { mean, std, ramp, formatFr, wordBoundary } from "./stats";

describe("stats", () => {
  it("mean and population std", () => {
    expect(mean([])).toBe(0);
    expect(mean([2, 4])).toBe(3);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(std([])).toBe(0);
  });

  it("ramp maps linearly to 0-100 in both directions and clamps", () => {
    expect(ramp(1, 1, 4)).toBe(0);
    expect(ramp(2.5, 1, 4)).toBe(50);
    expect(ramp(9, 1, 4)).toBe(100);
    expect(ramp(-0.25, -0.25, -0.55)).toBe(0);
    expect(ramp(-0.4, -0.25, -0.55)).toBe(50);
    expect(ramp(-1, -0.25, -0.55)).toBe(100);
  });

  it("formatFr uses a decimal comma and a true minus sign", () => {
    expect(formatFr(-0.523)).toBe("−0,52");
    expect(formatFr(1.8, 1)).toBe("1,8");
  });

  it("wordBoundary matches whole words with Unicode letters", () => {
    const re = wordBoundary("crucial", "giu");
    expect("La crucialité".match(re)).toBeNull();
    expect("Un point crucial.".match(re)?.[0]).toBe("crucial");
    expect("Néanmoins, oui".match(wordBoundary("néanmoins", "giu"))?.[0]).toBe("Néanmoins");
  });
});
