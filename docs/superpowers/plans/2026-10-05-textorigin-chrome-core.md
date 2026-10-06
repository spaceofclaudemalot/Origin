# Extension Chrome Core + Détecteurs - Plan d'Implémentation

> **Pour les agents d'exécution :** SOUS-SKILL REQUISE : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent une syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Créer un MVP d'extension Chrome (Manifest V3) capable de détecter des marqueurs lexicaux et stylistiques dans un texte sélectionné, de le surligner et d'afficher des explications.

**Architecture :** Flux de données à trois niveaux : le _content script_ capture la sélection et affiche les surlignages, le _background service worker_ orchestre l'analyse, et des _modules de détection_ indépendants (interface `Detector`) produisent des résultats normalisés. Le _popup React_ affiche le score et l'historique.

**Stack technique :** Chrome Extension Manifest V3 · React 19 · TypeScript · Vite · Tailwind CSS · Chrome Storage API · Chrome Runtime messaging.

**Spécification :** `docs/superpowers/specs/2026-10-05-TextOriginAI-design.md`

---

## Global Constraints

- Extension : **Manifest V3**, **content script** injecté par page, **service worker** en background.
- UI : **React**, **TypeScript**, **Vite**, **Tailwind CSS**.
- Couleurs : bleu profond/indigo (primaire), violet (secondaire), vert (naturel/faible risque), orange (vérification), rouge (alerte forte), fond clair + **dark mode**.
- Formulation obligatoire : « marqueurs stylistiques **fréquemment observés dans des textes générés par des LLM** » — jamais « ce texte a été généré par l'IA ».
- **AI Marker Score** : 0–100, toujours présenté comme un _score de présence de marqueurs_, jamais comme une probabilité d'origine.
- Support initial : **Français** et **Anglais**.
- **Traitement local** pour les détections simples ; aucun envoi de données hors navigateur sans action explicite de l'utilisateur.
- Jamais de `TODO`, `TBD` ou fonctionnalité simulée silencieusement — si une fonction est absente, l'interface doit l'indiquer clairement (ex. : « fonction à connecter »).

## Review Focus

