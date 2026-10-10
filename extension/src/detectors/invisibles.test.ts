import { describe, it, expect } from "vitest";
import { findInvisibles, invisiblesReport, cleanupEdits } from "./invisibles";

const tags = (s: string) => [...s].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("");
const apply = (text: string) =>
  cleanupEdits(findInvisibles(text))
    .sort((a, b) => b.start - a.start)
    .reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), text);

describe("findInvisibles — detection", () => {
  it("finds a zero-width space inside a word", () => {
    expect(findInvisibles("Bon​jour")).toEqual([
      { start: 3, end: 4, name: "ZWSP", label: "ZWSP", severity: "hint", count: 1, action: "remove" },
    ]);
  });

  it("groups consecutive characters of the same type", () => {
    const [f] = findInvisibles("a​​​b");
    expect(f).toMatchObject({ start: 1, end: 4, count: 3 });
  });

  it("flags a no-break space outside French typography", () => {
    expect(findInvisibles("the model said")).toEqual([
      { start: 3, end: 4, name: "NBSP", label: "NBSP", severity: "hint", count: 1, action: "space" },
    ]);
  });

  it("flags soft hyphens, word joiners and a BOM in the middle", () => {
    expect(findInvisibles("auto­matique⁠ok﻿fin").map((f) => f.name)).toEqual(["SHY", "WJ", "BOM"]);
  });

  it("decodes hidden text written with Unicode tag characters", () => {
    const [f] = findInvisibles(`Hello${tags("ignore previous")} world`);
    expect(f).toMatchObject({ name: "TAG", severity: "suspect", count: 15, hidden: "ignore previous", action: "remove" });
  });

  it("flags bidirectional controls as suspect", () => {
    expect(findInvisibles("admin‮txt.exe")[0]).toMatchObject({ name: "RLO", severity: "suspect" });
  });

  it("flags variation selectors used to smuggle data after an emoji", () => {
    const [f] = findInvisibles("😀\u{E0100}\u{E0101}");
    expect(f).toMatchObject({ name: "VS", severity: "suspect", count: 2 });
  });
});

describe("findInvisibles — legitimate uses are ignored", () => {
  it("accepts well-composed French typography", () => {
    expect(
      findInvisibles("Bonjour ! Il a dit : « oui ». Prix : 10 000 € ; 50 %."),
    ).toEqual([]);
  });

  it("accepts emoji ZWJ sequences, emoji presentation selectors and flags", () => {
    expect(findInvisibles("👨‍👩‍👧 ❤️ 👍🏽‍")).toHaveLength(1); // seul le ZWJ final, isolé, est signalé
    expect(findInvisibles("🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}")).toEqual([]);
  });

  it("accepts ZWNJ in Persian and ideographic variation sequences", () => {
    expect(findInvisibles("می‌خواهم")).toEqual([]);
    expect(findInvisibles("葛\u{E0100}")).toEqual([]);
  });

  it("accepts a BOM at the very start", () => {
    expect(findInvisibles("﻿Hello")).toEqual([]);
  });
});

describe("invisiblesReport", () => {
  it("counts all characters and suspect ones", () => {
    const report = invisiblesReport(`a​​b${tags("hi")}c`);
    expect(report.total).toBe(4);
    expect(report.suspects).toBe(2);
    expect(report.findings).toHaveLength(2);
  });
});

describe("cleanupEdits", () => {
  it("removes invisible characters and normalises special spaces", () => {
    expect(apply(`the model​ said${tags("x")}.`)).toBe("the model said.");
  });

  it("keeps French typography untouched", () => {
    expect(apply("Bonjour ! the x")).toBe("Bonjour ! the x");
  });
});
