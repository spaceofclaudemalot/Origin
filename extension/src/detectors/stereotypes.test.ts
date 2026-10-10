import { describe, it, expect } from "vitest";
import { StereotypeDetector } from "./stereotypes";

const detector = new StereotypeDetector();
const found = async (text: string) => (await detector.detect(text)).map((d) => d.text);

describe("StereotypeDetector", () => {
  it("detects English negative parallelisms", async () => {
    expect(await found("It's not just a tool, it's a revolution.")).toEqual(["It's not just a tool, it's"]);
    expect(await found("This is not merely a trend — but a shift.")).toEqual(["This is not merely a trend — but"]);
  });

  it("detects French negative parallelisms, straight and curly apostrophes", async () => {
    expect(await found("Ce n'est pas seulement un outil, c'est une révolution.")).toEqual(["Ce n'est pas seulement un outil, c'est"]);
    expect(await found("Ce n’est pas qu’une mode, c’est un mouvement.")).toEqual(["Ce n’est pas qu’une mode, c’est"]);
  });

  it("ignores false friends", async () => {
    expect(await found("It's not just because of the rain, it's the wind.")).toEqual([]);
    expect(await found("Not only that.")).toEqual([]);
    expect(await found("Ce n'est pas seulement pour cela que je pars.")).toEqual([]);
  });

  it("detects inflated conclusions in English and French", async () => {
    expect(await found("This serves as a testament to our values and plays a crucial role.")).toEqual([
      "serves as a testament to",
      "plays a crucial role",
    ]);
    expect(await found("Cela témoigne de notre engagement et joue un rôle clé. Il convient de noter ceci.")).toEqual([
      "témoigne de",
      "joue un rôle clé",
      "Il convient de noter",
    ]);
  });

  it("reports triads only when they repeat, with half weight", async () => {
    expect(await found("We need trust, transparency, and accountability.")).toEqual([]);
    const result = await detector.detect(
      "We need trust, transparency, and accountability. Il faut écoute, rigueur et patience.",
    );
    expect(result).toHaveLength(2);
    expect(result.every((d) => d.weight === 0.5 && d.confidence === 0.4)).toBe(true);
  });

  it("returns nothing on plain text", async () => {
    expect(await found("The cat sat on the mat. Le chat dort.")).toEqual([]);
  });

  it("marks detections as structural in the stereotypes family", async () => {
    const [d] = await detector.detect("It's not just a tool, it's a revolution.");
    expect(d.type).toBe("structural");
    expect(d.category).toBe("discourse-structure");
    expect(detector.family).toBe("stereotypes");
  });
});

describe("StereotypeDetector — word boundaries", () => {
  it("does not match « témoigne de » inside « témoigne devant / depuis »", async () => {
    expect(await found("Il témoigne devant le juge demain, il témoigne depuis hier.")).toEqual([]);
  });

  it("matches « témoigne d' » before a vowel", async () => {
    expect(await found("Cela témoigne d'une grande volonté.")).toEqual(["témoigne d'"]);
  });
});