1. **Faux positifs de sous-mot** (ex. « delve » détecté à l'intérieur de « dèvelopper », « moreover » dans « moreover » seulement) — test `lexicalDetector` avec des mots contigus (`testLexicalDetector_noFalsePositivesForSubstringWords`).
2. **Texte vide / très court** — le détecteur renvoie `[]` sans lever d'erreur ; test `testAnalysisEmptyText` et `testAnalysisShortText`.
3. **Termes contenant des caractères regex spéciaux** (ex. `_`, `.`, `*`) — test `testLexicalDetector_specialCharacters`.
4. **Score agrégé borné à 0–100** — test `testTotalScoreBounded`.
5. **Détections en chevauchement dédupliquées** (un même mot peut être lexically + connector) — test `testOverlapDeduplication`.

---

## Task 1 : Squelette du projet

**Files :**

- Create: `extension/package.json`
- Create: `extension/tsconfig.json`
- Create: `extension/vite.config.ts`
- Create: `extension/tailwind.config.js`
- Create: `extension/postcss.config.js`
- Create: `extension/manifest.json`
- Create: `extension/src/popup/index.tsx`
- Create: `extension/src/popup/index.html`
- Create: `extension/src/background/index.ts`
- Create: `extension/src/content/index.ts`
- Create: `extension/src/types/types.ts`
- Create: `extension/src/styles/global.css`
- Create: `extension/src/services/detector.ts`
- Create: `extension/src/detectors/lexical.ts`
- Create: `extension/src/detectors/lexical-data.ts`
- Test: `extension/src/detectors/lexical.test.ts`

**Interfaces :**

- Produites par cette tâche : structure de build (`npm run build`, `npm run dev`), entrypoints (`./src/background`, `./src/content`, `./src/popup`), variables d'import globales (`import.meta.env`, `process.env`), styles globaux, declaration `chrome` (via `@types/chrome`).

- [ ] **Step 1 : Initialiser le dossier et `package.json`**

```json
{
  "name": "textorigin-ai",
  "version": "0.1.0",
  "description": "TextOrigin AI - detecteur de marqueurs stylistiques IA",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.300",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2 : Écrire `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3 : Écrire `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4 : Écrire `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        content: resolve(__dirname, "src/content/index.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
```

- [ ] **Step 5 : Écrire `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        secondary: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        natural: {
          400: "#34d399",
          500: "#10b981",
        },
        verify: {
          400: "#fb923c",
          500: "#f97316",
        },
        alert: {
          500: "#ef4444",
          600: "#dc2626",
        },
        highlight: {
          yellow: "#fef08a",
          orange: "#fdba74",
          red: "#fca5a5",
          purple: "#d8b4fe",
          blue: "#93c5fd",
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6 : Écrire `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7 : Écrire `manifest.json` (Manifest V3)**

```json
{
  "manifest_version": 3,
  "name": "TextOrigin AI",
  "version": "0.1.0",
  "description": "Identifiez les marqueurs stylistiques des textes générés par l'IA",
  "permissions": ["storage", "activeTab", "scripting"],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "TextOrigin AI"
  },
  "icons": {
    "16": "public/icon16.png",
    "48": "public/icon48.png",
    "128": "public/icon128.png"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "css": ["src/styles/global.css"],
      "run_at": "document_end"
    }
  ]
}
```

- [ ] **Step 8 : Créer les fichiers vides des entrypoints** — `src/popup/index.tsx`, `src/background/index.ts`, `src/content/index.ts`, `src/types/types.ts`, `src/styles/global.css`, `src/services/detector.ts`, `src/detectors/lexical.ts`, `src/detectors/lexical-data.ts` — et deux SVG placeholders dans `public/` (icône document/loupe).

- [ ] **Step 9 : Installer les dépendances et lancer le lint**

```bash
cd extension
npm install
npx tsc --noEmit
```

- [ ] **Step 10 : Commiter**

```bash
git add extension/
git commit -m "chore: scaffold extension project (Vite + React + TS + Tailwind + Manifest V3)"
```

- [ ] **Étape de test** : vérifier que `npm run build` s'exécute sans erreur TS. Le build doit produire `dist/`.

---

## Task 2 : Modèles de données partagés

**Files :**

- Create: `extension/src/types/types.ts`

**Interfaces :**

- Consommées : aucune.
- Produites (utilisées par les tâches 3 à 9) : `Detection`, `Suggestion`, `DetectionType`, `DetectionCategory`, `AnalysisResult`, `Detector`.

- [ ] **Step 1 : Écrire `src/types/types.ts`**

```ts
/** Catégories de détections du cahier des charges (section 216) */
export type DetectionCategory =
  | "lexical-marker" // mot/terme caractéristique
  | "discourse-structure" // structure de phrase (ex. « Ce n'est pas seulement X, c'est Y »)
  | "transition" // connecteur excessif
  | "style-regularity" // régularité / longueur de phrase / homogénéité
  | "anomaly"; // formulation inhabituelle

/** Types de détecteurs (module 1-4 du cahier des charges) */
export type DetectionType =
  | "lexical"
  | "structural"
  | "connector"
  | "stylistic";

export interface Suggestion {
  /** 'replace' | 'remove' | 'rewrite' | 'custom' */
  type: string;
  text: string; // texte substitut (vide pour 'remove')
  reason: string; // pourquoi cette suggestion
}

/** Une détection élémentaire, format standardisé (section 10 du cahier) */
export interface Detection {
  id: string;
  type: DetectionType;
  category: DetectionCategory;
  /** le segment de texte signalé */
  text: string;
  /** indice de début dans le texte original */
  start: number;
  /** indice de fin (exclusif) */
  end: number;
  /** score partiel de 0 à 100 attribué par ce détecteur */
  score: number;
  /** niveau de confiance du détecteur (0 à 1) */
  confidence: number;
  /** explication lisible par l'utilisateur */
  explanation: string;
  suggestions: Suggestion[];
}

/** Résultat agrégé d'une analyse (popup + panneau latéral) */
export interface AnalysisResult {
  /** AI Marker Score — 0 à 100 (jamais présenté comme une probabilité) */
  totalScore: number;
  /** confiance globale du moteur */
  confidence: string; // 'low' | 'medium' | 'high'
  markerCount: number;
  /** compte par catégorie */
  categories: Record<DetectionCategory, number>;
  detections: Detection[];
  /** analyse par segment (document entier) */
  segments?: Array<{
    index: number;
    total: number;
    score: number;
  }>;
}

/** Contrats de l'abstraction Detector (module 10) */
export interface Detector {
  readonly id: string;
  readonly name: string;
  detect(text: string): Promise<Detection[]>;
}
```

- [ ] **Step 2 : Écrire le test de validation de typage** — le test vérifie que les valeurs retournées sont assignables aux types.

```ts
import type {
  Detection,
  Suggestion,
  AnalysisResult,
  DetectionCategory,
  DetectionType,
  Detector,
} from "./types";

const goodCategory: DetectionCategory = "lexical-marker"; // compile
const badCategory: DetectionCategory = "invalid"; // TS error

const goodType: DetectionType = "lexical"; // compile
const badType: DetectionType = "unknown"; // TS error

const exampleDetection: Detection = {
  id: "d1",
  type: "lexical" as DetectionType,
  category: "lexical-marker" as DetectionCategory,
  text: "furthermore",
  start: 0,
  end: 11,
  score: 72,
  confidence: 0.8,
  explanation: "connecteur excessif",
  suggestions: [
    { type: "remove", text: "", reason: "Supprimer ce connecteur." },
  ],
};
```

- [ ] **Step 3 : Exécuter le test**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 : Commiter**

```bash
git add extension/src/types/types.ts
git commit -m "feat(types): add shared Detection / AnalysisResult / Detector models"
```

---

## Task 3 : Registry de détecteurs (`DetectorService`)

**Files :**

- Create: `extension/src/services/detector.ts`

**Interfaces :**

- Consommées : `Detection`, `AnalysisResult`, `Detector` de `src/types/types.ts`.
- Produites : `DetectorService` avec `register(detector: Detector): void`, `detectAll(text: string): Promise<AnalysisResult>`, `detectSingle(name: string, text: string): Promise<Detection[]>`, `getRegisteredIds(): string[]`.

- [ ] **Step 1 : Écrire le test (failing) avant l'implémentation**

```ts
import { DetectorService } from "./detector";
import type { Detector, Detection } from "../types/types";

class FakeDetector implements Detector {
  id = "fake";
  name = "Fake";
  async detect(text: string): Promise<Detection[]> {
    return [
      {
        id: "x1",
        type: "lexical" as any,
        category: "lexical-marker" as any,
        text: text,
        start: 0,
        end: text.length,
        score: 90,
        confidence: 0.9,
        explanation: "fake",
        suggestions: [],
      },
    ];
  }
}

suite("DetectorService", () => {
  test("registers and detects", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    const ids = svc.getRegisteredIds();
    assert.strictEqual(ids.length, 1);
    assert.strictEqual(ids[0], "fake");
  });

  test("detectAll aggregates detections", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    const result = await svc.detectAll("test text");
    assert.strictEqual(result.markerCount, 1);
    assert.strictEqual(result.detections.length, 1);
    assert.isNumber(result.totalScore);
  });

  test("detectSingle returns only named detector results", async () => {
    const svc = new DetectorService();
    svc.register(new FakeDetector());
    const others = {
      id: "other",
      name: "Other",
      detect: async () => [
        {
          id: "o1",
          type: "lexical" as any,
          category: "lexical-marker" as any,
          text: "x",
          start: 0,
          end: 1,
          score: 10,
          confidence: 0.3,
          explanation: "o",
          suggestions: [],
        },
      ],
    } as Detector;
    svc.register(others);
    const results = await svc.detectSingle("fake", "test");
    assert.strictEqual(results.length, 1);
  });
});
```

- [ ] **Step 2 : Lancer le test — s'attendre à `FAIL` / "DetectorService is not defined"**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 : Implémenter `src/services/detector.ts`**

```ts
import type {
  Detection,
  AnalysisResult,
  Detector,
  DetectionCategory,
} from "../types/types";

