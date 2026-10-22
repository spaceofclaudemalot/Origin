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

describe("StereotypeDetector — catalogue Humanizer", () => {
  const kinds = async (text: string) => (await detector.detect(text)).map((d) => d.explanation.split(" ")[0]);

  it("detects a contrast split across two sentences", async () => {
    expect(await found("This does not mean every choice is equal. It means nothing confirms which is right.")).toHaveLength(1);
    expect(await found("Cela ne veut pas dire que tout se vaut. Cela signifie que rien ne tranche.")).toHaveLength(1);
  });

  it("detects « not only … but » and its French forms", async () => {
    expect(await found("The tool is not only fast, but also cheap.")).toHaveLength(1);
    expect(await found("Il ne s'agit pas de vitesse, mais de confiance.")).toHaveLength(1);
    expect(await found("C'est non seulement rapide, mais aussi fiable.")).toHaveLength(1);
  });

  it("detects chatbot residue with the highest confidence and offers removal", async () => {
    const [d] = await detector.detect("Great question! The Revolution began in 1789. I hope this helps!");
    expect(d.confidence).toBe(0.9);
    expect(d.suggestions).toEqual([expect.objectContaining({ type: "remove", text: "" })]);
    expect(await found("Excellente question. Voici la réponse.")).toHaveLength(1);
    expect(await found("J'espère que cela vous aide !")).toHaveLength(1);
  });

  it("detects knowledge-limit disclaimers", async () => {
    expect(await found("Based on available information, the firm opened in 1990.")).toHaveLength(1);
    expect(await found("Ces détails ne sont pas publiquement disponibles.")).toHaveLength(1);
  });

  it("detects staged run-ups, strawmen, sayings and closers", async () => {
    expect(await found("Let's dive into how caching works.")).toHaveLength(1);
    expect(await found("Plongeons dans le sujet.")).toHaveLength(1);
    expect(await found("Don't get me wrong, the plan is fine.")).toHaveLength(1);
    expect(await found("At its core, the issue is readiness.")).toHaveLength(1);
    expect(await found("Caching cuts repeat work. That is the real win.")).toHaveLength(1);
    expect(await found("Tout est dit.")).toHaveLength(1);
  });

  it("detects inflated significance", async () => {
    expect(await found("The institute was founded in 1989, marking a pivotal moment for statistics.")).toHaveLength(1);
    expect(await found("L'avenir s'annonce prometteur.")).toHaveLength(1);
  });

  it("explains each kind with the catalogue's advice", async () => {
    const [d] = await detector.detect("Let that sink in.");
    expect(d.explanation).toMatch(/Coupez-la/);
    expect(await kinds("Let that sink in.")).toHaveLength(1);
  });

  it("leaves false friends alone", async () => {
    expect(await found("Il habite au cœur de la ville, près du marché.")).toEqual([]);
    expect(await found("I told her, to be clear, that I was not moving.")).toEqual([]);
    expect(await found("Not only that.")).toEqual([]);
    expect(await found("She asked a great question about tides.")).toEqual([]);
    expect(await found("We looked at the real question marks in the data.")).toEqual([]);
    expect(await found("Cela ne veut pas dire que je pars.")).toEqual([]);
    expect(await found("Of course I will come. Certainly not today.")).toEqual([]);
  });

  it("matches a start-of-sentence « To be clear »", async () => {
    expect(await found("The plan changed. To be clear, we ship on Friday.")).toHaveLength(1);
  });
});
