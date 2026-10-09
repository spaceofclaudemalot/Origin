import { describe, it, expect } from "vitest";
import { scoreBand } from "./score";

describe("scoreBand", () => {
  it("seuils 21 / 41 / 61", () => {
    expect([0, 20, 21, 40, 41, 60, 61, 100].map(scoreBand)).toEqual(["low", "low", "mid", "mid", "notable", "notable", "high", "high"]);
  });
});
