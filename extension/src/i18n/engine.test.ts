import { describe, it, expect, afterEach } from "vitest";
import { createDetectorService } from "../analysis/service";
import { AI_FR, HUMAN_FR } from "../analysis/__fixtures__/calibration-texts";
import { LexicalDetector } from "../detectors/lexical";
import { StereotypeDetector } from "../detectors/stereotypes";
import { familyLabel } from "../analysis/scoring";
import { formatNum } from "../analysis/stats";
import { setLang } from "./core";

const service = createDetectorService();

describe("moteur : explications dans la langue de l'interface", () => {
  afterEach(() => setLang("fr"));

  it("explication lexicale et suggestion en anglais sur un texte français", async () => {
    setLang("en");
    const [d] = await new LexicalDetector().detect("Il est crucial de la cultiver au quotidien dans toute équipe.");
    expect(d.explanation).toBe("The term “crucial” is often seen in LLM-generated text.");
    expect(d.suggestions[0].reason).toMatch(/^Replace “crucial” with “/);
  });

  it("même détection en français par défaut", async () => {
    const [d] = await new LexicalDetector().detect("Il est crucial de la cultiver au quotidien dans toute équipe.");
    expect(d.explanation).toContain("Le terme « crucial »");
  });

  it("formulations : parallélisme et résidu de chatbot en anglais", async () => {
    setLang("en");
    const found = await new StereotypeDetector().detect(
      "Ce n'est pas seulement un outil, c'est un levier. J'espère que cela vous aide !",
    );
    expect(found.some((d) => d.explanation.startsWith("Negative parallelism"))).toBe(true);
    const residue = found.find((d) => d.explanation.startsWith("Leftover from a chatbot"));
    expect(residue?.suggestions[0].reason).toBe("Remove this phrase; the rest of the sentence stands on its own.");
  });

  it("signaux globaux, étiquettes de familles et nombres en anglais", async () => {
    setLang("en");
    const r = await service.detectAll(AI_FR);
    const connectors = r.signals.find((s) => s.id === "connector-density")!;
    expect(connectors.label).toBe("Connector density");
    expect(connectors.display).toMatch(/^×\d+\.\d the human norm \(threshold ×\d+\.\d\)$/);
    expect(r.signals.find((s) => s.id === "rhythm")!.label).toBe("Sentence rhythm");
    expect(familyLabel("stereotypes")).toBe("Phrasing");
  });

  it("le score ne dépend pas de la langue d'interface", async () => {
    const fr = await service.detectAll(HUMAN_FR);
    setLang("en");
    const en = await service.detectAll(HUMAN_FR);
    expect(en.totalScore).toBe(fr.totalScore);
    expect(en.detections.length).toBe(fr.detections.length);
  });

  it("nombres : virgule en français, point en anglais", () => {
    expect(formatNum(1.8, 1)).toBe("1,8");
    setLang("en");
    expect(formatNum(1.8, 1)).toBe("1.8");
    expect(formatNum(-0.52)).toBe("−0.52");
  });
});
