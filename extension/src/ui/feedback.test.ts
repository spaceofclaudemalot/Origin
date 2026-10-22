import { describe, it, expect } from "vitest";
import { FEEDBACK_EMAIL, feedbackUrl } from "./feedback";
import { setLang } from "../i18n/core";

describe("feedbackUrl", () => {
  const url = feedbackUrl({ version: "0.2.0", userAgent: "Mozilla/5.0 Test" });
  const [head, query] = url.split("?");
  const params = new URLSearchParams(query);

  it("ouvre un mail vers l'adresse de retour", () => {
    expect(head).toBe(`mailto:${FEEDBACK_EMAIL}`);
    expect(FEEDBACK_EMAIL).toBe("claude.malot@creativeori.com");
  });

  it("préremplit objet et modèle avec version et navigateur", () => {
    expect(params.get("subject")).toContain("TextOrigin AI");
    const body = params.get("body") ?? "";
    expect(body).toContain("Version : 0.2.0");
    expect(body).toContain("Navigateur : Mozilla/5.0 Test");
    expect(body).toContain("Retour");
    expect(body).toContain("Bug");
  });

  it("encode les espaces en %20 (pas en +) pour les clients mail", () => {
    expect(query).not.toContain("+");
  });

  it("précise que le texte analysé n'est pas joint", () => {
    expect(params.get("body")).toMatch(/n'est pas joint/);
  });

  it("écrit le modèle en anglais quand l'interface est en anglais", () => {
    setLang("en");
    try {
      const en = new URLSearchParams(feedbackUrl({ version: "0.2.0", userAgent: "UA" }).split("?")[1]);
      expect(en.get("subject")).toBe("[TextOrigin AI] Feedback or bug");
      expect(en.get("body")).toContain("Version: 0.2.0");
      expect(en.get("body")).toContain("is not attached");
    } finally {
      setLang("fr");
    }
  });

  it("indique « inconnue » sans version", () => {
    expect(new URLSearchParams(feedbackUrl({}).split("?")[1]).get("body")).toContain("Version : inconnue");
  });
});
