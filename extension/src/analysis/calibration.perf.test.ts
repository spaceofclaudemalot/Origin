// Lancé seul par « npm run test:perf » : en parallèle avec les autres fichiers de
// test, la mesure dépend de la charge de la machine et non du code.
import { describe, it, expect } from "vitest";
import { createDetectorService } from "./service";
import { AI_EN } from "./__fixtures__/calibration-texts";

const service = createDetectorService();

describe("performance", () => {
  it("analyses 20 000 characters in under 50 ms (median of 5)", async () => {
    let text = "";
    while (text.length < 20_000) text += AI_EN + "\n";
    await service.detectAll(text); // échauffement (compilation JIT des expressions)
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      await service.detectAll(text);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
  });
});
