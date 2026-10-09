import { describe, it, expect } from "vitest";
import { createDetectorService } from "./service";
import { AI_EN, AI_FR, HUMAN_EN, HUMAN_FR } from "./__fixtures__/calibration-texts";

const service = createDetectorService();

describe("calibration", () => {
  it("scores typical AI English at least 25 points above varied human English", async () => {
    const ai = await service.detectAll(AI_EN);
    const human = await service.detectAll(HUMAN_EN);
    expect(ai.totalScore - human.totalScore).toBeGreaterThanOrEqual(25);
  });

  it("scores typical AI French at least 25 points above varied human French", async () => {
    const ai = await service.detectAll(AI_FR);
    const human = await service.detectAll(HUMAN_FR);
    expect(ai.totalScore - human.totalScore).toBeGreaterThanOrEqual(25);
  });

  it("returns the four families and four signals", async () => {
    const r = await service.detectAll(AI_EN);
    expect(r.families.map((f) => f.family)).toEqual(["vocabulary", "connectors", "stereotypes", "regularity"]);
    expect(r.signals.map((s) => s.id).sort()).toEqual(["connector-density", "paragraph-uniformity", "rhythm", "topic-sentences"]);
    expect(r.wordCount).toBeGreaterThan(150);
  });

});

describe("calibration — ordinary human texts", () => {
  it("does not score a short shopping list", async () => {
    const list = ["Courses", "Lait demi-écrémé bio", "Pain complet", "Six œufs frais", "Tomates cerises", "Beurre doux", "Café moulu"].join("\n");
    expect((await service.detectAll(list)).totalScore).toBe(0);
  });
});