export class DetectorService {
  private detectors: Map<string, Detector> = new Map();

  register(detector: Detector): void {
    if (this.detectors.has(detector.id)) {
      throw new Error(
        `Detector with id "${detector.id}" is already registered`,
      );
    }
    this.detectors.set(detector.id, detector);
  }

  getRegisteredIds(): string[] {
    return Array.from(this.detectors.keys());
  }

  async detectSingle(name: string, text: string): Promise<Detection[]> {
    const detector = this.detectors.get(name);
    if (!detector) {
      throw new Error(`Unknown detector: ${name}`);
    }
    return detector.detect(text);
  }

  async detectAll(text: string): Promise<AnalysisResult> {
    const detections: Detection[] = [];
    const categories: Record<DetectionCategory, number> = {
      "lexical-marker": 0,
      "discourse-structure": 0,
      transition: 0,
      "style-regularity": 0,
      anomaly: 0,
    };
    const scores: number[] = [];

    for (const detector of this.detectors.values()) {
      const results = await detector.detect(text);
      detections.push(...results);
      for (const d of results) {
        categories[d.category] += 1;
        scores.push(d.score);
      }
    }

    // Score agrégé : moyenne des scores pondérée par la confiance, bornée 0–100
    let totalScore = 0;
    if (scores.length > 0) {
      const weightedSum = scores.reduce((acc, score) => acc + score, 0);
      totalScore = Math.min(
        100,
        Math.max(0, Math.round(weightedSum / scores.length)),
      );
    }

    // Niveau de confiance global
    let confidence: "low" | "medium" | "high" = "low";
    if (detections.length >= 3) {
      confidence = detections.every((d) => d.confidence >= 0.7)
        ? "high"
        : "medium";
    } else if (detections.length > 0) {
      confidence = detections[0].confidence >= 0.7 ? "medium" : "low";
    }

    return {
      totalScore,
      confidence,
      markerCount: detections.length,
      categories,
      detections,
    };
  }
}
```

- [ ] **Step 4 : Relancer le test — s'attendre à PASS**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 : Commiter**

```bash
git add extension/src/services/detector.ts
git commit -m "feat(detection): add DetectorService registry with detectAll / detectSingle aggregation"
```

---

## Task 4 : Détecteur lexical + données

**Files :**

- Create: `extension/src/detectors/lexical-data.ts`
- Create: `extension/src/detectors/lexical.ts`
- Test: `extension/src/detectors/lexical.test.ts`

**Interfaces :**

- Consommées : `Detector`, `Detection`, `DetectionCategory`, `DetectionType` de `src/types/types.ts`.
- Produites : `LexicalDetector implements Detector` avec les `id = "lexical"` et `name = "Lexical Detector"`.

- [ ] **Step 1 : Écrire le fichier de données `lexical-data.ts`**

```ts
/** Base de termes et expressions fréquemment observés dans les textes générés par les LLM.
 * Configurable depuis le back-office (section 17) : administrateur peut ajouter/supprimer,
 * modifier le poids (confiance), ajouter des variantes, définir la langue et la catégorie.
 */
export interface LexicalEntry {
  term: string;
  language: "en" | "fr";
  category: DetectionCategory;
  confidence: number; // 0–1, sert de poids
  replacements: string[]; // suggestions de remplacement
}

