// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { fr } from "./fr";
import { en } from "./en";
import { getLang, initLang, quotes, setLang, t, tn } from "./index";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionnaires", () => {
  it("chaque clé existe dans les deux langues, sans texte vide", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const [key, text] of [...Object.entries(fr), ...Object.entries(en)]) {
      expect(text.trim(), key).not.toBe("");
    }
  });

  it("les deux langues utilisent les mêmes paramètres", () => {
    for (const key of Object.keys(fr) as Array<keyof typeof fr>) {
      expect(placeholders(en[key]), key).toEqual(placeholders(fr[key]));
    }
  });
});

describe("langue d'interface", () => {
  beforeEach(() => {
    localStorage.clear();
    setLang("fr");
  });
  afterEach(() => setLang("fr"));

  it("traduit et interpole les paramètres", () => {
    expect(t("panel.words", { count: 12 })).toBe("12 mots");
    setLang("en");
    expect(t("panel.words", { count: 12 })).toBe("12 words");
  });

  it("choisit le pluriel", () => {
    expect(tn("inv.suspect", 1)).toBe("1 caractère suspect");
    expect(tn("inv.suspect", 3)).toBe("3 caractères suspects");
    setLang("en");
    expect(tn("inv.suspect", 3)).toBe("3 suspicious characters");
  });

  it("mémorise le choix et met à jour l'attribut lang du document", () => {
    setLang("en", true);
    expect(localStorage.getItem("textorigin:lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("initLang reprend le choix mémorisé, sinon la langue du navigateur", () => {
    localStorage.setItem("textorigin:lang", "en");
    expect(initLang()).toBe("en");
    localStorage.clear();
    setLang("fr");
    Object.defineProperty(navigator, "language", { configurable: true, value: "en-US" });
    expect(initLang()).toBe("en");
    Object.defineProperty(navigator, "language", { configurable: true, value: "fr-CA" });
    expect(initLang()).toBe("fr");
    expect(getLang()).toBe("fr");
  });

  it("ignore une valeur mémorisée invalide", () => {
    localStorage.setItem("textorigin:lang", "de");
    Object.defineProperty(navigator, "language", { configurable: true, value: "fr-FR" });
    expect(initLang()).toBe("fr");
  });

  it("guillemets selon la langue", () => {
    expect(quotes()[0]).toContain("«");
    setLang("en");
    expect(quotes()).toEqual(["“", "”"]);
  });
});
