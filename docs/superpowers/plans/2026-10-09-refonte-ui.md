# Refonte de l'interface — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyler l'éditeur et le popup de TextOrigin selon la direction « hybride » (cadre gris mat, rail noir, feuille claire, accent `#DF5830`), avec disposition adaptative, mode sombre système et étiquettes d'analyse en marge.

**Architecture:** Jetons CSS (canaux RVB) sur `:root` + redéfinition sombre, exposés à Tailwind via `rgb(var(--to-x) / <alpha-value>)`. Primitives React maison dans `src/ui/`. La logique nouvelle est isolée en fonctions pures testées (`layoutFor`, `wordCountOf`, `scoreBand`, `blockAnnotations`, `stackLabels`, `contrastRatio`) ; les composants ne font que de la présentation. Moteur, stockage et exports intouchés.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind 3.4, TipTap 3, Vite 6, Vitest, `@fontsource-variable/inter`.

**Spec:** `docs/superpowers/specs/2026-10-09-refonte-ui-design.md`

Toutes les commandes se lancent depuis `extension/`.

## Global Constraints

- CSP : `script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'` — aucune ressource externe.
- `minimum_chrome_version` : `"88"`.
- `src/analysis`, `src/detectors`, `src/storage`, `src/export` : non modifiés.
- Le popup ne doit embarquer ni TipTap ni docx (`scripts/check-bundle.mjs` reste vert).
- Libellés d'export : « Word (.docx) » et « PDF » ; aucune marque « Word » / « Google Docs » ailleurs.
- La feuille (`.sheet`), l'infobulle et `print.css` n'utilisent que des valeurs claires épinglées.
- Accent clair `#DF5830`, accent sombre `#E8683F` ; plus aucun rouge dans l'interface.
- Seuils de bande de score : 21 / 41 / 61.
- Points de rupture : 1440 / 1200 / 960 px.
- `localStorage` toujours lu/écrit dans un try/catch.

## Review Focus

- `localStorage` indisponible ou JSON corrompu → valeurs par défaut, aucune exception (tests dans Task 2).
- Document avec tableau, liste imbriquée, image et texte vide → `blockAnnotations` et `wordCountOf` ne plantent pas et comptent correctement (tests dans Tasks 3 et 10).
- Analyse obsolète (texte modifié depuis) → les étiquettes ne s'affichent pas sur de mauvais blocs (garde `index.text === sourceText`, Task 11).
- Impression en mode sombre → la feuille imprime sur blanc, aucune étiquette ni barre (vérif manuelle Task 12, règles CSS Task 1).
- Ancienne palette Tailwind oubliée dans une classe → Tailwind 3 ne casse **pas** le build sur une classe inconnue ; un test qui scanne `src/` l'attrape (Task 1).

> Écart assumé avec la spec §9 : la parade « le build échoue » est remplacée par un test de scan, car Tailwind ignore silencieusement les classes inconnues.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/ui/tokens.css` (créé) | jetons clair/sombre, police, base, anneau de focus |
| `src/ui/palette.test.ts` (créé) | scan anti-ancienne palette |
| `src/ui/contrast.ts` + test (créés) | ratio de contraste WCAG, vérif des paires de jetons |
| `src/ui/primitives.tsx` (créé) | `Button`, `IconButton`, `Chip`, `Card`, `Collapsible`, `Menu` |
| `src/ui/icons.tsx` (créé) | icônes SVG en ligne |
| `src/ui/score.ts` + test (créés) | `scoreBand` |
| `src/ui/ScoreGauge.tsx` (créé) | chiffre + puce + jauge |
| `src/editor/layout.ts` + test (créés) | `layoutFor`, lecture/écriture des préférences |
| `src/editor/docInfo.ts` + test (créés) | `wordCountOf`, `relativeDate` |
| `src/editor/Shell.tsx` (créé) | rail, colonnes, tiroirs |
| `src/editor/marginLabels.ts` + test (créés) | `blockAnnotations`, `stackLabels` |
| `src/editor/MarginLabels.tsx` (créé) | calque d'étiquettes |
| `src/editor/EditorApp.tsx`, `Toolbar.tsx`, `DocumentList.tsx`, `ExportMenu.tsx`, `AnalysisPanel.tsx`, `MarkerTooltip.tsx`, `Toast.tsx`, `editor.css`, `print.css`, `main.tsx` (modifiés) | restyle |
| `src/popup/index.tsx`, `src/popup/global.css` (modifiés) | restyle popup |
| `tailwind.config.js` (modifié) | palette → jetons |
| `src/styles/global.css` (supprimé, inutilisé) | — |

---

## Phase 1 — Fondations

### Task 1: Jetons, Tailwind, Inter, garde anti-ancienne palette

**Files:**
- Create: `src/ui/tokens.css`, `src/ui/palette.test.ts`
- Modify: `tailwind.config.js`, `src/editor/editor.css`, `src/editor/print.css`, `src/popup/global.css`, `package.json`
- Delete: `src/styles/global.css` (vérifier qu'aucun import ne le référence : `grep -rn "styles/global" src`)

**Interfaces:**
- Produces: classes Tailwind `bg-canvas|surface|raised|rail|sheet|accent`, `text-ink|muted|accent|accent-ink|sheet-ink`, `border-line`, `bg-band-low|mid|notable|high`, `shadow-soft|lift`, `rounded-ctl|card|shell`, `font-ui`.

- [ ] **Step 1: Test de scan (échoue)** — `src/ui/palette.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OLD = /\b(?:bg|text|border|ring|from|to|via|outline|divide)-(?:primary|secondary|natural|verify|alert|highlight|gray|red|blue|amber|purple|orange|green)-\d{2,3}\b|\bdark:/;

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
```

- [ ] **Step 2:** `npx vitest run src/ui/palette.test.ts` → FAIL (liste des fichiers actuels). Le test restera rouge jusqu'à la fin de la Task 9 (popup) ; il sert de liste de travail. Il est marqué `it.todo`-free : on le laisse rouge localement mais **on ne le commit qu'à la Task 9**. Commiter `tokens.css` etc. sans lui.

- [ ] **Step 3: Installer Inter** — `npm install @fontsource-variable/inter`

- [ ] **Step 4: `src/ui/tokens.css`**

```css
@import "@fontsource-variable/inter";

:root {
  --to-canvas: 207 204 198;
  --to-surface: 228 225 219;
  --to-raised: 235 232 226;
  --to-line: 214 210 202;
  --to-rail: 35 35 35;
  --to-ink: 29 29 27;
  --to-muted: 107 102 94;
  --to-accent: 223 88 48;
  --to-accent-ink: 255 255 255;
  --to-band-low: 169 184 164;
  --to-band-mid: 185 180 170;
  --to-band-notable: 226 161 131;
  --to-shadow: 0 0 0;
  --to-shadow-k: 1;
  /* Feuille : identiques dans les deux thèmes */
  --to-sheet: 251 250 247;
  --to-sheet-ink: 29 29 27;
  color-scheme: light;
}

