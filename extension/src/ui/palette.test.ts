import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OLD = /\b(?:bg|text|border|ring|from|to|via|outline|divide)-(?:primary|secondary|natural|verify|alert|highlight|gray|red|blue|amber|purple|orange|green)-\d{2,3}\b|\bdark:[a-z]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("palette", () => {
  it("aucune classe de l'ancienne palette dans src/", () => {
    const offenders = files("src").flatMap((f) =>
      readFileSync(f, "utf8").split("\n").flatMap((line, i) => (OLD.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});
