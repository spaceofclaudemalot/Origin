import { describe, it, expect } from "vitest";
import { ConnectorDetector } from "./connectors";
import { segment } from "../analysis/segment";

const filler = (n: number) => Array(n).fill("mot").join(" ");
const detector = new ConnectorDetector();
const signal = (text: string) => detector.signals(text, segment(text))[0];

describe("ConnectorDetector", () => {
  it("detects EN and FR connectors with their original case", async () => {
    const result = await detector.detect("Furthermore, it works. Néanmoins, par conséquent, rien. In addition, yes.");
    expect(result.map((d) => d.text)).toEqual(["Furthermore", "Néanmoins", "par conséquent", "In addition"]);
    expect(result.every((d) => d.type === "connector" && d.category === "transition")).toBe(true);
    expect(result[0].suggestions.length).toBeGreaterThan(0);
  });

  it("does not match inside words", async () => {
    expect(await detector.detect("Thusly the ainsite thereforex.")).toEqual([]);
  });

  it("stays ok just below 1.8x the human baseline", () => {
    const s = signal(`However ${filler(99)}.`); // 1 / 100 mots → ×1,67
    expect(s.status).toBe("ok");
    expect(s.value).toBeCloseTo(1.667, 2);
    expect(s.score).toBe(22);
  });

  it("alerts above 1.8x the baseline and highlights the sentences", () => {
    const text = `However ${filler(48)}. Moreover ${filler(50)}.`; // 2 / 100 mots → ×3,33
    const s = signal(text);
    expect(s.status).toBe("alert");
    expect(s.score).toBe(78);
    expect(s.display).toBe("×3,3 la norme humaine (seuil ×1,8)");
    expect(s.ranges.map((r) => text.slice(r.start, r.end).split(" ")[0])).toEqual(["However", "Moreover"]);
  });

  it("is insufficient under 30 words", () => {
    expect(signal("However, short.").status).toBe("insufficient");
  });

  it("gives each detection the family score", async () => {
    const text = `However ${filler(48)}. Moreover ${filler(50)}.`;
    const result = await detector.detect(text);
    expect(result.every((d) => d.score === 78)).toBe(true);
  });

  it("belongs to the connectors family", () => {
    expect(detector.family).toBe("connectors");
  });
});