body {
  background: rgb(var(--to-canvas));
  color: rgb(var(--to-ink));
  font-family: "Inter Variable", system-ui, sans-serif;
}

:focus-visible {
  outline: 2px solid rgb(var(--to-accent));
  outline-offset: 2px;
}
```

(Les valeurs sombres sont ajoutées à la Task 8.)

- [ ] **Step 5: `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
const tok = (name) => `rgb(var(--to-${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        canvas: tok("canvas"),
        surface: tok("surface"),
        raised: tok("raised"),
        line: tok("line"),
        rail: tok("rail"),
        ink: tok("ink"),
        muted: tok("muted"),
        accent: { DEFAULT: tok("accent"), ink: tok("accent-ink") },
        band: { low: tok("band-low"), mid: tok("band-mid"), notable: tok("band-notable") },
        sheet: { DEFAULT: tok("sheet"), ink: tok("sheet-ink") },
      },
      fontFamily: { ui: ['"Inter Variable"', "system-ui", "sans-serif"] },
      fontSize: { "2xs": ["12px", "16px"], score: ["44px", { lineHeight: "1", letterSpacing: "-2px", fontWeight: "300" }] },
      borderRadius: { ctl: "8px", card: "12px", shell: "18px" },
      boxShadow: {
        soft: "0 2px 6px rgb(var(--to-shadow) / calc(.06 * var(--to-shadow-k)))",
        lift: "0 8px 24px rgb(var(--to-shadow) / calc(.10 * var(--to-shadow-k)))",
      },
    },
  },
  plugins: [],
};
```

(`darkMode` retiré : le sombre passe par les jetons, plus par des classes `dark:`.)

- [ ] **Step 6: `editor.css`** — garder les directives Tailwind, importer les jetons et épingler la feuille :