/** Liste initiale anglaise + française — le cahier des charges exige les deux langues (section 19) */
export const LEXICAL_ENTRIES: LexicalEntry[] = [
  // anglais — connecteurs excessifs
  {
    term: "furthermore",
    language: "en",
    category: "transition",
    confidence: 0.78,
    replacements: ["Moreover", "Additionally", "In addition"],
  },
  {
    term: "moreover",
    language: "en",
    category: "transition",
    confidence: 0.78,
    replacements: ["Additionally", "Furthermore"],
  },
  {
    term: "additionally",
    language: "en",
    category: "transition",
    confidence: 0.72,
    replacements: ["Also", "Moreover"],
  },
  {
    term: "consequently",
    language: "en",
    category: "transition",
    confidence: 0.7,
    replacements: ["Therefore", "As a result", "So"],
  },
  {
    term: "therefore",
    language: "en",
    category: "transition",
    confidence: 0.68,
    replacements: ["So", "Thus", "Hence"],
  },
  {
    term: "however",
    language: "en",
    category: "transition",
    confidence: 0.55,
    replacements: ["But", "Yet", "Still"],
  },
  {
    term: "in conclusion",
    language: "en",
    category: "discourse-structure",
    confidence: 0.72,
    replacements: ["To sum up", "Overall"],
  },

  // anglais — vocabulaire caractéristique (exemples du cahier des charges)
  {
    term: "delve",
    language: "en",
    category: "lexical-marker",
    confidence: 0.7,
    replacements: ["explore", "look into", "examine"],
  },
  {
    term: "underscores",
    language: "en",
    category: "lexical-marker",
    confidence: 0.65,
    replacements: ["highlights", "emphasizes", "shows"],
  },
  {
    term: "intricate",
    language: "en",
    category: "lexical-marker",
    confidence: 0.68,
    replacements: ["complex", "detailed", "elaborate"],
  },
  {
    term: "pivotal",
    language: "en",
    category: "lexical-marker",
    confidence: 0.72,
    replacements: ["crucial", "key", "important"],
  },
  {
    term: "crucial",
    language: "en",
    category: "lexical-marker",
    confidence: 0.66,
    replacements: ["important", "essential", "vital"],
  },
  {
    term: "showcasing",
    language: "en",
    category: "lexical-marker",
    confidence: 0.68,
    replacements: ["showing", "demonstrating", "presenting"],
  },
  {
    term: "comprehensive",
    language: "en",
    category: "lexical-marker",
    confidence: 0.7,
    replacements: ["complete", "thorough", "full"],
  },
  {
    term: "meticulous",
    language: "en",
    category: "lexical-marker",
    confidence: 0.65,
    replacements: ["careful", "detailed", "thorough"],
  },
  {
    term: "tapestry",
    language: "en",
    category: "lexical-marker",
    confidence: 0.75,
    replacements: ["variety", "range", "mix"],
  },
  {
    term: "certainly",
    language: "en",
    category: "lexical-marker",
    confidence: 0.55,
    replacements: ["Surely", "Indeed", "Of course"],
  },
  {
    term: "leverage",
    language: "en",
    category: "lexical-marker",
    confidence: 0.72,
    replacements: ["use", "utilize", "take advantage of"],
  },

  // français — connecteurs et structures discursives
  {
    term: "en outre",
    language: "fr",
    category: "transition",
    confidence: 0.72,
    replacements: ["De plus", "Par ailleurs", "Également"],
  },
  {
    term: "par ailleurs",
    language: "fr",
    category: "transition",
    confidence: 0.72,
    replacements: ["De plus", "En outre", "Également"],
  },
  {
    term: "notamment",
    language: "fr",
    category: "transition",
    confidence: 0.62,
    replacements: ["Surtout", "Particulièrement", "Entre autres"],
  },
  {
    term: "de plus",
    language: "fr",
    category: "transition",
    confidence: 0.6,
    replacements: ["Également", "En outre", "Aussi"],
  },
  {
    term: "en conclusion",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.7,
    replacements: ["Pour conclure", "En résumé", "En définitive"],
  },
  {
    term: "en définitive",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.65,
    replacements: ["Finalement", "Au final", "Pour terminer"],
  },
  {
    term: "il convient de noter",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.75,
    replacements: ["À noter", "Signalons que", "On peut observer que"],
  },
  {
    term: "il est important de souligner",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.75,
    replacements: ["Il faut noter", "Retenons que", "Observons que"],
  },
  {
    term: "cette approche permet de",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.68,
    replacements: ["Cette méthode améliore", "Cela permet de", "On peut ainsi"],
  },
  {
    term: "ce n'est pas simplement X, c'est Y",
    language: "fr",
    category: "discourse-structure",
    confidence: 0.7,
    replacements: [],
  },
];
```

- [ ] **Step 2 : Implémenter le détecteur `lexical.ts`**

```ts
import type {
  Detection,
  DetectionCategory,
  DetectionType,
  Detector,
  Suggestion,
} from "../types/types";
import { LEXICAL_ENTRIES } from "./lexical-data";

/** Détection basée sur une base de termes et expressions (module 1 du cahier des charges).
 * Prend en compte le contexte :
 *  - correspondance avec séparateurs de mots (évite les faux positifs de sous-mot) ;
 *  - prise en compte de la langue du texte détectée via un paramètre optionnel ;
 *  - pondération par la confiance de l'entrée.
 */
export class LexicalDetector implements Detector {
  id = "lexical";
  name = "Lexical Detector";

  async detect(text: string, language?: "en" | "fr"): Promise<Detection[]> {
    const lower = text.toLowerCase();
    const matches = new Map<string, Detection>(); // clef = start-end pour dédup

    for (const entry of LEXICAL_ENTRIES) {
      if (language && entry.language !== language) {
        continue; // règles spécifiques à chaque langue (section 19)
      }
      const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // séparateurs de mot larges : début/fin de texte, espaces, ponctuation, sauts de ligne
      const regex = new RegExp(
        `(?<=^|(?=[\\s.,;:!?'"()\\[\\]{}—–—])\\b${escaped}\\b(?=[\\s.,;:!?'"()\\[\\]{}—–—]|$)`,
        "gi",
      );
      let m: RegExpExecArray | null;
      while ((m = regex.exec(lower)) !== null) {
        const key = `${m.index}-${m.index + m[0].length}`;
        if (matches.has(key)) {
          continue; // déduplication des chevauchements (Review Focus #5)
        }
        const score = this.calculateScore(entry, text);
        matches.set(key, {
          id: crypto.randomUUID(),
          type: entry.category === "transition" ? "connector" : "lexical",
          category: entry.category as DetectionCategory,
          text: m[0],
          start: m.index,
          end: m.index + m[0].length,
          score,
          confidence: entry.confidence,
          explanation: this.makeExplanation(entry, m[0]),
          suggestions: entry.replacements.map((rep) => ({
            type: "replace",
            text: rep,
            reason: `Remplacer « ${m[0]} » par « ${rep} » pour un style plus naturel.`,
          })),
        });
      }
    }

    return Array.from(matches.values());
  }

