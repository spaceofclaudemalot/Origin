import { describe, it, expect } from "vitest";
import { ParagraphDetector } from "./paragraphs";
import { segment } from "../analysis/segment";

const para = (words: number) => `Mot${" mot".repeat(words - 1)}.`;
const signals = (t: string) => {
  const list = new ParagraphDetector().signals(t, segment(t));
  return { uniformity: list.find((s) => s.id === "paragraph-uniformity")!, topic: list.find((s) => s.id === "topic-sentences")! };
};

describe("ParagraphDetector — uniformity", () => {
  it("alerts on paragraphs of identical length", () => {
    const s = signals([20, 20, 20].map(para).join("\n")).uniformity;
    expect(s.value).toBe(0);
    expect(s.score).toBe(100);
    expect(s.status).toBe("alert");
    expect(s.ranges).toHaveLength(3);
  });

  it("is ok on heterogeneous paragraphs", () => {
    const s = signals([10, 40, 80].map(para).join("\n")).uniformity;
    expect(s.value).toBeCloseTo(0.66, 1);
    expect(s.score).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("ignores titles and short list items", () => {
    const s = signals(["Titre court", para(20), "Item", para(20), para(20)].join("\n")).uniformity;
    expect(s.value).toBe(0);
    expect(s.ranges).toHaveLength(3);
  });

  it("is insufficient with fewer than 3 kept paragraphs", () => {
    expect(signals([para(20), para(20)].join("\n")).uniformity.status).toBe("insufficient");
  });
});

describe("ParagraphDetector — topic sentences", () => {
  const thematic = [
    "Le jardinage urbain transforme les villes modernes. Le jardinage urbain demande peu d'espace. Les villes deviennent plus vertes grâce à lui.",
    "Le compost domestique réduit les déchets ménagers. Un compost bien entretenu limite les déchets. Il nourrit aussi le sol du jardin.",
    "Les abeilles sauvages pollinisent nos cultures fruitières. Ces abeilles protègent les cultures locales. Elles ont besoin de fleurs variées.",
  ];
  const plain = [
    "Il pleuvait fort ce matin-là. Personne ne sortait dans la rue. Le facteur passa très tard.",
    "Marie rangeait sa cuisine en chantant. Le téléphone sonna deux fois. Elle ne répondit pas.",
    "La voiture refusait de démarrer encore. Paul appela son frère. Ils prirent finalement le bus.",
  ];

  it("alerts when nearly every paragraph opens with a topic sentence", () => {
    const s = signals(thematic.join("\n")).topic;
    expect(s.value).toBe(1);
    expect(s.status).toBe("alert");
    expect(s.score).toBe(100);
    expect(s.ranges).toHaveLength(3);
  });

  it("is ok on narrative paragraphs", () => {
    const s = signals(plain.join("\n")).topic;
    expect(s.value).toBe(0);
    expect(s.status).toBe("ok");
  });

  it("counts single-sentence paragraphs as non-thematic", () => {
    const s = signals([...thematic.slice(0, 2), "Une seule phrase assez longue pour compter ici vraiment."].join("\n")).topic;
    expect(s.value).toBeCloseTo(2 / 3, 5);
  });
});