```css
@import "../ui/tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Remplacer `body { background: #f1f3f4; }` par rien (géré par tokens.css). Dans `.sheet` : `background: rgb(var(--to-sheet)); color: rgb(var(--to-sheet-ink)); box-shadow: 0 8px 24px rgb(0 0 0 / .10); border-radius: 4px;` (les autres propriétés inchangées). Marqueurs / signaux / invisibles :

```css
.to-marker { border-radius: 2px; cursor: help; }
.to-marker--low { background-color: rgba(223, 88, 48, 0.16); }
.to-marker--medium { background-color: rgba(223, 88, 48, 0.32); }
.to-marker--high { background-color: rgba(223, 88, 48, 0.5); box-shadow: inset 0 -2px 0 #b8411d; }
.to-marker--focus { outline: 2px solid #b8411d; outline-offset: 1px; }

.to-signal { text-decoration: underline dotted #3b3934 2px; text-underline-offset: 3px; }

.to-invisible { border: 1px dashed #8a857c; border-radius: 3px; }
.to-invisible::before {
  content: attr(data-label);
  font: 600 8px/1 "Inter Variable", system-ui, sans-serif;
  color: #6b665e;
  padding: 1px 3px;
  margin: 0 1px;
  vertical-align: super;
}
.to-invisible--suspect { border-color: #b8411d; }
.to-invisible--suspect::before { content: "⚠ " attr(data-label); color: #b8411d; }
```

Les sélections de tableau / image : `#1a73e8` → `#b8411d`.

- [ ] **Step 7: `print.css`** — ajouter dans `@media print` :

```css
  :root { --to-sheet: 255 255 255; }
  html, body { background: #fff !important; color: #000 !important; }
  .sheet { border-radius: 0; }
  .to-marker { box-shadow: none !important; }
  .to-invisible { border: none !important; }
```

- [ ] **Step 8: `src/popup/global.css`**

```css
@import "../ui/tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9:** `npm run build` → OK ; `npx vitest run --exclude src/ui/palette.test.ts` → 184 PASS.

- [ ] **Step 10: Commit** (sans `palette.test.ts`)

```bash
git add tailwind.config.js package.json package-lock.json src/ui/tokens.css src/editor/editor.css src/editor/print.css src/popup/global.css src/styles
git commit -m "feat(ui): jetons de design, Inter embarquée, nouvelles couleurs des marqueurs"
```

### Task 2: `layoutFor` et préférences de disposition

**Files:** Create `src/editor/layout.ts`, `src/editor/layout.test.ts`

**Interfaces:**
- Produces:
  - `type LayoutPrefs = { docsPinned?: boolean; analysisShown?: boolean }`
  - `type Layout = { docs: "pinned" | "drawer"; analysis: "column" | "drawer"; labels: "gutter" | "inset" }`
  - `layoutFor(width: number, prefs: LayoutPrefs): Layout`
  - `readPrefs(storage?: Pick<Storage, "getItem">): LayoutPrefs`
  - `writePrefs(prefs: LayoutPrefs, storage?: Pick<Storage, "setItem">): void`
  - `LAYOUT_KEY = "textorigin:layout"`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { layoutFor, readPrefs, writePrefs, LAYOUT_KEY } from "./layout";

describe("layoutFor", () => {
  it("≥1440 : docs épinglés, analyse en colonne, étiquettes en gouttière", () => {
    expect(layoutFor(1600, {})).toEqual({ docs: "pinned", analysis: "column", labels: "gutter" });
  });
  it("1200–1439 : docs en tiroir", () => {
    expect(layoutFor(1300, {})).toEqual({ docs: "drawer", analysis: "column", labels: "gutter" });
  });
  it("960–1199 : analyse en tiroir, étiquettes dans la marge", () => {
    expect(layoutFor(1000, {})).toEqual({ docs: "drawer", analysis: "drawer", labels: "inset" });
  });
  it("<960 : tout en tiroir", () => {
    expect(layoutFor(800, {})).toEqual({ docs: "drawer", analysis: "drawer", labels: "inset" });
  });
  it("respecte un désépinglage explicite au-dessus de 1440", () => {
    expect(layoutFor(1600, { docsPinned: false }).docs).toBe("drawer");
  });
  it("respecte un épinglage explicite entre 1200 et 1439", () => {
    expect(layoutFor(1300, { docsPinned: true }).docs).toBe("pinned");
  });
  it("ignore l'épinglage sous 1200 px", () => {
    expect(layoutFor(1100, { docsPinned: true }).docs).toBe("drawer");
  });
  it("analyse masquée explicitement → tiroir même en grand", () => {
    expect(layoutFor(1600, { analysisShown: false }).analysis).toBe("drawer");
  });
  it("analyse montrée explicitement sous 1200 reste en tiroir (pas la place)", () => {
    expect(layoutFor(1000, { analysisShown: true }).analysis).toBe("drawer");
  });
  it("bornes exactes", () => {
    expect(layoutFor(1440, {}).docs).toBe("pinned");
    expect(layoutFor(1439, {}).docs).toBe("drawer");
    expect(layoutFor(1200, {}).analysis).toBe("column");
    expect(layoutFor(1199, {}).analysis).toBe("drawer");
  });
});

describe("préférences", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it("aller-retour", () => {
    const s = mem();
    writePrefs({ docsPinned: true }, s);
    expect(readPrefs(s)).toEqual({ docsPinned: true });
  });
  it("JSON corrompu → {}", () => {
    const s = mem();
    s.setItem(LAYOUT_KEY, "{oops");
    expect(readPrefs(s)).toEqual({});
  });
  it("stockage qui lève → {} et pas d'exception à l'écriture", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(readPrefs(bad)).toEqual({});
    expect(() => writePrefs({ docsPinned: true }, bad)).not.toThrow();
  });
  it("valeurs non booléennes ignorées", () => {
    const s = mem();
    s.setItem(LAYOUT_KEY, JSON.stringify({ docsPinned: "yes", analysisShown: false }));
    expect(readPrefs(s)).toEqual({ analysisShown: false });
  });
});
```

- [ ] **Step 2:** `npx vitest run src/editor/layout.test.ts` → FAIL (module absent).

- [ ] **Step 3: Implémentation**

```ts
export type LayoutPrefs = { docsPinned?: boolean; analysisShown?: boolean };
export type Layout = { docs: "pinned" | "drawer"; analysis: "column" | "drawer"; labels: "gutter" | "inset" };

export const LAYOUT_KEY = "textorigin:layout";
export const BP = { wide: 1440, medium: 1200, narrow: 960 } as const;

/** Disposition selon la largeur ; un choix explicite l'emporte quand il y a la place. */
export function layoutFor(width: number, prefs: LayoutPrefs): Layout {
  const roomForColumns = width >= BP.medium;
  const docsPinned = roomForColumns && (prefs.docsPinned ?? width >= BP.wide);
  const analysisColumn = roomForColumns && (prefs.analysisShown ?? true);
  return {
    docs: docsPinned ? "pinned" : "drawer",
    analysis: analysisColumn ? "column" : "drawer",
    labels: roomForColumns ? "gutter" : "inset",
  };
}

const safeStorage = (): Storage | undefined => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

export function readPrefs(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): LayoutPrefs {
  try {
    const raw = JSON.parse(storage?.getItem(LAYOUT_KEY) ?? "{}") as Record<string, unknown>;
    const prefs: LayoutPrefs = {};
    if (typeof raw.docsPinned === "boolean") prefs.docsPinned = raw.docsPinned;
    if (typeof raw.analysisShown === "boolean") prefs.analysisShown = raw.analysisShown;
    return prefs;
  } catch {
    return {};
  }
}

export function writePrefs(prefs: LayoutPrefs, storage: Pick<Storage, "setItem"> | undefined = safeStorage()): void {
  try { storage?.setItem(LAYOUT_KEY, JSON.stringify(prefs)); } catch { /* préférence perdue, sans gravité */ }
}
```

- [ ] **Step 4:** test → PASS.
- [ ] **Step 5: Commit** `feat(editor): disposition adaptative (layoutFor) et préférences`

### Task 3: `wordCountOf`, `relativeDate`, `scoreBand`

**Files:** Create `src/editor/docInfo.ts` + `.test.ts`, `src/ui/score.ts` + `.test.ts`

**Interfaces:**
- `wordCountOf(content: JSONContent | null | undefined): number`
- `relativeDate(ts: number, now?: number): string` — « à l'instant », « il y a 5 min », « il y a 3 h », « hier », sinon `dd/mm/yyyy`.
- `type ScoreBand = "low" | "mid" | "notable" | "high"`; `scoreBand(score: number): ScoreBand`; `BAND_LABEL: Record<ScoreBand, string>` = Faible / Modéré / Notable / Élevé.

- [ ] **Step 1: Tests docInfo**

```ts
import { describe, it, expect } from "vitest";
import { wordCountOf, relativeDate } from "./docInfo";

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("wordCountOf", () => {
  it("vide / null", () => {
    expect(wordCountOf(null)).toBe(0);
    expect(wordCountOf({ type: "doc", content: [] })).toBe(0);
  });
  it("paragraphes séparés ne collent pas leurs mots", () => {
    expect(wordCountOf({ type: "doc", content: [p("un deux"), p("trois")] })).toBe(3);
  });
  it("listes, tableaux, images", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [p("a b")] }] },
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [p("c")] }] }] },
        { type: "storedImage", attrs: { imageId: "x" } },
      ],
    };
    expect(wordCountOf(doc)).toBe(3);
  });
  it("apostrophes et ponctuation", () => {
    expect(wordCountOf({ type: "doc", content: [p("L'équipe a fini — enfin !")] })).toBe(4);
  });
});

describe("relativeDate", () => {
  const now = new Date(2026, 9, 9, 12, 0).getTime();
  it("paliers", () => {
    expect(relativeDate(now - 20_000, now)).toBe("à l'instant");
    expect(relativeDate(now - 5 * 60_000, now)).toBe("il y a 5 min");
    expect(relativeDate(now - 3 * 3_600_000, now)).toBe("il y a 3 h");
    expect(relativeDate(new Date(2026, 9, 8, 9, 0).getTime(), now)).toBe("hier");
    expect(relativeDate(new Date(2026, 8, 1).getTime(), now)).toBe("01/09/2026");
  });
});
```

- [ ] **Step 2: Tests score**

```ts
import { describe, it, expect } from "vitest";
import { scoreBand } from "./score";

describe("scoreBand", () => {
  it("seuils 21 / 41 / 61", () => {
    expect([0, 20, 21, 40, 41, 60, 61, 100].map(scoreBand)).toEqual(["low", "low", "mid", "mid", "notable", "notable", "high", "high"]);
  });
});
```

- [ ] **Step 3:** FAIL puis implémentation :

```ts
// docInfo.ts
import type { JSONContent } from "@tiptap/core";

function collect(node: JSONContent, out: string[]): void {
  if (node.type === "text" && node.text) out.push(node.text);
  if (node.type === "hardBreak") out.push(" ");
  node.content?.forEach((c) => collect(c, out));
  if (node.type === "paragraph" || node.type === "heading") out.push(" ");
}

export function wordCountOf(content: JSONContent | null | undefined): number {
  if (!content) return 0;
  const parts: string[] = [];
  collect(content, parts);
  return parts.join("").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

const day = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (day(ts) === day(now)) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  if (day(ts) === day(now) - 86_400_000) return "hier";
  return dateFmt.format(ts);
}
```

(Le palier « il y a N h » ne s'applique qu'au même jour ; un écart de 3 h la veille donne « hier ». Le test utilise 12:00 − 3 h = 09:00 le même jour.)

```ts
// score.ts
export type ScoreBand = "low" | "mid" | "notable" | "high";
export const BAND_LABEL: Record<ScoreBand, string> = { low: "Faible", mid: "Modéré", notable: "Notable", high: "Élevé" };
export const scoreBand = (score: number): ScoreBand => (score < 21 ? "low" : score < 41 ? "mid" : score < 61 ? "notable" : "high");
```

- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(ui): nombre de mots, dates relatives et bandes de score`

### Task 4: Primitives UI, icônes, ScoreGauge

**Files:** Create `src/ui/primitives.tsx`, `src/ui/icons.tsx`, `src/ui/ScoreGauge.tsx`

**Interfaces (produits):**
- `Button({ variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" } & ButtonHTMLAttributes)`
- `IconButton({ label: string; active?: boolean; keepFocus?: boolean } & ButtonHTMLAttributes)` — `aria-label`/`title` = `label`, `aria-pressed` = `active` si défini ; `keepFocus` → `onMouseDown preventDefault` (barre d'outils).
- `Chip({ tone?: "accent" | "neutral" | "outline"; as?: "span" | "button" } & HTMLAttributes)`
- `Card({ className?, children })`
- `Collapsible({ id: string; title: string; count?: number; defaultOpen?: boolean; open?: boolean; onOpenChange?(o: boolean): void; children })` — état ouvert mémorisé sous `textorigin:section:<id>` (try/catch) quand non contrôlé ; en-tête `button` avec `aria-expanded`.
- `Menu({ label: React.ReactNode; buttonClassName?: string; align?: "left" | "right"; disabled?: boolean; children: (close: () => void) => React.ReactNode })` — bouton `aria-haspopup="menu"`, liste `role="menu"`, ferme sur Échap / clic extérieur, flèches haut/bas entre `[role=menuitem]`.
- `MenuItem({ onSelect(): void; children })` — `role="menuitem"`.
- Icônes (`icons.tsx`) : `Icon` props `{ className? }`, composants `ILogo, IDocs, IAnalysis, IPlus, IMore, IUndo, IRedo, IBold, IItalic, IUnderline, ITextColor, IHighlight, IAlignLeft, IBullet, IOrdered, IQuote, ILink, IImage, ITable, ISearch, IChevron, IClose, IPin, IEye, IEyeOff, ISpark`. SVG 20×20 `viewBox="0 0 24 24"`, `fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"`, `aria-hidden`.
- `ScoreGauge({ score: number; size?: "lg" | "md"; caption?: React.ReactNode })` — chiffre `text-score` (ou 32 px en md), `Chip` de bande (`high` → tone accent, autres → fond `bg-band-*`), jauge 4 segments `h-1.5 rounded-full`, segment actif opaque, autres `/30`.

- [ ] **Step 1:** Écrire les trois fichiers (classes : Button primary `bg-accent text-accent-ink hover:brightness-110 disabled:bg-line disabled:text-muted rounded-ctl px-4 h-9 text-[13px] font-semibold` ; secondary `bg-raised border border-line text-ink hover:bg-surface` ; ghost `text-ink hover:bg-raised`. IconButton `h-8 min-w-8 px-1.5 rounded-ctl inline-flex items-center justify-center text-ink hover:bg-surface disabled:opacity-40` + actif `bg-ink/10`. Chip `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold` + accent `bg-accent text-accent-ink`, neutral `bg-line text-ink`, outline `border border-line text-ink`. Card `bg-raised rounded-card shadow-soft border border-line/60`.)
- [ ] **Step 2:** `npx tsc --noEmit` → OK.
- [ ] **Step 3: Commit** `feat(ui): primitives partagées, icônes et jauge de score`

### Task 5: Coquille de l'éditeur, barre du haut, menu d'export

**Files:** Create `src/editor/Shell.tsx` ; Modify `src/editor/EditorApp.tsx`, `src/editor/ExportMenu.tsx`

**Interfaces:**
- Consumes: `layoutFor`, `readPrefs`, `writePrefs` (Task 2) ; primitives (Task 4).
- Produces: `Shell({ layout: Layout; docsOpen: boolean; analysisOpen: boolean; onToggleDocs(): void; onToggleAnalysis(): void; onNewDoc(): void; onCloseDrawers(): void; docs: ReactNode; analysis: ReactNode; children: ReactNode })`.
- Produces: hook `useLayout(): { layout; docsOpen; analysisOpen; toggleDocs(); toggleAnalysis(); closeDrawers(); openAnalysis() }` exporté de `Shell.tsx` — largeur via `window.innerWidth` + écoute `resize` ; `toggleDocs` : si `layout.docs === "pinned"` ou largeur ≥ 1200 → bascule `docsPinned` (writePrefs) ; sinon ouvre/ferme le tiroir. Idem `toggleAnalysis` avec `analysisShown`. `openAnalysis()` : si colonne visible ne fait rien, sinon ouvre le tiroir.

Structure rendue par `Shell` :

```tsx
<div className="h-screen flex gap-2 p-2 bg-canvas font-ui text-ink">
  <nav className="no-print w-14 shrink-0 bg-rail rounded-shell flex flex-col items-center py-3 gap-2 shadow-lift" aria-label="Navigation">
    {/* ILogo en accent, puis IconButton rail (text-white/70 hover:bg-white/10, actif bg-white/15 text-white) : Documents, Analyse, Nouveau */}
  </nav>
  {layout.docs === "pinned" && <aside className="no-print w-[260px] shrink-0 bg-surface rounded-shell overflow-hidden">{docs}</aside>}
  <div className="flex-1 min-w-0 bg-surface rounded-shell flex flex-col overflow-hidden">{children}</div>
  {layout.analysis === "column" && <aside className="no-print w-80 shrink-0 bg-surface rounded-shell overflow-auto">{analysis}</aside>}
  {/* Tiroirs : voile fixed inset-0 bg-black/30 + panneau fixed (gauche après le rail pour docs, droite pour analyse), Échap ferme */}
</div>
```

Le contenu `docs`/`analysis` est le même nœud React en colonne ou en tiroir (pas de double montage simultané).

- [ ] **Step 1:** Écrire `Shell.tsx` (composant + `useLayout`). Échap ferme les tiroirs ; à la fermeture, le focus revient sur le bouton du rail correspondant (refs).
- [ ] **Step 2:** `ExportMenu.tsx` : remplacer le bouton/menu maison par `Menu` (`buttonClassName` primary, libellé `busy ? "Export…" : "Exporter"` + `IChevron`) et deux `MenuItem` « Word (.docx) » / « PDF ». Logique `exportDocx`/`exportPdf` inchangée.
- [ ] **Step 3:** `EditorApp.tsx` :
  - `useLayout()` ; rendre `<Shell … docs={<DocumentList …/>} analysis={<AnalysisPanel …/>}>`.
  - En-tête zone document (`no-print px-6 pt-4 pb-2`) : fil d'Ariane `text-2xs text-muted` « Documents › {title || "Sans titre"} » ; ligne : `input` titre (`text-xl font-semibold bg-transparent rounded-ctl px-2 -mx-2 hover:bg-raised focus:bg-raised outline-none flex-1 min-w-0`), `Menu` « … » (`IMore`) avec « Renommer » (focus + select de l'input) et « Supprimer » (passe par `DocumentList` : voir Task 6, prop `requestDelete`), puce de statut (`Chip` neutral « Enregistré » / « Enregistrement… », accent « Non enregistré · Réessayer » en `as="button"` qui appelle `flush`), `ExportMenu`.
  - Puis `<div className="no-print px-6"><Toolbar …/></div>` et la zone de défilement `main` (`flex-1 overflow-auto px-6 pb-10`) contenant `<div className="sheet-wrap relative">` + `.sheet`.
  - `STATUS_LABEL` ✓/⚠ retirés (texte simple).
- [ ] **Step 4:** `npm run build` → OK ; vérification visuelle (`npm run build` puis charger `dist/` dans Chrome, ouvrir l'éditeur) à 1600 / 1300 / 1000 / 800 px.
- [ ] **Step 5: Commit** `feat(editor): coquille rail + colonnes adaptatives, nouvelle barre du haut`

### Task 6: Documents en colonne / tiroir

**Files:** Modify `src/editor/DocumentList.tsx`, `src/editor/EditorApp.tsx`

**Interfaces:**
- Consumes: `wordCountOf`, `relativeDate` (Task 3).
- Produces: `DocumentList({ currentId; onOpen(doc); onCurrentRenamed(title); beforeAction(); onNew(): void; deleteRequest: number; refreshKey: string })`. Le composant ne gère plus son propre tiroir (c'est le `Shell`). `deleteRequest` (compteur incrémenté par le menu « … ») ouvre la confirmation de suppression du document courant. `refreshKey` (= `current?.id + status`) déclenche `refresh()` quand il change.
- `EditorApp` expose `newDoc()` (crée, ouvre, ferme les tiroirs) réutilisé par le rail et le bouton « + ».

Rendu : en-tête `flex items-center justify-between px-4 pt-4` « Documents » (`text-2xs uppercase tracking-wider text-muted font-semibold`) + `IconButton` « Nouveau document » (`IPlus`) ; champ de recherche (`ISearch`, `bg-raised border border-line rounded-ctl h-9`) filtrant sur le titre (insensible à la casse et aux accents : `normalize("NFD").replace(/\p{M}/gu, "")`) ; section « Récents » (5 premiers de la liste triée, masquée pendant une recherche) puis « Tous les documents ». Ligne : bouton `w-full text-left rounded-ctl px-3 py-2` ; actif `bg-raised shadow-soft` + barre `before:` 3 px accent ; titre `text-[13px] font-medium truncate`, sous-ligne `text-2xs text-muted` « {relativeDate} · {n} mots ». Renommer / Supprimer au survol via `IconButton` ; confirmation en ligne inchangée (bouton « Supprimer » en `Button` primary).

- [ ] **Step 1:** Réécrire le rendu ; garder `refresh`, `run`, `saveRename`, `doDelete`.
- [ ] **Step 2:** `npx tsc --noEmit` + `npx vitest run` → PASS.
- [ ] **Step 3: Commit** `feat(editor): colonne Documents avec recherche, récents et nombre de mots`

### Task 7: Barre d'outils en carte

**Files:** Modify `src/editor/Toolbar.tsx`

Remplacer `Btn` par `IconButton keepFocus` + icônes (`IUndo`, `IRedo`, `IBold`, `IItalic`, `IUnderline`, `ITextColor`, `IHighlight`, `IBullet`, `IOrdered`, `IQuote`, `ILink`, `IImage`, `ITable`). Conteneur : `role="toolbar"` `flex flex-wrap items-center gap-0.5 px-2 py-1 bg-raised border border-line rounded-card shadow-soft`. `Sep` : `w-px h-5 bg-line mx-1`. Les `select` gardent leur logique avec `h-8 text-[13px] bg-transparent rounded-ctl hover:bg-surface px-1.5`. Popovers (couleurs, lien) : `bg-raised border border-line rounded-card shadow-lift p-2`. Bouton OK du lien : `Button size="sm"`. Les boutons de tableau gardent leurs libellés texte courts. Couleurs de texte et surlignages proposés à l'utilisateur : inchangés (ce sont des couleurs de document).

- [ ] **Step 1:** Réécrire. **Step 2:** `npx tsc --noEmit`. **Step 3: Commit** `feat(editor): barre d'outils en carte et icônes`

### Task 8: Panneau d'analyse, infobulle, toasts

**Files:** Modify `src/editor/AnalysisPanel.tsx`, `src/editor/MarkerTooltip.tsx`, `src/editor/Toast.tsx`, `src/editor/EditorApp.tsx`

**Interfaces:**
- Consumes: `ScoreGauge`, `Collapsible`, `Chip`, `Card`, `scoreBand`.
- Produces (pour Task 11) :
  - `AnalysisPanel` props ajoutées : `highlighted: GlobalSignal["id"] | null; onHighlight(id | null): void; focus: { nonce: number; detectionIds: string[]; signals: GlobalSignal["id"][] } | null`. L'état `highlighted` remonte dans `EditorApp`.
  - À chaque nouveau `focus.nonce` : ouvrir la section `Collapsible` de la famille de la première détection (sections contrôlées), `setOpenId(detectionIds[0])`, `document.getElementById("to-det-" + id)?.scrollIntoView({ block: "nearest", behavior: "smooth" })` après rendu, `reveal(editor, d)` ; si seulement des signaux : ouvrir « Signaux globaux » et défiler vers `to-sig-<id>`.
  - Export `signalRangesInBlock(editor, signal, sourceText, from, to)` **non** nécessaire : les plages de bloc sont calculées dans Task 10.
  - `scoreColor` supprimé (remplacé par `ScoreGauge`) ; `CATEGORY_LABEL`, `WARNING`, `applySuggestion` conservés.

Rendu du panneau (`p-4 space-y-3`) :
1. En-tête « Analyse » + `IconButton` œil (`IEye`/`IEyeOff`) « Masquer les marqueurs » / « Afficher les marqueurs » (remplace le gros bouton).
2. `Card p-4` : `ScoreGauge score caption="{n} mots · confiance {x}{ · mise à jour…}"` ; états vide / erreur dans la même carte.
3. `Collapsible id="families" title="Familles"` : barres `h-1.5 bg-line rounded-full` + remplissage `bg-ink/70`.
4. `Collapsible id="signals" title="Signaux globaux" count={alertes}` : cartes `rounded-card border border-line p-2.5` ; alerte → `border-accent/50 bg-accent/5` ; bouton « Surligner les phrases » en `Chip as="button" tone="outline"`. `id="to-sig-<id>"`.
5. `Collapsible id="invisibles" …` (si total > 0) : alerte suspects `rounded-card border border-accent/50 bg-accent/10 shadow-[0_0_12px_rgb(var(--to-accent)/.25)]` ; bouton nettoyage `Button variant="secondary"`.
6. Pour chaque famille de marqueurs : `Collapsible id="fam-<family>" title={FAMILY_LABEL} count={n}` ; détection = `li id="to-det-<id>"` `rounded-card bg-raised border border-line p-2.5` ; pastille de niveau `w-2 h-2 rounded-full bg-accent` avec opacité `/30`, `/60`, `/100` selon `markerLevel` ; suggestions en `Chip as="button" tone="accent"` (« Supprimer » en outline).
7. Avertissement : `rounded-card bg-raised/70 border border-line p-3 text-2xs text-muted` `role="note"`.

Infobulle : `bg-[#fbfaf7] text-[#1d1d1b] border border-[#d6d2ca] rounded-card shadow-lift p-3 text-2xs` (valeurs claires épinglées), catégorie en `text-[#b8411d] font-semibold`.

Toasts : `bg-raised text-ink border border-line rounded-card shadow-lift px-4 py-2.5 text-[13px]` ; warning : `border-accent/60 shadow-[0_0_16px_rgb(var(--to-accent)/.35)]` ; error : `bg-accent text-accent-ink border-accent`.

- [ ] **Step 1:** Réécrire les trois composants, remonter `highlighted` dans `EditorApp`.
- [ ] **Step 2:** `npx tsc --noEmit` + `npx vitest run` (hors palette) → PASS.
- [ ] **Step 3: Commit** `feat(editor): panneau d'analyse à sections, jauge de score, infobulle et toasts restylés`

---

## Phase 2 — Mode sombre et popup

### Task 9: Jetons sombres, contrastes, popup, garde de palette

**Files:** Create `src/ui/contrast.ts`, `src/ui/contrast.test.ts` ; Modify `src/ui/tokens.css`, `src/popup/index.tsx` ; Add `src/ui/palette.test.ts` (Task 1)

**Interfaces:** `contrastRatio(a: string, b: string): number` (hex `#rrggbb`) ; `TOKENS: Record<"light" | "dark", Record<string, string>>` (hex, source de vérité des paires testées, recopiée de `tokens.css`).

- [ ] **Step 1: Test de contraste**

```ts
import { describe, it, expect } from "vitest";
import { contrastRatio, TOKENS } from "./contrast";

describe("contrastes des jetons", () => {
  it("référence WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  for (const theme of ["light", "dark"] as const) {
    const t = TOKENS[theme];
    it(`${theme} : texte principal ≥ 4.5 sur surface et raised`, () => {
      expect(contrastRatio(t.ink, t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.ink, t.raised)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme} : texte secondaire ≥ 4.5 sur surface`, () => {
      expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme} : texte sur accent ≥ 3 (gras ≥ 13 px)`, () => {
      expect(contrastRatio(t.accentInk, t.accent)).toBeGreaterThanOrEqual(3);
    });
  }
});
```

- [ ] **Step 2:** FAIL, puis `contrast.ts` :

```ts
export const TOKENS = {
  light: { surface: "#e4e1db", raised: "#ebe8e2", ink: "#1d1d1b", muted: "#6b665e", accent: "#df5830", accentInk: "#ffffff" },
  dark: { surface: "#232321", raised: "#2c2c2a", ink: "#ece9e3", muted: "#9d988f", accent: "#e8683f", accentInk: "#ffffff" },
} as const;

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
```

Si une paire échoue : ajuster le jeton (dans `contrast.ts` **et** `tokens.css`), jamais le seuil. Pistes : `muted` clair → `#5f5a52` ; accent sombre trop clair pour le blanc → `#d9582f`.

- [ ] **Step 3: Jetons sombres** — ajouter à `tokens.css` :

```css
@media (prefers-color-scheme: dark) {
  :root {
    --to-canvas: 21 21 20;
    --to-surface: 35 35 33;
    --to-raised: 44 44 42;
    --to-line: 58 58 55;
    --to-rail: 11 11 11;
    --to-ink: 236 233 227;
    --to-muted: 157 152 143;
    --to-accent: 232 104 63;
    --to-band-low: 127 143 123;
    --to-band-mid: 90 87 81;
    --to-band-notable: 168 100 74;
    --to-shadow-k: 3;
    color-scheme: dark;
  }
}
```

(`--to-sheet*` non redéfinis : la feuille reste claire.)

- [ ] **Step 4: Popup** — mêmes logique et textes ; rendu : conteneur `w-80 min-h-[320px] bg-canvas p-3 font-ui text-ink` ; en-tête `ILogo` accent + « TextOrigin AI » `text-[15px] font-semibold` ; `Card p-3 space-y-2` avec `Button` primary pleine largeur « Analyser la sélection » (libellé `aria-label` inchangé) et `Button` secondary « Ouvrir dans l'éditeur » ; erreur dans `rounded-card border border-accent/50 bg-accent/10 p-2 text-2xs` `role="alert"` ; résultat : `Card p-4` avec `ScoreGauge size="md"`, lignes « Marqueurs détectés », « Confiance », invisibles (suspects en `text-accent font-medium`), note `text-2xs text-muted`. Supprimer `scoreColor` local et toutes les classes `dark:`. Le popup n'importe que `src/ui/*` (pas d'éditeur) → `check-bundle` reste vert.
- [ ] **Step 5:** `npx vitest run` (palette inclus) → PASS ; `npm run build` → OK + « Contrôle du bundle OK ».
- [ ] **Step 6: Commit** `feat(ui): mode sombre système, contrastes vérifiés, popup restylé`

---

## Phase 3 — Étiquettes en marge

### Task 10: `blockAnnotations` et `stackLabels`

**Files:** Create `src/editor/marginLabels.ts`, `src/editor/marginLabels.test.ts`

**Interfaces:**
- Consumes: `TextIndex`, `mapRange` (`src/analysis/positions.ts`) ; `markerLevel`, `MarkerLevel` (`extensions/AiMarkers.ts`).
- Produces:
  - `interface BlockAnnotation { pos: number; markerCount: number; maxLevel: MarkerLevel | null; detectionIds: string[]; signals: GlobalSignal["id"][]; signalRanges: Array<{ from: number; to: number }> }`
  - `blockAnnotations(doc: PMNode, result: Pick<AnalysisResult, "detections" | "signals">, index: TextIndex): BlockAnnotation[]` — triées par `pos` ; `pos` = position du nœud textblock (avant son ouverture).
  - `SIGNAL_SHORT: Record<GlobalSignal["id"], string>` = `{ "connector-density": "CONNECTEURS", rhythm: "RYTHME", "paragraph-uniformity": "PARAGRAPHES", "topic-sentences": "PHRASES D'ATTAQUE" }`
  - `stackLabels(items: Array<{ top: number; height: number }>, gap: number): number[]`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { baseExtensions } from "./schema";
import { buildTextIndex } from "../analysis/positions";
import { blockAnnotations, stackLabels } from "./marginLabels";
import type { Detection, GlobalSignal } from "../types/types";

const schema = getSchema(baseExtensions());
const docOf = (content: JSONContent[]) => schema.nodeFromJSON({ type: "doc", content });
const p = (text: string): JSONContent => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] });

function det(text: string, full: string, score = 50, id = text): Detection {
  const start = full.indexOf(text);
  return { id, type: "lexical", category: "lexical-marker", text, start, end: start + text.length, score, confidence: 0.7, explanation: "", suggestions: [] };
}
function sig(id: GlobalSignal["id"], status: GlobalSignal["status"], ranges: Array<{ start: number; end: number }>): GlobalSignal {
  return { id, family: "connectors", label: id, value: 0, display: "", score: 0, status, explanation: "", ranges };
}

function run(content: JSONContent[], detections: (full: string) => Detection[], signals: (full: string) => GlobalSignal[] = () => []) {
  const doc = docOf(content);
  const index = buildTextIndex(doc);
  return blockAnnotations(doc, { detections: detections(index.text), signals: signals(index.text) }, index);
}

describe("blockAnnotations", () => {
  it("regroupe les marqueurs par paragraphe et ignore les paragraphes vides de marqueurs", () => {
    const out = run([p("Il est essentiel de souligner"), p("Rien ici"), p("Une dynamique remarquable")],
      (f) => [det("essentiel", f, 30), det("souligner", f, 80), det("remarquable", f, 50)]);
    expect(out.map((a) => [a.markerCount, a.maxLevel])).toEqual([[2, "high"], [1, "medium"]]);
  });
  it("éléments de liste et cellules de tableau comptent séparément", () => {
    const li = (t: string): JSONContent => ({ type: "listItem", content: [p(t)] });
    const cell = (t: string): JSONContent => ({ type: "tableCell", content: [p(t)] });
    const out = run([
      { type: "bulletList", content: [li("alpha marqueur"), li("beta marqueur")] },
      { type: "table", content: [{ type: "tableRow", content: [cell("gamma marqueur"), cell("delta")] }] },
    ], (f) => ["alpha", "beta", "gamma"].map((w) => det(w, f)));
    expect(out).toHaveLength(3);
    expect(out.every((a) => a.markerCount === 1)).toBe(true);
  });
  it("signaux : alert inclus, ok/insufficient exclus", () => {
    const out = run([p("Par ailleurs, ceci."), p("En outre, cela.")], () => [], (f) => [
      sig("connector-density", "alert", [{ start: 0, end: f.indexOf("\n") }]),
      sig("rhythm", "ok", [{ start: f.indexOf("En"), end: f.length }]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].signals).toEqual(["connector-density"]);
    expect(out[0].markerCount).toBe(0);
    expect(out[0].signalRanges).toHaveLength(1);
  });
  it("un signal présent deux fois dans un bloc n'est listé qu'une fois", () => {
    const out = run([p("Un. Deux.")], () => [], () => [sig("rhythm", "alert", [{ start: 0, end: 3 }, { start: 4, end: 9 }])]);
    expect(out[0].signals).toEqual(["rhythm"]);
    expect(out[0].signalRanges).toHaveLength(2);
  });
  it("marqueur à cheval : compté dans le bloc de départ uniquement", () => {
    const out = run([p("début fin"), p("suite")], (f) => [{ ...det("fin", f), end: f.indexOf("suite") + 5 }]);
    expect(out).toHaveLength(1);
    expect(out[0].markerCount).toBe(1);
  });
  it("document vide → []", () => {
    expect(run([p("")], () => [])).toEqual([]);
  });
  it("détection hors texte ignorée sans erreur", () => {
    const out = run([p("court")], () => [{ ...det("court", "court"), start: 50, end: 60 }]);
    expect(out).toEqual([]);
  });
});

describe("stackLabels", () => {
  it("laisse en place des étiquettes espacées", () => {
    expect(stackLabels([{ top: 0, height: 20 }, { top: 100, height: 20 }], 4)).toEqual([0, 100]);
  });
  it("décale celles qui se chevauchent, en cascade", () => {
    expect(stackLabels([{ top: 0, height: 20 }, { top: 10, height: 20 }, { top: 12, height: 20 }], 4)).toEqual([0, 24, 48]);
  });
  it("liste vide", () => {
    expect(stackLabels([], 4)).toEqual([]);
  });
});
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Implémentation**

```ts
import type { Node as PMNode } from "@tiptap/pm/model";
import type { AnalysisResult, GlobalSignal } from "../types/types";
import { mapRange, type TextIndex } from "../analysis/positions";
import { markerLevel, type MarkerLevel } from "./extensions/AiMarkers";

export interface BlockAnnotation {
  pos: number;
  markerCount: number;
  maxLevel: MarkerLevel | null;
  detectionIds: string[];
  signals: GlobalSignal["id"][];
  signalRanges: Array<{ from: number; to: number }>;
}

export const SIGNAL_SHORT: Record<GlobalSignal["id"], string> = {
  "connector-density": "CONNECTEURS",
  rhythm: "RYTHME",
  "paragraph-uniformity": "PARAGRAPHES",
  "topic-sentences": "PHRASES D'ATTAQUE",
};

const RANK: Record<MarkerLevel, number> = { low: 0, medium: 1, high: 2 };

/** Blocs textuels (début, fin) dans l'ordre du document. */
function textblocks(doc: PMNode): Array<{ pos: number; end: number }> {
  const out: Array<{ pos: number; end: number }> = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) { out.push({ pos, end: pos + node.nodeSize }); return false; }
    return true;
  });
  return out;
}

function blockOf(blocks: Array<{ pos: number; end: number }>, at: number) {
  let lo = 0, hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (at < blocks[mid].pos) hi = mid - 1;
    else if (at >= blocks[mid].end) lo = mid + 1;
    else return blocks[mid];
  }
  return undefined;
}

/** Ce que chaque bloc contient (marqueurs, signaux en alerte) ; blocs vides omis. */
export function blockAnnotations(
  doc: PMNode,
  result: Pick<AnalysisResult, "detections" | "signals">,
  index: TextIndex,
): BlockAnnotation[] {
  const blocks = textblocks(doc);
  const byPos = new Map<number, BlockAnnotation>();
  const entry = (pos: number) => {
    let a = byPos.get(pos);
    if (!a) byPos.set(pos, (a = { pos, markerCount: 0, maxLevel: null, detectionIds: [], signals: [], signalRanges: [] }));
    return a;
  };

  for (const d of result.detections) {
    const r = mapRange(index, d.start, d.end);
    const block = r && blockOf(blocks, r.from);
    if (!block) continue;
    const a = entry(block.pos);
    a.markerCount++;
    a.detectionIds.push(d.id);
    const level = markerLevel(d.score);
    if (!a.maxLevel || RANK[level] > RANK[a.maxLevel]) a.maxLevel = level;
  }

  for (const s of result.signals) {
    if (s.status !== "alert") continue;
    for (const range of s.ranges) {
      const r = mapRange(index, range.start, range.end);
      const block = r && blockOf(blocks, r.from);
      if (!r || !block) continue;
      const a = entry(block.pos);
      if (!a.signals.includes(s.id)) a.signals.push(s.id);
      a.signalRanges.push(r);
    }
  }

  return [...byPos.values()].sort((x, y) => x.pos - y.pos);
}

/** Positions verticales sans chevauchement (ordre conservé, décalage vers le bas). */
export function stackLabels(items: Array<{ top: number; height: number }>, gap: number): number[] {
  const out: number[] = [];
  let floor = -Infinity;
  for (const { top, height } of items) {
    const y = Math.max(top, floor);
    out.push(y);
    floor = y + height + gap;
  }
  return out;
}
```

- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(editor): regroupement des marqueurs par bloc pour les étiquettes en marge`

### Task 11: Calque `MarginLabels` et interactions

**Files:** Create `src/editor/MarginLabels.tsx` ; Modify `src/editor/EditorApp.tsx`, `src/editor/editor.css`

**Interfaces:**
- Consumes: `blockAnnotations`, `stackLabels`, `SIGNAL_SHORT` (Task 10) ; `markersVisible` (AiMarkers) ; `setSignalHighlight` (SignalHighlights) ; `AnalysisPanel` props `focus`, `highlighted` (Task 8) ; `Layout["labels"]` (Task 2).
- Produces: `MarginLabels({ editor: Editor | null; result: AnalysisResult | null; sourceText: string; mode: "gutter" | "inset"; visible: boolean; highlighted: GlobalSignal["id"] | null; onFocus(a: BlockAnnotation): void })`.

Comportement :
- `annotations = useMemo` : si `!editor || !result` → `[]` ; `index = buildTextIndex(editor.state.doc)` ; si `index.text !== sourceText` → garder les annotations précédentes (ref) ; sinon `blockAnnotations(…)`.
- Mesure : `useLayoutEffect` + `requestAnimationFrame` ; pour chaque annotation, `editor.view.nodeDOM(a.pos) as HTMLElement | null` ; `top = rect.top - wrap.top`, `height = rect.height` ; `stackLabels(items.map(i => ({ top: i.top, height: 22 })), 4)`. Les positions sont re-mappées (`tr.mapping`) quand le document change entre deux analyses : écouter `editor.on("update")` → recalcul de `pos` via `editor.state.doc` n'est pas nécessaire si l'on re-mesure par `nodeDOM` des positions mappées — conserver `pos` mappé dans un ref : à chaque `transaction` avec `docChanged`, `pos = tr.mapping.map(pos)`.
- Re-mesure sur : changement d'annotations, `editor.on("transaction")`, `ResizeObserver` sur `.sheet`, événement `load` capturé sur les `img` de la feuille.
- Rendu : conteneur `no-print absolute inset-y-0 pointer-events-none` ; `mode="gutter"` → `right-full mr-3 w-[104px]` (à gauche de la feuille) ; `mode="inset"` → `left-2 w-[84px]` (dans la marge de 2,5 cm). Pour chaque annotation : barre `absolute w-[3px] rounded-full` à `left: calc(100% + 12px)` en gutter / `left: 92px` en inset, sur toute la hauteur du bloc ; bouton étiquette `pointer-events-auto absolute right-0 text-[9px] font-bold tracking-wide rounded-md px-1.5 py-1` :
  - marqueurs : `bg-accent text-accent-ink` avec opacité selon `maxLevel` (`low` → `bg-accent/45`, `medium` → `bg-accent/75`, `high` → `bg-accent`) ; texte « N MARQUEUR(S) » ; si `signals.length` → pastille `w-1.5 h-1.5 rounded-full bg-rail` ;
  - signaux seuls : `bg-rail text-white` ; texte `SIGNAL_SHORT[signals[0]]` + (`signals.length > 1` → ` +${n-1}`).
  - `aria-label` : « 3 marqueurs dans ce paragraphe » / « Signal : connecteurs ».
- `visible === false` (marqueurs masqués) → rien.
- Survol (`onMouseEnter`) : ajouter `to-marker--focus` aux éléments `[data-detection-id="<id>"]` du bloc ; si signaux → `editor.view.dispatch(setSignalHighlight(state, a.signalRanges))`. `onMouseLeave` : retirer la classe ; si signaux → réappliquer la surbrillance du panneau : `setSignalHighlight(state, highlighted ? <plages du signal highlighted mappées> : null)` (plages via `mapRanges(buildTextIndex(doc), signal.ranges)` si `index.text === sourceText`).
- Clic : `onFocus(a)` → `EditorApp` incrémente `focus.nonce` avec `{ detectionIds, signals }` et appelle `openAnalysis()`.
- `EditorApp` : `visible` suivi via un état remonté depuis le bouton œil du panneau (prop `onVisibleChange` ajoutée à `AnalysisPanel`) ; `<div className="sheet-wrap relative mx-auto w-fit">` contient `MarginLabels` + `.sheet`.

CSS (`editor.css`) : `.sheet-wrap { margin: 24px auto; } .sheet { margin: 0; }` ; en `mode="inset"` aucune règle de plus (la marge de 2,5 cm de la feuille accueille les étiquettes). `@media (max-width: 959px) { .sheet { width: 100%; max-width: var(--sheet-width); } }`.

- [ ] **Step 1:** Écrire `MarginLabels.tsx` ; brancher dans `EditorApp` et `AnalysisPanel` (`onVisibleChange`).
- [ ] **Step 2:** `npx tsc --noEmit` ; `npx vitest run` → tout PASS.
- [ ] **Step 3:** Vérif manuelle : coller un texte « IA » de 4 paragraphes + liste + tableau ; étiquettes alignées, survol, clic → panneau, frappe, défilement, redimensionnement 1600 → 1000 px (passage gouttière → marge), impression sans étiquettes.
- [ ] **Step 4: Commit** `feat(editor): étiquettes d'analyse en marge par paragraphe`

### Task 12: Guide de test manuel et vérification finale

**Files:** Modify `extension/e2e-manual-test.md`

- [ ] **Step 1:** Ajouter une section « Refonte UI (0.3) » avec les cas : 4 largeurs (1600 / 1300 / 1000 / 800) ; épingler/désépingler + rechargement (préférence conservée) ; clair et sombre (réglage système) ; feuille claire en sombre ; étiquettes (frappe, défilement, images, tableaux, listes, chevauchement sur paragraphes courts) ; survol/clic d'étiquette ; masquer les marqueurs masque les étiquettes ; impression/PDF en clair **et** en sombre : fond blanc, ni rail, ni étiquettes, ni barres ; export .docx identique à avant ; popup clair/sombre ; clavier : Tab visible partout (anneau orange), Échap ferme tiroirs et menus, flèches dans les menus.
- [ ] **Step 2:** `npx vitest run` → tout PASS ; `npm run build` → OK + « Contrôle du bundle OK ».
- [ ] **Step 3: Commit** `docs: guide de test manuel de la refonte UI`