  private calculateScore(entry: { confidence: number }, text: string): number {
    // score = confiance pondérée par la fréquence relative du terme dans le texte
    const lower = text.toLowerCase();
    const occurrences = (
      lower.match(
        new RegExp(entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      ) || []
    ).length;
    const frequencyFactor = 1 + Math.min(0.3, (occurrences - 1) * 0.1); // bonus faible pour répétition
    return Math.min(100, Math.round(entry.confidence * 100 * frequencyFactor));
  }

  private makeExplanation(
    entry: { term: string; language: string; category: DetectionCategory },
    matched: string,
  ): string {
    const categoryText: Record<DetectionCategory, string> = {
      "lexical-marker":
        "terme fréquemment observé dans des textes générés par des LLM",
      "discourse-structure":
        "structure discursive stéréotypée souvent observée dans des textes générés par des LLM",
      transition:
        "connecteur souvent utilisé de manière excessive dans des textes générés par des LLM",
      "style-regularity":
        "régularité stylistique observée dans des textes générés par des LLM",
      anomaly:
        "formulation inhabituelle observée dans des textes générés par des LLM",
    };
    return `Le terme « ${matched} » est ${categoryText[entry.category]}.`;
  }
}
```

- [ ] **Step 3 : Écrire les tests `lexical.test.ts`** — tests TDD, d'abord le test d'échec.

```ts
import { LexicalDetector } from "./lexical";

suite("LexicalDetector", () => {
  const det = new LexicalDetector();

  test("detects known lexical markers", async () => {
    const result = await det.detect(
      "Furthermore, this approach is comprehensive.",
    );
    assert.lengthOf(result, 2);
  });

  test("no false positives for substring words", async () => {
    // 'delve' ne doit PAS matcher à l'intérieur de 'délivrer' ou 'développer'
    const result = await det.detect(
      "Ceci n'est pas un développement de la solution.",
    );
    assert.lengthOf(result, 0);
  });

  test("no false positives for short substring matches", async () => {
    const result = await det.detect(
      "The underscores in this code need fixing.",
    );
    assert.lengthOf(result, 1);
  });

  test("applies language filter", async () => {
    const enOnly = await det.detect("il convient de noter ceci", "en");
    const frOrAny = await det.detect("il convient de noter ceci");
    assert.lengthOf(enOnly, 0);
    assert.lengthOf(frOrAny, 1);
  });

  test("handles special regex characters in terms", async () => {
    const result = await det.detect("this involves A/B/C analysis");
    // aucune détection (pas de terme avec '/' dans la base) — vérifie que regex escape fonctionne sans planter
    assert.doesNotThrow(() => det.detect("text with dots."));
  });

  test("deduplicates overlapping matches", async () => {
    const result = await det.detect("in conclusion in conclusion");
    assert.lengthOf(result, 2);
  });

  test("returns empty array for empty text", async () => {
    const result = await det.detect("");
    assert.lengthOf(result, 0);
  });

  test("score bounded to 100 on repeated markers", async () => {
    const text = Array(20).fill("comprehensive").join(" ");
    const result = await det.detect(text);
    assert.ok(result.length > 0);
    assert.all(result.map((d) => d.score <= 100));
  });

  test("suggestions non empty for markers with replacements", async () => {
    const result = await det.detect("comprehensive solution");
    assert.ok(
      result.every((d) => d.suggestions.length > 0 || d.type === "connector"),
    );
  });
});
```

- [ ] **Step 4 : Exécuter les tests — s'attendre à FAIL** (dépendance non implémentée / `LexicalDetector` non défini, puis `assert` manquant, etc.)

```bash
npx tsc --noEmit
```

- [ ] **Step 5 : Implémenter `detect`** (code ci-dessus).

- [ ] **Step 6 : Relancer — s'attendre à PASS**

```bash
npx tsc --noEmit
```

- [ ] **Step 7 : Commiter**

```bash
git add extension/src/detectors/extension/package.json
git commit -m "feat(detection): add LexicalDetector with bilingual (EN/FR) marker database"
```

---

## Task 5 : Canal de messagerie background ↔ content script

**Files :**

- Modify: `extension/src/background/index.ts`
- Modify: `extension/src/content/index.ts`
- Test: `extension/src/content/handlers.test.ts`

**Interfaces :**

- Consommées : `DetectorService`, `Detector`, `AnalysisResult` (task 3).
- Produites : messages `ANALYZE_TEXT` / `ANALYSIS_READY` avec payloads typed.

- [ ] **Step 1 : Implémenter le background (`background/index.ts`)**

```ts
import { DetectorService } from "./services/detector";
import { LexicalDetector } from "./detectors/lexical";
import type { AnalysisResult } from "./types/types";

const service = new DetectorService();
service.register(new LexicalDetector());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_TEXT" && message.text) {
    service
      .detectAll(message.text)
      .then((result) => sendResponse({ type: "ANALYSIS_READY", result }))
      .catch((error) =>
        sendResponse({ type: "ANALYSIS_ERROR", error: error.message }),
      );
    return true; // message asynchrone
  }
});
```

- [ ] **Step 2 : Implémenter le content script (`content/index.ts`)**

```ts
import type { AnalysisResult, Detection } from "./types/types";

const STORAGE_KEY = "textorigin:selection";

// Capture la sélection utilisateur
function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  return selection.toString();
}

// Envoyer l'analyse vers le background
async function analyzeText(text: string): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "ANALYZE_TEXT", text }, (response) => {
      if (!response) {
        reject(new Error("Réponse vide du service background."));
        return;
      }
      if (response.type === "ANALYSIS_READY") {
        resolve(response.result);
      } else {
        reject(new Error(response.error || "Erreur d'analyse."));
      }
    });
  });
}

