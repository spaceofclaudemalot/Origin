import { describe, it, expect } from "vitest";
import { RhythmDetector } from "./rhythm";
import { segment } from "../analysis/segment";

const sentence = (n: number) => `Mot${" mot".repeat(n - 1)}.`;
const text = (lengths: number[]) => lengths.map(sentence).join(" ");
const signal = (t: string) => new RhythmDetector().signals(t, segment(t))[0];

describe("RhythmDetector", () => {
  it("alerts on perfectly regular sentences", () => {
    const t = text([10, 10, 10, 10, 10, 10]);
    const s = signal(t);
    expect(s.value).toBe(-1);
    expect(s.score).toBe(100);
    expect(s.status).toBe("alert");
    expect(s.ranges).toHaveLength(6);
    expect(s.display).toBe("B = −1,00 (seuil −0,25)");
  });

  it("is ok on varied sentences", () => {
    const s = signal(text([3, 25, 8, 40, 5, 15]));
    expect(s.value).toBeCloseTo(-0.104, 2);
    expect(s.score).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("highlights only sentences within 15% of the mean", () => {
    const t = text([10, 10, 10, 11, 9, 13]); // μ = 10,5 ; bande ±1,575
    const s = signal(t);
    expect(s.ranges).toHaveLength(5);
    expect(s.ranges.every((r) => t.slice(r.start, r.end).split(" ").length !== 13)).toBe(true);
  });

  it("is insufficient under 5 sentences", () => {
    expect(signal(text([10, 10, 10, 10])).status).toBe("insufficient");
  });

  it("emits no point detections and belongs to regularity", async () => {
    const d = new RhythmDetector();
    expect(await d.detect(text([10, 10, 10, 10, 10]))).toEqual([]);
    expect(d.family).toBe("regularity");
  });
});
