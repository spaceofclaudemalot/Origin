import type { InvisibleFinding, InvisibleReport } from "../types/types";

/**
 * Caractères invisibles et espaces spéciales. Leur présence indique un texte
 * copié depuis un outil (IA ou autre) ou manipulé : un indice, pas une preuve
 * de rédaction par IA — d'où un rapport séparé du score.
 */
interface Kind {
  name: string;
  severity: "hint" | "suspect";
  action: "remove" | "space";
}

const hint = (name: string): Kind => ({ name, severity: "hint", action: "remove" });
const space = (name: string): Kind => ({ name, severity: "hint", action: "space" });
const suspect = (name: string): Kind => ({ name, severity: "suspect", action: "remove" });

const NAMED: Record<number, Kind> = {
  0x200b: hint("ZWSP"),
  0x200c: hint("ZWNJ"),
  0x200d: hint("ZWJ"),
  0x2060: hint("WJ"),
  0xfeff: hint("BOM"),
  0x00ad: hint("SHY"),
  0x034f: hint("CGJ"),
  0x180e: hint("MVS"),
  0x200e: hint("LRM"),
  0x200f: hint("RLM"),
  0x115f: hint("FILLER"),
  0x1160: hint("FILLER"),
  0x3164: hint("FILLER"),
  0xffa0: hint("FILLER"),
  0x00a0: space("NBSP"),
  0x202f: space("NNBSP"),
  0x2002: space("ENSP"),
  0x2003: space("EMSP"),
  0x2004: space("SPACE"),
  0x2005: space("SPACE"),
  0x2006: space("SPACE"),
  0x2007: space("FIGSP"),
  0x2008: space("PUNCSP"),
  0x2009: space("THSP"),
  0x200a: space("HSP"),
  0x3000: space("IDSP"),
  0x202a: suspect("LRE"),
  0x202b: suspect("RLE"),
  0x202c: suspect("PDF"),
  0x202d: suspect("LRO"),
  0x202e: suspect("RLO"),
  0x2066: suspect("LRI"),
  0x2067: suspect("RLI"),
  0x2068: suspect("FSI"),
  0x2069: suspect("PDI"),
};

function kindOf(cp: number): Kind | null {
  if (NAMED[cp]) return NAMED[cp];
  if (cp >= 0x2061 && cp <= 0x2064) return hint("INVOP");
  if (cp >= 0xe0000 && cp <= 0xe007f) return suspect("TAG");
  if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef)) return suspect("VS");
  return null;
}

const PICTO = /\p{Extended_Pictographic}/u;
const SYMBOL = /\p{S}/u;
const HAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const DIGIT = /\p{Nd}/u;
// Écritures où ZWJ / ZWNJ ont un rôle typographique, et écritures de droite à gauche
const JOINING = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const RTL = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u;
const FRENCH_BEFORE = new Set([";", ":", "!", "?", "»", "%", "€", "$", "£", "›"]);
const FRENCH_AFTER = new Set(["«", "‹"]);

interface CodePoint {
  cp: number;
  ch: string;
  start: number;
  end: number;
}

const isVS = (cp: number) => (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
const isSkinTone = (cp: number) => cp >= 0x1f3fb && cp <= 0x1f3ff;

/** Usage légitime : typographie française, émojis composés, écritures liées, drapeaux… */
function isLegit(cps: CodePoint[], i: number, kind: Kind): boolean {
  const { cp } = cps[i];
  const prev = cps[i - 1]?.ch ?? "";
  const next = cps[i + 1]?.ch ?? "";

  if (kind.action === "space") {
    if (cp === 0x3000) return HAN.test(prev) || HAN.test(next);
    return FRENCH_BEFORE.has(next) || FRENCH_AFTER.has(prev) || DIGIT.test(prev);
  }
  switch (kind.name) {
    case "BOM":
      return i === 0;
    case "ZWJ": {
      // émoji (avec sélecteur ou teinte de peau éventuels) + ZWJ + émoji
      let j = i - 1;
      while (j >= 0 && (isVS(cps[j].cp) || isSkinTone(cps[j].cp))) j--;
      if (j >= 0 && PICTO.test(cps[j].ch) && PICTO.test(next)) return true;
      return JOINING.test(prev) && JOINING.test(next);
    }
    case "ZWNJ":
      return JOINING.test(prev) && JOINING.test(next);
    case "LRM":
    case "RLM":
      return RTL.test(prev) || RTL.test(next);
    case "VS": {
      if (!prev || isVS(cps[i - 1].cp)) return false;
      if (cp === 0xfe0e || cp === 0xfe0f) return PICTO.test(prev) || SYMBOL.test(prev);
      if (cp >= 0xe0100) return HAN.test(prev);
      return SYMBOL.test(prev) || HAN.test(prev);
    }
  }
  return false;
}

function decodeTags(cps: CodePoint[]): string {
  return cps
    .map(({ cp }) => cp - 0xe0000)
    .filter((c) => c >= 0x20 && c <= 0x7e)
    .map((c) => String.fromCharCode(c))
    .join("");
}

export function findInvisibles(text: string): InvisibleFinding[] {
  const cps: CodePoint[] = [];
  let pos = 0;
  for (const ch of text) {
    cps.push({ cp: ch.codePointAt(0)!, ch, start: pos, end: pos + ch.length });
    pos += ch.length;
  }

  const findings: InvisibleFinding[] = [];
  for (let i = 0; i < cps.length; i++) {
    const kind = kindOf(cps[i].cp);
    if (!kind) continue;

    if (kind.name === "TAG") {
      let j = i;
      while (j + 1 < cps.length && kindOf(cps[j + 1].cp)?.name === "TAG") j++;
      const run = cps.slice(i, j + 1);
      // Drapeau régional : 🏴 + lettres en tags + terminateur U+E007F
      const isFlag = cps[i - 1]?.cp === 0x1f3f4 && run[run.length - 1].cp === 0xe007f;
      if (!isFlag) {
        findings.push({
          start: run[0].start,
          end: run[run.length - 1].end,
          name: "TAG",
          label: "TAG",
          severity: "suspect",
          count: run.length,
          action: "remove",
          hidden: decodeTags(run),
        });
      }
      i = j;
      continue;
    }

    if (isLegit(cps, i, kind)) continue;
    const last = findings[findings.length - 1];
    if (last && last.name === kind.name && last.end === cps[i].start) {
      last.end = cps[i].end;
      last.count++;
      continue;
    }
    findings.push({
      start: cps[i].start,
      end: cps[i].end,
      name: kind.name,
      label: kind.name,
      severity: kind.severity,
      count: 1,
      action: kind.action,
    });
  }
  return findings;
}

export function invisiblesReport(text: string): InvisibleReport {
  const findings = findInvisibles(text);
  return {
    findings,
    total: findings.reduce((n, f) => n + f.count, 0),
    suspects: findings.filter((f) => f.severity === "suspect").reduce((n, f) => n + f.count, 0),
  };
}

/** Modifications de nettoyage, en positions du texte analysé. */
export function cleanupEdits(findings: InvisibleFinding[]): Array<{ start: number; end: number; text: string }> {
  return findings.map((f) => ({ start: f.start, end: f.end, text: f.action === "space" ? " " : "" }));
}