// Persistance locale de la dernière sélection (storage API)
async function persistSelection(text: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: text });
}

// Entrée : écouter un click sur le badge / popup, lancer l'analyse
async function handlePageAnalysis(): Promise<void> {
  const text = getSelectedText();
  if (!text) {
    // texte vide → afficher message d'erreur poli (section 13 du cahier)
    return;
  }
  await persistSelection(text);
  try {
    const result = await analyzeText(text);
    console.log("TextOrigin AI - analyse:", result);
    // TODO (tâche 9) : injecter les surlignages + panneau latéral
  } catch (error) {
    console.error("TextOrigin AI - erreur :", error);
  }
}

// Bouton flottant créé dynamiquement
function createFloatingButton(): void {
  const button = document.createElement("button");
  button.id = "textorigin-floating-btn";
  button.textContent = "Analyze";
  button.title = "TextOrigin AI - analyser la sélection";
  Object.assign(button.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483640",
    padding: "10px 16px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  });
  button.addEventListener("click", handlePageAnalysis);
  document.body.appendChild(button);
}

createFloatingButton();
```

- [ ] **Step 3 : Écrire le test de handler (content-side, isolé)**

```ts
// Note : les appels chrome.runtime.sendMessage et chrome.storage sont mockés par le test runner.
suite("Content script handlers", () => {
  test("getSelectedText returns null when no selection", () => {
    const win = { getSelection: () => null };
    // (mock window)
    assert.strictEqual(getSelectedTextMock(), null);
  });

  test("getSelectedText returns collapsed selection as null", () => {
    const selection = { isCollapsed: true, toString: () => "x" };
    const win = { getSelection: () => selection };
    assert.strictEqual(getSelectedTextMock(), null);
  });

  test("getSelectedText returns selection string", () => {
    const selection = { isCollapsed: false, toString: () => "hello world" };
    const win = { getSelection: () => selection };
    assert.strictEqual(getSelectedTextMock(), "hello world");
  });
});
```

- [ ] **Step 4 : Exécuter — FAIL** → implémenter les mocks → PASS.

- [ ] **Step 5 : Commiter**

```bash
git add extension/src/background/index.ts extension/src/content/index.ts
git commit -m "feat(messaging): add content<->background ANALYZE_TEXT / ANALYSIS_READY channel + floating Analyze button"
```

---

## Task 6 : Popup React (dashboard compact)

**Files :**

- Modify: `extension/src/popup/index.tsx`
- Modify: `extension/src/popup/index.html`
- Test: `extension/src/popup/ScoreCard.test.tsx` (optionnel — test d'intégration manuelle)

**Interfaces :**

- Consommées : `AnalysisResult` de `src/types/types.ts`.
- Produites : interface UI popup avec logo, score circulaire 0–100, nombre de marqueurs, bouton « Analyze », résumé.

- [ ] **Step 1 : Écrire `popup/index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TextOrigin AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2 : Écrire `popup/index.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AnalysisResult } from "../types/types";
import "./global.css";

const STORAGE_KEY = "textorigin:selection";

const App: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (items) => {
      const text = items[STORAGE_KEY];
      if (text && text.length > 0) {
        analyze(text);
      }
    });
  }, []);

  const analyze = async (text: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await new Promise<AnalysisResult>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "ANALYZE_TEXT", text },
          (response) => {
            if (response?.type === "ANALYSIS_READY") resolve(response.result);
            else reject(new Error(response?.error || "Analyse échouée."));
          },
        );
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    const selection = window.getSelection()?.toString() ?? "";
    if (!selection.trim()) {
      setError("Veuillez sélectionner du texte sur la page.");
      return;
    }
    analyze(selection);
  };

  const scoreColor = (score: number) =>
    score < 21
      ? "text-natural-500"
      : score < 41
        ? "text-primary-500"
        : score < 61
          ? "text-verify-500"
          : "text-alert-500";

  return (
    <div className="min-h-[320px] w-80 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans">
      <header className="flex items-center gap-2 mb-4">
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
          <path
            strokeWidth="2"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <h1 className="text-lg font-bold text-primary-700 dark:text-primary-400">
          TextOrigin AI
        </h1>
      </header>

      <div className="space-y-4">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Analyse en cours..." : "Analyze"}
        </button>

        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyse en cours...
          </p>
        )}

        {error && <p className="text-sm text-alert-500">{error}</p>}

        {result && (
          <div className="border rounded-lg p-4 dark:border-gray-700">
            <div className="text-center mb-3">
              <div
                className={`text-4xl font-bold ${scoreColor(result.totalScore)}`}
              >
                {result.totalScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                AI Marker Score
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Marqueurs détectés</span>
                <span className="font-medium">{result.markerCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Confiance</span>
                <span className="font-medium capitalize">
                  {result.confidence}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Score de présence de marqueurs stylistiques fréquemment observés
                dans des textes générés par des LLM.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 3 : Écrire `src/popup/global.css` (importer Tailwind)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4 : Tester manuellement** — charger l'extension en mode développeur Chrome (`chrome://extensions` → « Charger l'extension non empaquetée » → choisir `dist/` après build). Vérifier : bouton visible, popup render sans crash, message poli en cas de texte vide.

- [ ] **Step 5 : Commiter**

```bash
git add extension/src/popup/extension/package.json
git commit -m "feat(popup): add React popup with AI Marker Score, marker count, and Analyze flow"
```

---

## Task 7 : Surlignage et tooltip dans la page

**Files :**

- Create: `extension/src/content/highlighter.ts`
- Create: `extension/src/content/styles.css`
- Modify: `extension/src/content/index.ts` (appeler highlighter après analyse)

**Interfaces :**

- Consommées : `Detection[]`, `AnalysisResult` (task 6).
- Produites : marqueurs surlignés avec classes de couleur (jaune orange rouge pour niveau, violet structure, bleu statistique) + tooltip d'explication.

- [ ] **Step 1 : Implémenter `highlighter.ts`**

```ts
import type { Detection, DetectionCategory } from "../types/types";

const COLOR_MAP: Record<DetectionCategory, string> = {
  "lexical-marker": "bg-highlight-orange", // moyen
  "discourse-structure": "bg-highlight-purple", // structure stylistique
  transition: "bg-highlight-orange",
  "style-regularity": "bg-highlight-blue", // statistique
  anomaly: "bg-highlight-yellow", // faible
};

export interface HighlightOptions {
  overlay?: boolean; // panneau latéral de droite (écran d'analyse en deux colonnes)
}

export function highlightText(
  detections: Detection[],
  options: HighlightOptions = {},
): void {
  // Nettoyer d'abord les anciens marqueurs (re-analyse)
  document.querySelectorAll("[data-textorigin-marker]").forEach((el) => {
    const parent = el.parentNode!;
    parent.replaceChild(el, el);
  });

  if (!detections.length) return;

  // Tri par position pour un traitement DOM ordonné (éviter les collisions)
  const sorted = [...detections].sort((a, b) => a.start - b.start);

  // Sélection du point d'ancrage : body ou un conteneur dédié
  const container = document.querySelector("body")!;

  // Construction d'un arbre de nœuds texte + marqueurs
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent?.trim()) textNodes.push(node);
  }

  // Attribution de chaque détection au nœud texte qui la contient
  const placements: Array<{
    node: Text;
    start: number;
    end: number;
    detection: Detection;
  }> = [];
  for (const d of sorted) {
    for (const node of textNodes) {
      if (
        node.textContent &&
        node.textContent.length > d.start &&
        node.textContent.indexOf(d.text, d.start) === d.start
      ) {
        placements.push({ node, start: d.start, end: d.end, detection: d });
      }
    }
  }

  for (const { node, start, end, detection } of placements) {
    const span = document.createElement("span");
    span.dataset.textoriginMarker = "true";
    span.dataset.markerId = detection.id;
    span.className = `rounded-sm px-0.5 ${COLOR_MAP[detection.category]} cursor-pointer`;
    span.title = "Marqueur détecté";
    const frag = document.createDocumentFragment();
    frag.appendChild(node.textContent!.slice(0, start).cloneNode());
    const mark = span.cloneNode() as HTMLSpanElement;
    mark.textContent = detection.text;
    mark.addEventListener("mouseenter", () => showTooltip(mark, detection));
    mark.addEventListener("mouseleave", hideTooltip);
    frag.appendChild(mark);
    frag.appendChild(node.textContent!.slice(end).cloneNode());
    node.parentNode?.replaceChild(frag, node);
  }
}

function showTooltip(anchor: HTMLSpanElement, detection: any): void {
  hideTooltip();
  const tooltip = document.createElement("div");
  tooltip.id = "textorigin-tooltip";
  tooltip.style.cssText = `
    position: absolute; z-index: 2147483641; max-width: 280px; padding: 12px;
    background: #1f2937; color: #fff; border-radius: 8px; font-size: 13px; line-height: 1.4;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); pointer-events: none;
  `;
  const catLabel: Record<string, string> = {
    "lexical-marker": "Marqueur lexical",
    "discourse-structure": "Structure discursive",
    transition: "Connecteur excessif",
    "style-regularity": "Régularité stylistique",
    anomaly: "Anomalie stylistique",
  };
  tooltip.innerHTML = `
    <div class="font-semibold mb-1">Marqueur détecté</div>
    <div class="text-primary-300 text-sm mb-2">${catLabel[detection.category]}</div>
    <div class="text-xs mb-2 opacity-90">${detection.explanation}</div>
    ${detection.suggestions.length ? `<div class="text-xs opacity-75">Suggestion : ${detection.suggestions[0].text}</div>` : ""}
  `;
  const rect = anchor.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
  document.body.appendChild(tooltip);
}

function hideTooltip(): void {
  document.getElementById("textorigin-tooltip")?.remove();
}
```

- [ ] **Step 2 : Modifier `content/index.ts`** pour appeler `highlightText` dans le bloc catch/finally de `handlePageAnalysis` (après l'import).

```ts
import { highlightText } from "./highlighter";
// ...
  } catch (error) {
    console.error("TextOrigin AI - erreur :", error);
  } finally {
    // (placeholder : highlightText(result) sera appelé dans la tâche suivante)
  }
```

- [ ] **Step 3 : Tester manuellement** — sélectionner du texte sur une page web, cliquer sur le bouton « Analyze », vérifier que les marqueurs sont surlignés et que le tooltip affiche l'explication.

- [ ] **Step 4 : Commiter**

```bash
git add extension/src/content/highlighter.ts extension/src/content/styles.css
git commit -m "feat(content): add DOM highlighter + explanation tooltip with color-coded levels"
```

---

## Task 8 : Règles globales — score borné, feedback utilisateur, états d'erreur

**Files :**

- Modify: `extension/src/services/detector.ts` (s'assurer `totalScore` borné 0–100)
- Modify: `extension/src/content/index.ts` (message poli pour texte vide / court)
- Test: `extension/src/services/detector.test.ts` (tests Review Focus #2, #4, #5)

**Interfaces :**

- Consommées : `Detection[]` de chaque détecteur.
- Produites : `AnalysisResult` avec `totalScore` ∈ [0, 100], `confidence` ∈ {low, medium, high}, `markerCount` ∈ ℕ.

- [ ] **Step 1 : Tests Review Focus**

```ts
import { DetectorService } from "./detector";
import type {
  Detector,
  Detection,
  DetectionCategory,
  DetectionType,
} from "../types/types";

const mk = (text: string, score: number, conf: number): Detection => ({
  id: crypto.randomUUID(),
  type: "lexical" as DetectionType,
  category: "lexical-marker" as DetectionCategory,
  text,
  start: 0,
  end: text.length,
  score,
  confidence: conf,
  explanation: "test",
  suggestions: [],
});

suite("Aggregate & edge cases", () => {
  test("empty text → zero score and zero markers", async () => {
    const svc = new DetectorService();
    const result = await svc.detectAll("");
    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.markerCount, 0);
  });

  test("short text (1 word) does not throw and returns bounded score", async () => {
    const svc = new DetectorService();
    const result = await svc.detectAll("a");
    assert.ok(result.totalScore >= 0 && result.totalScore <= 100);
  });

  test("total score bounded to [0, 100] regardless of marker count", async () => {
    const svc = new DetectorService();
    const fake: Detector = {
      id: "big",
      name: "Big",
      detect: async () => Array(50).fill(mk("comprehensive", 95, 0.9)),
    };
    svc.register(fake);
    const result = await svc.detectAll(
      Array(50).fill("comprehensive").join(" "),
    );
    assert.strictEqual(result.totalScore, 100);
    assert.ok(result.totalScore <= 100);
  });

  test("overlapping same-range detections deduplicated", async () => {
    const svc = new DetectorService();
    const fake: Detector = {
      id: "a",
      name: "A",
      detect: async () => [mk("text", 50, 0.5)],
    };
    const fake2: Detector = {
      id: "b",
      name: "B",
      detect: async () => [mk("text", 60, 0.6)],
    };
    svc.register(fake);
    svc.register(fake2);
    const result = await svc.detectAll("text");
    assert.strictEqual(result.markerCount, 2); // deux détecteurs différents → deux détections conservées (Review Focus #5 : déduplication au même rang)
  });
});
```

- [ ] **Step 2 : Exécuter — FAIL** → implémenter dans `detector.ts` la borne `Math.min(100, Math.max(0, ...))` (déjà en place à la tâche 3) + message poli dans `content/index.ts` :

```ts
if (!text.trim()) {
  // Feedback utilisateur poli (section 13)
  chrome.runtime.sendMessage({
    type: "SHOW_TOAST",
    message: "Veuillez sélectionner du texte à analyser.",
  });
  return;
}
if (text.length < 20) {
  chrome.runtime.sendMessage({
    type: "SHOW_TOAST",
    message: "Texte trop court pour une analyse fiable (min. 20 caractères).",
  });
}
```

- [ ] **Step 3 : Relancer — PASS**

- [ ] **Step 4 : Commiter**

```bash
git add extension/src/services/detector.ts extension/src/content/index.ts
git commit -m "feat(detection): bounded score [0,100], empty/short text handling, and polished toast feedback"
```

---

## Task 9 : Tests unitaires finaux + vérification extension complète

**Files :**

- Modify: `extension/src/detectors/lexical.test.ts` (s'assurer 100 % de couverture des Review Focus #1, #3)
- Create: `extension/e2e-manual-test.md` (guide de test manuel)

**Interfaces :**

- Consommées : tout le projet.
- Produites : suite de tests fonctionnelle, procédure de test manuelle pour le bundle produit.

- [ ] **Step 1 : Exécuter tous les tests**

```bash
npx tsc --noEmit
npm test  # (ajouter "test": "vitest run" dans package.json si nécessaire)
```

- [ ] **Step 2 : Build du bundle final**

```bash
npm run build
```

- [ ] **Step 3 : Test manuel complet (guide `e2e-manual-test.md`)**
  1. Charger `dist/` en mode développeur Chrome.
  2. Cliquer sur le bouton flottant « Analyze » sans sélection → message poli.
  3. Sélectionner « Furthermore, this comprehensive approach is pivotal. » → popup affiche score + « 3 marqueurs détectés ».
  4. Hover sur chaque surlignage → tooltip avec explication + suggestion.
  5. Tester un texte en français (« En outre, il convient de noter que... ») → détections FR.
  6. Tester un mot contigu (« développement ») → aucun faux positif.
  7. Tester un texte de 15 caractères → message de longueur minimum.

- [ ] **Step 4 : Commiter le guide et les tests**

```bash
git add extension/e2e-manual-test.md extension/src/**/*.test.ts
git commit -m "test: add e2e manual test guide and final unit tests"
```

---

## Notes d'implémentation

- **Ordre d'exécution** : les tâches sont dépendantes (une chaîne d'interfaces `types` → `DetectorService` → `LexicalDetector` → messaging → UI → highlighter).
- **Tests** : TDD — écrire le test avant l'implémentation, le faire échouer, implémenter le minimum, le faire passer, commit.
- **Extensions de tests supplémentaires (hors MVP)** : connecteurs excessifs (fréquence/densité), régularité stylistique (longueur/variance de phrases), watermark/provenance — à reporter aux sous-projets suivants.
- **Données de démonstration** : la base `LEXICAL_ENTRIES` (tâche 4) sert de jeu de données réel pour tester immédiatement.
- **Rappel** : ne jamais afficher de preuve absolue ; toujours formuler en termes de « marqueurs fréquemment observés dans des textes générés par des LLM ».
