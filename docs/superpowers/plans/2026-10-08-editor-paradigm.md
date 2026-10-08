# Éditeur de documents intégré — Plan d'implémentation

> **Pour les agents d'exécution :** SOUS-SKILL REQUIS : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe de cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** remplacer le bouton flottant injecté dans les pages par une page éditeur interne à l'extension (TipTap) avec un panneau d'analyse IA en direct et un export .docx/PDF, le tout en local.

**Architecture :** une nouvelle page `editor.html`, construite par Vite comme 4ᵉ entrée, héberge un éditeur TipTap. Le détecteur existant (`DetectorService`) y tourne directement. Ses résultats sont convertis de positions en texte brut vers des positions ProseMirror (`analysis/positions.ts`), puis affichés comme décorations (`AiMarkers`). Les documents et les images vivent dans IndexedDB (`storage/documents.ts`), qu'on partage avec le popup puisqu'ils ont la même origine. L'export .docx est une fonction pure de conversion JSON TipTap → `docx` ; le PDF passe par l'impression du navigateur avec une CSS dédiée. Le content script est supprimé.

**Stack technique :** TypeScript 5, React 19, Vite 6, Tailwind 3, Vitest, TipTap 3.31 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-text-style`, `@tiptap/extension-highlight`, `@tiptap/extension-text-align`, `@tiptap/extension-table`), `docx` 9.9 ; en test, `fake-indexeddb` 6 et `jszip` 3.

**Spec :** `docs/superpowers/specs/2026-10-08-editor-paradigm-design.md`

**Écarts assumés par rapport à la spec** (découverts en vérifiant les API actuelles) :
- TipTap 3 fournit `FontSize` dans `@tiptap/extension-text-style`, donc pas d'extension maison pour la taille.
- L'interligne reste une extension maison, nommée `ParagraphLineHeight` pour ne pas entrer en conflit avec la `LineHeight` (au niveau du texte) de TipTap.
- `docx` n'embarque pas le webp : les images webp sont converties en png à l'insertion.
- `update()` renvoie le document mis à jour au lieu de `void`.

Toutes les commandes s'exécutent dans `extension/` sauf mention contraire. Les messages de commit se terminent par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Contraintes globales

- 100 % local : aucun appel réseau, aucun service cloud, aucune extension TipTap payante ou cloud.
- CSP MV3 `script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'` : pas de CDN, pas d'`eval` ni de `new Function`.
- `minimum_chrome_version` : `"88"` (pas de `chrome.storage.session`).
- Pas de nom ni de marque « Word » / « Google Docs » dans l'interface ; les libellés d'export sont « Word (.docx) » et « PDF ».
- Interface en français.
- Jamais de `alert()`, `confirm()` ni `prompt()` natifs ; tous les messages passent par le composant `Toast`.
- Page A4 (21 × 29,7 cm), marges de 2,5 cm, largeur utile de 16 cm.
- Polices : Arial, Calibri, Georgia, Times New Roman, Verdana, Courier New. Tailles : 8 à 72 pt. Interlignes : 1.0, 1.15, 1.5, 2.0.
- Images acceptées : png, jpeg, gif, webp, au plus 10 Mo.
- Analyse lancée 500 ms après la dernière modification (1 500 ms au-delà de 20 000 caractères) ; sauvegarde 1 s après.
- Pas de fusion ni de scission de cellules dans l'interface.
- Les marqueurs IA ne figurent jamais dans le JSON, dans l'historique d'annulation, ni dans les exports.
- `dist/assets/popup.js` ne doit contenir ni `@tiptap` ni `docx`.

## Points de vigilance

1. **Suggestion appliquée en début de phrase** : la détection renvoie un texte en minuscules (`lexical.ts` cherche dans `text.toLowerCase()`). Remplacer « Delve » doit donner « Explore », pas « explore ». Test : Tâche 4, `matchCase`.
2. **Réponse d'analyse arrivée après une nouvelle frappe** : une analyse lente ne doit jamais poser des marqueurs sur un texte qui a changé depuis. Test : Tâche 4, `createLatestOnly`.
3. **Suppression d'un document dont une image a été copiée-collée dans un autre** : l'image doit rester disponible dans l'autre document. Test : Tâche 2, `remove` ne supprime que les images orphelines.
4. **Tableau collé depuis le web avec des cellules fusionnées** : l'interface interdit la fusion, mais le collage HTML peut en produire. L'export .docx doit garder la fusion au lieu de casser. Test : Tâche 6, `gridSpan`.
5. **Deux listes numérotées séparées par un paragraphe** : la seconde doit recommencer à 1 dans Word. Test : Tâche 6, deux `numId` distincts.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/editor/schema.ts` | Liste des extensions TipTap partagée par l'éditeur et les tests (sans React) |
| `src/editor/extensions/ParagraphLineHeight.ts` | Interligne au niveau du paragraphe et du titre |
| `src/editor/extensions/StoredImage.ts` | Nœud image qui référence une image d'IndexedDB par son identifiant |
| `src/editor/extensions/AiMarkers.ts` | Plugin ProseMirror des décorations de marqueurs |
| `src/storage/documents.ts` | Seul accès à IndexedDB (documents et images) |
| `src/analysis/positions.ts` | Texte brut ⇄ positions ProseMirror |
| `src/analysis/live.ts` | `analysisDelay`, `createLatestOnly`, `matchCase` |
| `src/analysis/service.ts` | Fabrique du `DetectorService` configuré (partagée avec le background) |
| `src/export/toDocx.ts` | JSON TipTap → document `docx` |
| `src/export/download.ts` | Nom de fichier sûr et téléchargement d'un Blob |
| `src/editor/images.ts` | Validation et préparation des images (webp → png, dimensions) |
| `src/editor/index.html`, `main.tsx`, `editor.css`, `print.css` | Page éditeur |
| `src/editor/EditorApp.tsx` | Assemblage : barre du haut, barre d'outils, feuille, panneau |
| `src/editor/useAutosave.ts` | Sauvegarde différée avec statut |
| `src/editor/useLiveAnalysis.ts` | Analyse différée et pose des marqueurs |
| `src/editor/Toast.tsx` | Contexte et affichage des toasts |
| `src/editor/Toolbar.tsx` | Barre de mise en forme |
| `src/editor/AnalysisPanel.tsx` | Score, catégories, marqueurs, suggestions |
| `src/editor/MarkerTooltip.tsx` | Infobulle au survol d'un marqueur |
| `src/editor/DocumentList.tsx` | Tiroir « Mes documents » |
| `src/editor/ExportMenu.tsx` | Menu Exporter (.docx / PDF) |
| `src/editor/StoredImageView.tsx` | NodeView React qui affiche une image stockée |
| `src/popup/index.tsx` | + « Ouvrir dans l'éditeur » |
| `src/background/index.ts` | Utilise `createDetectorService` |
| `src/content/*` | **Supprimés** |

---

### Tâche 1 : dépendances et schéma TipTap partagé

**Fichiers :**
- Modifier : `extension/package.json` (dépendances)
- Créer : `src/editor/extensions/ParagraphLineHeight.ts`
- Créer : `src/editor/extensions/StoredImage.ts`
- Créer : `src/editor/schema.ts`
- Test : `src/editor/schema.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit :
  - `baseExtensions(overrides?: { storedImage?: AnyExtension }): Extensions`
  - `LINE_HEIGHTS: readonly ["1.0", "1.15", "1.5", "2.0"]`
  - commandes `setParagraphLineHeight(value: string)` et `unsetParagraphLineHeight()`
  - `interface StoredImageAttrs { imageId: string; width: number; height: number; alt: string }`
  - commande `insertStoredImage(attrs: StoredImageAttrs)`
  - nœud `storedImage` (bloc, atomique)

- [ ] **Étape 1 : installer les dépendances**

```bash
npm install @tiptap/react@^3.31.4 @tiptap/pm@^3.31.4 @tiptap/core@^3.31.4 @tiptap/starter-kit@^3.31.4 @tiptap/extension-text-style@^3.31.4 @tiptap/extension-highlight@^3.31.4 @tiptap/extension-text-align@^3.31.4 @tiptap/extension-table@^3.31.4 docx@^9.9.0
npm install -D fake-indexeddb@^6.2.5 jszip@^3.10.2
```

Résultat attendu : installation sans erreur de peer dependency (TipTap 3 accepte React 19).

- [ ] **Étape 2 : écrire le test qui échoue**

`src/editor/schema.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { baseExtensions } from "./schema";

const schema = getSchema(baseExtensions());

describe("baseExtensions schema", () => {
  it("exposes every node and mark of scope B", () => {
    for (const n of [
      "doc", "paragraph", "heading", "blockquote", "bulletList", "orderedList",
      "listItem", "hardBreak", "table", "tableRow", "tableCell", "tableHeader", "storedImage",
    ]) {
      expect(schema.nodes[n], n).toBeDefined();
    }
    for (const m of ["bold", "italic", "underline", "link", "textStyle", "highlight"]) {
      expect(schema.marks[m], m).toBeDefined();
    }
  });

  it("drops code, codeBlock, strike and horizontalRule", () => {
    expect(schema.nodes.codeBlock).toBeUndefined();
    expect(schema.nodes.horizontalRule).toBeUndefined();
    expect(schema.marks.code).toBeUndefined();
    expect(schema.marks.strike).toBeUndefined();
  });

  it("round-trips paragraph attributes and textStyle attributes", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", lineHeight: "1.5" },
          content: [
            {
              type: "text",
              text: "Bonjour",
              marks: [
                { type: "textStyle", attrs: { fontFamily: "Georgia", fontSize: "14pt", color: "#ff0000" } },
                { type: "highlight", attrs: { color: "#fef08a" } },
              ],
            },
          ],
        },
        { type: "storedImage", attrs: { imageId: "img-1", width: 800, height: 600, alt: "chat" } },
      ],
    };
    const doc = schema.nodeFromJSON(json);
    const back = doc.toJSON();
    expect(back.content[0].attrs).toMatchObject({ textAlign: "center", lineHeight: "1.5" });
    expect(back.content[0].content[0].marks[0].attrs).toMatchObject({
      fontFamily: "Georgia", fontSize: "14pt", color: "#ff0000",
    });
    expect(back.content[1].attrs).toEqual({ imageId: "img-1", width: 800, height: 600, alt: "chat" });
  });
});
```

- [ ] **Étape 3 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/editor/schema.test.ts`
Résultat attendu : ÉCHEC avec « Failed to resolve import "./schema" ».

- [ ] **Étape 4 : créer `src/editor/extensions/ParagraphLineHeight.ts`**

```ts
import { Extension } from "@tiptap/core";

// Nom distinct de l'extension « lineHeight » de @tiptap/extension-text-style,
// qui s'applique au texte (span) et non au paragraphe.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphLineHeight: {
      setParagraphLineHeight: (value: string) => ReturnType;
      unsetParagraphLineHeight: () => ReturnType;
    };
  }
}

export const LINE_HEIGHTS = ["1.0", "1.15", "1.5", "2.0"] as const;

const TYPES = ["paragraph", "heading"];

export const ParagraphLineHeight = Extension.create({
  name: "paragraphLineHeight",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphLineHeight:
        (value) =>
        ({ commands }) =>
          TYPES.map((t) => commands.updateAttributes(t, { lineHeight: value })).some(Boolean),
      unsetParagraphLineHeight:
        () =>
        ({ commands }) =>
          TYPES.map((t) => commands.resetAttributes(t, "lineHeight")).some(Boolean),
    };
  },
});
```

- [ ] **Étape 5 : créer `src/editor/extensions/StoredImage.ts`**

```ts
import { Node, mergeAttributes } from "@tiptap/core";

export interface StoredImageAttrs {
  imageId: string;
  width: number;
  height: number;
  alt: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storedImage: {
      insertStoredImage: (attrs: StoredImageAttrs) => ReturnType;
    };
  }
}

/**
 * Image dont les octets vivent dans IndexedDB (magasin « images »).
 * Le document ne garde que l'identifiant et les dimensions d'origine,
 * nécessaires à l'export .docx.
 */
export const StoredImage = Node.create({
  name: "storedImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      imageId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-image-id"),
        renderHTML: (a) => ({ "data-image-id": a.imageId }),
      },
      width: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-width")) || 0,
        renderHTML: (a) => ({ "data-width": a.width }),
      },
      height: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-height")) || 0,
        renderHTML: (a) => ({ "data-height": a.height }),
      },
      alt: {
        default: "",
        parseHTML: (el) => el.getAttribute("alt") ?? "",
        renderHTML: (a) => ({ alt: a.alt }),
      },
    };
  },

  // Seules nos propres images sont reprises au collage : une <img> distante
  // n'a pas d'octets locaux et ne pourrait pas être exportée.
  parseHTML() {
    return [{ tag: "img[data-image-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      insertStoredImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
```

- [ ] **Étape 6 : créer `src/editor/schema.ts`**

```ts
import type { AnyExtension, Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { ParagraphLineHeight } from "./extensions/ParagraphLineHeight";
import { StoredImage } from "./extensions/StoredImage";

export const FONT_FAMILIES = [
  "Arial", "Calibri", "Georgia", "Times New Roman", "Verdana", "Courier New",
] as const;

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72] as const;

/**
 * Extensions communes à l'éditeur et aux tests (aucune dépendance React).
 * L'éditeur remplace `storedImage` par une version dotée d'une NodeView.
 */
export function baseExtensions(overrides: { storedImage?: AnyExtension } = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      horizontalRule: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    ParagraphLineHeight,
    TableKit.configure({ table: { resizable: false } }),
    overrides.storedImage ?? StoredImage,
  ];
}
```

Remarque : si TypeScript signale qu'une importation par défaut n'existe pas (`Highlight`, `TextAlign`), passer à l'importation nommée (`import { Highlight } from ...`). Les deux formes sont exportées en 3.31.

- [ ] **Étape 7 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/editor/schema.test.ts`
Résultat attendu : 3 tests PASS. Si `getSchema` échoue en Node pour absence de DOM, faire `npm i -D happy-dom@^20` et ajouter `// @vitest-environment happy-dom` en première ligne du fichier de test.

- [ ] **Étape 8 : vérifier les types et commiter**

Commande : `npx tsc --noEmit` → aucune erreur.

```bash
git add package.json package-lock.json src/editor/schema.ts src/editor/schema.test.ts src/editor/extensions
git commit -m "feat(editor): schéma TipTap partagé (interligne paragraphe, image stockée)"
```

---

### Tâche 2 : stockage IndexedDB des documents et des images

**Fichiers :**
- Créer : `src/storage/documents.ts`
- Test : `src/storage/documents.test.ts`

**Interfaces :**
- Consomme : `JSONContent` de `@tiptap/core`.
- Produit :
  - `interface StoredDocument { id: string; title: string; content: JSONContent; createdAt: number; updatedAt: number }`
  - `DEFAULT_TITLE = "Sans titre"`
  - `textToContent(text: string): JSONContent`
  - `collectImageIds(content: JSONContent): string[]`
  - `create(init?: { title?: string; text?: string }): Promise<StoredDocument>`
  - `get(id: string): Promise<StoredDocument | undefined>`
  - `list(): Promise<StoredDocument[]>` (tri par `updatedAt` décroissant)
  - `update(id: string, patch: Partial<Pick<StoredDocument, "title" | "content">>): Promise<StoredDocument>` (rejette « Document introuvable »)
  - `remove(id: string): Promise<void>`
  - `putImage(blob: Blob): Promise<string>`
  - `getImage(id: string): Promise<Blob | undefined>`
  - fonctions de test : `__resetDbForTests(): Promise<void>` et `__setClockForTests(fn: () => number): void`

- [ ] **Étape 1 : écrire le test qui échoue**

`src/storage/documents.test.ts` :

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  create, get, list, update, remove, putImage, getImage, textToContent, collectImageIds,
  __resetDbForTests, __setClockForTests, DEFAULT_TITLE,
} from "./documents";

let clock = 1000;

beforeEach(async () => {
  await __resetDbForTests();
  clock = 1000;
  __setClockForTests(() => clock++);
});

describe("textToContent", () => {
  it("splits blank-line separated text into paragraphs and single newlines into hard breaks", () => {
    expect(textToContent("Un\r\nDeux\n\n  Trois  ")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Un" }, { type: "hardBreak" }, { type: "text", text: "Deux" }] },
        { type: "paragraph", content: [{ type: "text", text: "Trois" }] },
      ],
    });
  });

  it("returns a single empty paragraph for blank text", () => {
    expect(textToContent("  \n ")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("collectImageIds", () => {
  it("finds storedImage ids at any depth", () => {
    const content = {
      type: "doc",
      content: [
        { type: "storedImage", attrs: { imageId: "a" } },
        { type: "blockquote", content: [{ type: "storedImage", attrs: { imageId: "b" } }] },
      ],
    };
    expect(collectImageIds(content).sort()).toEqual(["a", "b"]);
  });
});

describe("documents store", () => {
  it("creates a document with default title and text content", async () => {
    const doc = await create({ text: "Bonjour" });
    expect(doc.title).toBe(DEFAULT_TITLE);
    expect(doc.content).toEqual(textToContent("Bonjour"));
    expect(await get(doc.id)).toEqual(doc);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await get("nope")).toBeUndefined();
  });

  it("lists documents by most recent update first", async () => {
    const a = await create({ title: "A" });
    const b = await create({ title: "B" });
    await update(a.id, { title: "A2" });
    expect((await list()).map((d) => d.title)).toEqual(["A2", "B"]);
    expect(b.updatedAt).toBeLessThan((await get(a.id))!.updatedAt);
  });

  it("rejects update of a missing document", async () => {
    await expect(update("nope", { title: "x" })).rejects.toThrow("Document introuvable");
  });

  it("stores and returns image bytes with their type", async () => {
    const id = await putImage(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const blob = await getImage(id);
    expect(blob?.type).toBe("image/png");
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("remove deletes the document and only its orphan images", async () => {
    const shared = await putImage(new Blob([new Uint8Array([1])], { type: "image/png" }));
    const own = await putImage(new Blob([new Uint8Array([2])], { type: "image/png" }));
    const img = (imageId: string) => ({ type: "storedImage", attrs: { imageId, width: 1, height: 1, alt: "" } });
    const a = await create();
    await update(a.id, { content: { type: "doc", content: [img(shared), img(own)] } });
    const b = await create();
    await update(b.id, { content: { type: "doc", content: [img(shared)] } });

    await remove(a.id);

    expect(await get(a.id)).toBeUndefined();
    expect(await getImage(own)).toBeUndefined();
    expect(await getImage(shared)).toBeDefined();
  });
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/storage/documents.test.ts`
Résultat attendu : ÉCHEC avec « Failed to resolve import "./documents" ».

- [ ] **Étape 3 : écrire l'implémentation**

`src/storage/documents.ts` :

```ts
import type { JSONContent } from "@tiptap/core";

/**
 * Seul accès à IndexedDB. Partagé par le popup et l'éditeur, qui ont la
 * même origine (chrome-extension://<id>) et donc la même base.
 */
export interface StoredDocument {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
}

interface StoredImageRecord {
  id: string;
  type: string;
  // ArrayBuffer plutôt que Blob : clonable partout (y compris fake-indexeddb)
  data: ArrayBuffer;
}

export const DEFAULT_TITLE = "Sans titre";

const DB_NAME = "textorigin";
const DB_VERSION = 1;
const DOCS = "documents";
const IMAGES = "images";

let dbPromise: Promise<IDBDatabase> | null = null;
let now: () => number = () => Date.now();

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Un échec d'ouverture ne doit pas bloquer les essais suivants
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export function textToContent(text: string): JSONContent {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return { type: "doc", content: [{ type: "paragraph" }] };
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: p.split("\n").flatMap((line, i): JSONContent[] =>
        i === 0 ? [{ type: "text", text: line }] : [{ type: "hardBreak" }, { type: "text", text: line }],
      ),
    })),
  };
}

export function collectImageIds(content: JSONContent): string[] {
  const ids: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "storedImage" && typeof node.attrs?.imageId === "string") ids.push(node.attrs.imageId);
    node.content?.forEach(walk);
  };
  walk(content);
  return ids;
}

export async function create(init: { title?: string; text?: string } = {}): Promise<StoredDocument> {
  const t = now();
  const doc: StoredDocument = {
    id: crypto.randomUUID(),
    title: init.title?.trim() || DEFAULT_TITLE,
    content: textToContent(init.text ?? ""),
    createdAt: t,
    updatedAt: t,
  };
  await promisify((await store(DOCS, "readwrite")).put(doc));
  return doc;
}

export async function get(id: string): Promise<StoredDocument | undefined> {
  return promisify((await store(DOCS, "readonly")).get(id) as IDBRequest<StoredDocument | undefined>);
}

export async function list(): Promise<StoredDocument[]> {
  const all = await promisify((await store(DOCS, "readonly")).getAll() as IDBRequest<StoredDocument[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function update(
  id: string,
  patch: Partial<Pick<StoredDocument, "title" | "content">>,
): Promise<StoredDocument> {
  const existing = await get(id);
  if (!existing) throw new Error("Document introuvable");
  const next: StoredDocument = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() || DEFAULT_TITLE } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    updatedAt: now(),
  };
  await promisify((await store(DOCS, "readwrite")).put(next));
  return next;
}

export async function remove(id: string): Promise<void> {
  const doc = await get(id);
  if (!doc) return;
  await promisify((await store(DOCS, "readwrite")).delete(id));
  // Une image collée dans un autre document reste référencée : on ne
  // supprime que celles qu'aucun document restant n'utilise.
  const stillUsed = new Set((await list()).flatMap((d) => collectImageIds(d.content)));
  const images = await store(IMAGES, "readwrite");
  await Promise.all(
    collectImageIds(doc.content)
      .filter((imageId) => !stillUsed.has(imageId))
      .map((imageId) => promisify(images.delete(imageId))),
  );
}

export async function putImage(blob: Blob): Promise<string> {
  const record: StoredImageRecord = { id: crypto.randomUUID(), type: blob.type, data: await blob.arrayBuffer() };
  await promisify((await store(IMAGES, "readwrite")).put(record));
  return record.id;
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const record = await promisify(
    (await store(IMAGES, "readonly")).get(id) as IDBRequest<StoredImageRecord | undefined>,
  );
  return record ? new Blob([record.data], { type: record.type }) : undefined;
}

export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  await promisify(indexedDB.deleteDatabase(DB_NAME) as unknown as IDBRequest<unknown>);
}

export function __setClockForTests(fn: () => number): void {
  now = fn;
}
```

Remarque : dans `remove`, les suppressions d'images s'enchaînent dans une seule transaction ouverte avant le premier `await` de `Promise.all`. Si fake-indexeddb signale « TransactionInactiveError », il faut ouvrir une nouvelle transaction par suppression (`await promisify((await store(IMAGES, "readwrite")).delete(imageId))` dans une boucle `for…of`).

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/storage/documents.test.ts`
Résultat attendu : 9 tests PASS.

- [ ] **Étape 5 : commiter**

```bash
git add src/storage
git commit -m "feat(storage): documents et images dans IndexedDB"
```

---

### Tâche 3 : conversion entre texte brut et positions ProseMirror

**Fichiers :**
- Créer : `src/analysis/positions.ts`
- Test : `src/analysis/positions.test.ts`

**Interfaces :**
- Consomme : `baseExtensions()` (Tâche 1), `Detection` (`src/types/types.ts`).
- Produit :
  - `interface TextIndex { text: string; toPos(offset: number, bias: "start" | "end"): number | null }`
  - `buildTextIndex(doc: PMNode): TextIndex`
  - `interface MarkerRange { from: number; to: number; detection: Detection }`
  - `toRanges(index: TextIndex, detections: Detection[]): MarkerRange[]`

- [ ] **Étape 1 : écrire le test qui échoue**

`src/analysis/positions.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { baseExtensions } from "../editor/schema";
import { buildTextIndex, toRanges } from "./positions";
import type { Detection } from "../types/types";

const schema = getSchema(baseExtensions());
const docOf = (content: JSONContent[]) => schema.nodeFromJSON({ type: "doc", content });
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text, ...(marks ? { marks } : {}) });

function det(start: number, end: number, id = `d${start}`): Detection {
  return {
    id, type: "lexical", category: "lexical-marker", text: "", start, end,
    score: 50, confidence: 0.7, explanation: "", suggestions: [],
  };
}

/** Plage ProseMirror du premier `needle` dans le texte brut. */
function rangeOf(doc: ReturnType<typeof docOf>, needle: string) {
  const index = buildTextIndex(doc);
  const start = index.text.indexOf(needle);
  expect(start, `"${needle}" absent de ${JSON.stringify(index.text)}`).toBeGreaterThanOrEqual(0);
  const [r] = toRanges(index, [det(start, start + needle.length)]);
  return doc.textBetween(r.from, r.to, "\n");
}

describe("buildTextIndex", () => {
  it("joins textblocks with \\n and ignores marks", () => {
    const doc = docOf([p(t("Un "), t("gras", [{ type: "bold" }]), t(" fin")), p(t("Deux"))]);
    expect(buildTextIndex(doc).text).toBe("Un gras fin\nDeux");
  });

  it("maps hard breaks to \\n and skips images", () => {
    const doc = docOf([
      p(t("l1"), { type: "hardBreak" }, t("l2")),
      { type: "storedImage", attrs: { imageId: "i", width: 1, height: 1, alt: "" } },
      p(t("après")),
    ]);
    expect(buildTextIndex(doc).text).toBe("l1\nl2\naprès");
  });

  it("separates list items and table cells", () => {
    const doc = docOf([
      { type: "bulletList", content: [
        { type: "listItem", content: [p(t("a")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("b"))] }] }] },
      ] },
      { type: "table", content: [{ type: "tableRow", content: [
        { type: "tableCell", content: [p(t("c1"))] },
        { type: "tableCell", content: [p(t("c2"))] },
      ] }] },
    ]);
    expect(buildTextIndex(doc).text).toBe("a\nb\nc1\nc2");
  });
});

describe("toRanges", () => {
  it("maps a word in a single paragraph", () => {
    expect(rangeOf(docOf([p(t("Il faut delve ici"))]), "delve")).toBe("delve");
  });

  it("maps a word in a later paragraph", () => {
    expect(rangeOf(docOf([p(t("Un")), p(t("Deux delve"))]), "delve")).toBe("delve");
  });

  it("maps a range crossing marks", () => {
    const doc = docOf([p(t("a "), t("bold", [{ type: "bold" }]), t(" c"))]);
    expect(rangeOf(doc, "old c")).toBe("old c");
  });

  it("maps a word after a hard break, an image, inside nested lists and table cells", () => {
    const doc = docOf([
      p(t("l1"), { type: "hardBreak" }, t("l2 x")),
      { type: "storedImage", attrs: { imageId: "i", width: 1, height: 1, alt: "" } },
      { type: "bulletList", content: [{ type: "listItem", content: [p(t("item y"))] }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [p(t("cell z"))] }] }] },
    ]);
    expect(rangeOf(doc, "l2 x")).toBe("l2 x");
    expect(rangeOf(doc, "item y")).toBe("item y");
    expect(rangeOf(doc, "cell z")).toBe("cell z");
  });

  it("handles astral characters (UTF-16 surrogate pairs)", () => {
    expect(rangeOf(docOf([p(t("😀 é delve 🎉"))]), "delve")).toBe("delve");
    expect(rangeOf(docOf([p(t("😀 é delve 🎉"))]), "🎉")).toBe("🎉");
  });

  it("maps a range spanning two paragraphs", () => {
    const doc = docOf([p(t("Un")), p(t("Deux"))]);
    const index = buildTextIndex(doc);
    const [r] = toRanges(index, [det(1, 5)]);
    expect(doc.textBetween(r.from, r.to, "\n")).toBe("n\nDeu");
  });

  it("drops invalid ranges", () => {
    const index = buildTextIndex(docOf([p(t("abc"))]));
    expect(toRanges(index, [det(-1, 2), det(2, 2), det(3, 2), det(0, 99)])).toEqual([]);
  });

  it("keeps the detection object on the range", () => {
    const index = buildTextIndex(docOf([p(t("abc"))]));
    const d = det(0, 1, "keep");
    expect(toRanges(index, [d])[0].detection).toBe(d);
  });
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/analysis/positions.test.ts`
Résultat attendu : ÉCHEC avec « Failed to resolve import "./positions" ».

- [ ] **Étape 3 : écrire l'implémentation**

`src/analysis/positions.ts` :

```ts
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Detection } from "../types/types";

/**
 * Correspondance entre le texte brut envoyé au détecteur et les positions
 * ProseMirror. Les deux comptent en unités UTF-16, donc un segment de texte
 * se convertit par simple décalage.
 */
interface Segment {
  textStart: number;
  pmStart: number;
  length: number;
}

export interface TextIndex {
  text: string;
  toPos(offset: number, bias: "start" | "end"): number | null;
}

export interface MarkerRange {
  from: number;
  to: number;
  detection: Detection;
}

export function buildTextIndex(doc: PMNode): TextIndex {
  let text = "";
  const segments: Segment[] = [];
  let firstBlock = true;

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (!firstBlock) text += "\n";
      firstBlock = false;
      return true;
    }
    if (node.isText) {
      segments.push({ textStart: text.length, pmStart: pos, length: node.text!.length });
      text += node.text;
      return false;
    }
    if (node.type.name === "hardBreak") {
      segments.push({ textStart: text.length, pmStart: pos, length: 1 });
      text += "\n";
      return false;
    }
    return true;
  });

  const toPos = (offset: number, bias: "start" | "end"): number | null => {
    if (offset < 0 || offset > text.length) return null;
    if (bias === "start") {
      // Premier segment qui contient l'offset, sinon début du suivant
      for (const s of segments) {
        if (offset < s.textStart + s.length) return s.pmStart + Math.max(0, offset - s.textStart);
      }
      return null;
    }
    // Fin exclusive : dernier segment qui finit à ou après l'offset, sinon fin du précédent
    for (let i = segments.length - 1; i >= 0; i--) {
      const s = segments[i];
      if (offset > s.textStart) return s.pmStart + Math.min(s.length, offset - s.textStart);
    }
    return null;
  };

  return { text, toPos };
}

export function toRanges(index: TextIndex, detections: Detection[]): MarkerRange[] {
  const ranges: MarkerRange[] = [];
  for (const detection of detections) {
    const { start, end } = detection;
    if (start < 0 || end > index.text.length || start >= end) continue;
    const from = index.toPos(start, "start");
    const to = index.toPos(end, "end");
    if (from == null || to == null || from >= to) continue;
    ranges.push({ from, to, detection });
  }
  return ranges;
}
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/analysis/positions.test.ts`
Résultat attendu : 11 tests PASS.

- [ ] **Étape 5 : commiter**

```bash
git add src/analysis/positions.ts src/analysis/positions.test.ts
git commit -m "feat(analysis): correspondance texte brut / positions ProseMirror"
```

---

### Tâche 4 : plugin de marqueurs et utilitaires d'analyse en direct

**Fichiers :**
- Créer : `src/editor/extensions/AiMarkers.ts`
- Créer : `src/analysis/live.ts`
- Créer : `src/analysis/service.ts`
- Modifier : `src/background/index.ts:3-8` (utiliser la fabrique)
- Test : `src/editor/extensions/AiMarkers.test.ts`, `src/analysis/live.test.ts`

**Interfaces :**
- Consomme : `MarkerRange` (Tâche 3), `baseExtensions` (Tâche 1).
- Produit :
  - `type MarkerLevel = "low" | "medium" | "high"`
  - `markerLevel(score: number): MarkerLevel` (≥ 70 high, ≥ 40 medium, sinon low)
  - `aiMarkersKey: PluginKey<AiMarkersState>`
  - `aiMarkersPlugin(): Plugin`
  - `AiMarkers` (extension TipTap)
  - `setMarkers(state: EditorState, ranges: MarkerRange[]): Transaction`
  - `setMarkersVisible(state: EditorState, visible: boolean): Transaction`
  - `markersVisible(state: EditorState): boolean`
  - `visibleDecorations(state: EditorState): DecorationSet`
  - `findMarkerRange(state: EditorState, detectionId: string): { from: number; to: number } | null`
  - `markerAttrs(detection: Detection): Record<string, string>`
  - `analysisDelay(textLength: number): number`
  - `createLatestOnly<T>(): { run(fn: () => Promise<T>): Promise<{ stale: boolean; value: T }>; cancel(): void }`
  - `matchCase(original: string, replacement: string): string`
  - `createDetectorService(): DetectorService`

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/analysis/live.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { analysisDelay, createLatestOnly, matchCase } from "./live";
import { createDetectorService } from "./service";

describe("analysisDelay", () => {
  it("waits 500 ms up to 20 000 chars and 1 500 ms beyond", () => {
    expect(analysisDelay(0)).toBe(500);
    expect(analysisDelay(20_000)).toBe(500);
    expect(analysisDelay(20_001)).toBe(1500);
  });
});

describe("createLatestOnly", () => {
  it("flags an earlier run as stale when a later one started", async () => {
    const latest = createLatestOnly<string>();
    let release!: (v: string) => void;
    const slow = latest.run(() => new Promise<string>((r) => (release = r)));
    const fast = await latest.run(async () => "fast");
    release("slow");
    expect(fast).toEqual({ stale: false, value: "fast" });
    expect(await slow).toEqual({ stale: true, value: "slow" });
  });

  it("cancel() makes the pending run stale", async () => {
    const latest = createLatestOnly<number>();
    const pending = latest.run(async () => 1);
    latest.cancel();
    expect((await pending).stale).toBe(true);
  });
});

describe("matchCase", () => {
  it("copies capitalisation of the original", () => {
    expect(matchCase("Delve", "explore")).toBe("Explore");
    expect(matchCase("DELVE", "explore")).toBe("EXPLORE");
    expect(matchCase("delve", "look into")).toBe("look into");
    expect(matchCase("Él", "il")).toBe("Il");
  });

  it("returns empty replacement unchanged", () => {
    expect(matchCase("Delve", "")).toBe("");
  });
});

describe("createDetectorService", () => {
  it("registers the lexical detector", async () => {
    const result = await createDetectorService().detectAll("Furthermore, this is comprehensive.");
    expect(result.markerCount).toBeGreaterThan(0);
  });
});
```

`src/editor/extensions/AiMarkers.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../schema";
import {
  aiMarkersPlugin, setMarkers, setMarkersVisible, markersVisible, visibleDecorations,
  findMarkerRange, markerLevel, markerAttrs,
} from "./AiMarkers";
import type { Detection } from "../../types/types";

const schema = getSchema(baseExtensions());

function stateWith(text: string) {
  return EditorState.create({
    schema,
    doc: schema.nodeFromJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }),
    plugins: [aiMarkersPlugin()],
  });
}

const det = (id: string, score = 50): Detection => ({
  id, type: "lexical", category: "lexical-marker", text: "", start: 0, end: 0,
  score, confidence: 0.7, explanation: "", suggestions: [],
});

describe("markerLevel", () => {
  it("buckets scores", () => {
    expect(markerLevel(0)).toBe("low");
    expect(markerLevel(39)).toBe("low");
    expect(markerLevel(40)).toBe("medium");
    expect(markerLevel(69)).toBe("medium");
    expect(markerLevel(70)).toBe("high");
  });
});

describe("AiMarkers plugin", () => {
  it("adds inline decorations with level class and detection id, outside history", () => {
    let state = stateWith("Il faut delve ici");
    // « delve » commence à l'offset 8, position ProseMirror 9 (après l'ouverture du paragraphe)
    const tr = setMarkers(state, [{ from: 9, to: 14, detection: det("a", 80) }]);
    expect(tr.getMeta("addToHistory")).toBe(false);
    expect(tr.docChanged).toBe(false);
    state = state.apply(tr);

    const [deco] = visibleDecorations(state).find();
    expect(deco.from).toBe(9);
    expect(deco.to).toBe(14);
    expect(deco.spec.detectionId).toBe("a");
    expect(markerAttrs(det("a", 80))).toEqual({
      class: "to-marker to-marker--high",
      "data-detection-id": "a",
    });
  });

  it("maps markers through edits until the next analysis", () => {
    let state = stateWith("Il faut delve ici");
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: det("a") }]));
    state = state.apply(state.tr.insertText("Oui. ", 1));
    expect(findMarkerRange(state, "a")).toEqual({ from: 14, to: 19 });
    expect(state.doc.textBetween(14, 19)).toBe("delve");
  });

  it("drops a marker whose text was deleted", () => {
    let state = stateWith("Il faut delve ici");
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: det("a") }]));
    state = state.apply(state.tr.delete(9, 14));
    expect(findMarkerRange(state, "a")).toBeNull();
  });

  it("replaces previous markers on a new set", () => {
    let state = stateWith("abc def");
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    state = state.apply(setMarkers(state, [{ from: 5, to: 8, detection: det("b") }]));
    expect(findMarkerRange(state, "a")).toBeNull();
    expect(findMarkerRange(state, "b")).toEqual({ from: 5, to: 8 });
  });

  it("hides decorations without forgetting them", () => {
    let state = stateWith("abc");
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    state = state.apply(setMarkersVisible(state, false));
    expect(markersVisible(state)).toBe(false);
    expect(visibleDecorations(state).find()).toHaveLength(0);
    expect(findMarkerRange(state, "a")).toEqual({ from: 1, to: 4 });
    state = state.apply(setMarkersVisible(state, true));
    expect(visibleDecorations(state).find()).toHaveLength(1);
  });

  it("never alters the document JSON", () => {
    let state = stateWith("abc");
    const before = JSON.stringify(state.doc.toJSON());
    state = state.apply(setMarkers(state, [{ from: 1, to: 4, detection: det("a") }]));
    expect(JSON.stringify(state.doc.toJSON())).toBe(before);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/analysis/live.test.ts src/editor/extensions/AiMarkers.test.ts`
Résultat attendu : ÉCHEC, imports `./live`, `./service` et `./AiMarkers` introuvables.

- [ ] **Étape 3 : créer `src/analysis/live.ts`**

```ts
export function analysisDelay(textLength: number): number {
  return textLength > 20_000 ? 1500 : 500;
}

/**
 * Exécute des tâches asynchrones en signalant comme périmées celles qui ont
 * été dépassées par une exécution plus récente (ou par cancel()).
 */
export function createLatestOnly<T>() {
  let seq = 0;
  return {
    async run(fn: () => Promise<T>): Promise<{ stale: boolean; value: T }> {
      const id = ++seq;
      const value = await fn();
      return { stale: id !== seq, value };
    },
    cancel(): void {
      seq++;
    },
  };
}

/**
 * Le détecteur renvoie un texte en minuscules : on reporte la casse du
 * passage réel du document sur la suggestion.
 */
export function matchCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  const letters = original.replace(/[^\p{L}]/gu, "");
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
    return replacement.toUpperCase();
  }
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
```

- [ ] **Étape 4 : créer `src/analysis/service.ts`**

```ts
import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";

export function createDetectorService(): DetectorService {
  const service = new DetectorService();
  service.register(new LexicalDetector());
  return service;
}
```

- [ ] **Étape 5 : créer `src/editor/extensions/AiMarkers.ts`**

```ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { MarkerRange } from "../../analysis/positions";
import type { Detection } from "../../types/types";

export type MarkerLevel = "low" | "medium" | "high";

export function markerLevel(score: number): MarkerLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

interface AiMarkersState {
  decorations: DecorationSet;
  visible: boolean;
}

type Meta = { type: "set"; ranges: MarkerRange[] } | { type: "visible"; visible: boolean };

export const aiMarkersKey = new PluginKey<AiMarkersState>("aiMarkers");

export function markerAttrs(detection: Detection): Record<string, string> {
  return {
    class: `to-marker to-marker--${markerLevel(detection.score)}`,
    "data-detection-id": detection.id,
  };
}

function toDecoration({ from, to, detection }: MarkerRange): Decoration {
  return Decoration.inline(from, to, markerAttrs(detection), {
    detectionId: detection.id,
    inclusiveStart: false,
    inclusiveEnd: false,
  });
}

/**
 * Marqueurs IA en décorations : ils ne touchent ni au document (donc ni au
 * JSON ni aux exports) ni à l'historique d'annulation.
 */
export function aiMarkersPlugin(): Plugin<AiMarkersState> {
  return new Plugin<AiMarkersState>({
    key: aiMarkersKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, visible: true }),
      apply(tr, value, _old, newState) {
        const meta = tr.getMeta(aiMarkersKey) as Meta | undefined;
        if (meta?.type === "set") {
          return { ...value, decorations: DecorationSet.create(newState.doc, meta.ranges.map(toDecoration)) };
        }
        if (meta?.type === "visible") return { ...value, visible: meta.visible };
        if (tr.docChanged) return { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) };
        return value;
      },
    },
    props: {
      decorations: (state) => visibleDecorations(state),
    },
  });
}

export function visibleDecorations(state: EditorState): DecorationSet {
  const s = aiMarkersKey.getState(state);
  return s?.visible ? s.decorations : DecorationSet.empty;
}

export function markersVisible(state: EditorState): boolean {
  return aiMarkersKey.getState(state)?.visible ?? true;
}

export function setMarkers(state: EditorState, ranges: MarkerRange[]): Transaction {
  return state.tr.setMeta(aiMarkersKey, { type: "set", ranges } satisfies Meta).setMeta("addToHistory", false);
}

export function setMarkersVisible(state: EditorState, visible: boolean): Transaction {
  return state.tr.setMeta(aiMarkersKey, { type: "visible", visible } satisfies Meta).setMeta("addToHistory", false);
}

export function findMarkerRange(state: EditorState, detectionId: string): { from: number; to: number } | null {
  const s = aiMarkersKey.getState(state);
  if (!s) return null;
  const [found] = s.decorations.find(undefined, undefined, (spec) => spec.detectionId === detectionId);
  return found ? { from: found.from, to: found.to } : null;
}

export const AiMarkers = Extension.create({
  name: "aiMarkers",
  addProseMirrorPlugins() {
    return [aiMarkersPlugin()];
  },
});
```

- [ ] **Étape 6 : utiliser la fabrique dans le background**

Dans `src/background/index.ts`, remplacer les lignes :

```ts
import { DetectorService } from "../services/detector";
import { LexicalDetector } from "../detectors/lexical";
import type { AnalysisResult } from "../types/types";

const service = new DetectorService();
service.register(new LexicalDetector());
```

par :

```ts
import { createDetectorService } from "../analysis/service";
import type { AnalysisResult } from "../types/types";

const service = createDetectorService();
```

et remplacer le commentaire d'en-tête « Implémenté dans la Tâche 5 (messagerie background ↔ content script). » par « Sert l'analyse rapide demandée par le popup (ANALYZE_TEXT). »

- [ ] **Étape 7 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run`
Résultat attendu : tous les tests PASS (les 24 existants et les nouveaux).

- [ ] **Étape 8 : commiter**

```bash
git add src/analysis src/editor/extensions/AiMarkers.ts src/editor/extensions/AiMarkers.test.ts src/background/index.ts
git commit -m "feat(analysis): plugin de marqueurs en décorations et utilitaires d'analyse en direct"
```

---

### Tâche 5 : export .docx, texte et blocs

**Fichiers :**
- Créer : `src/export/toDocx.ts`
- Test : `src/export/toDocx.test.ts`

**Interfaces :**
- Consomme : `JSONContent`.
- Produit :
  - `interface DocxOptions { title: string; getImage: (id: string) => Promise<Blob | undefined> }`
  - `buildDocument(content: JSONContent, opts: DocxOptions): Promise<Document>`
  - `toDocx(content: JSONContent, opts: DocxOptions): Promise<Blob>`
  - `toHex(color: string | null | undefined): string | undefined`
  - `toHalfPoints(fontSize: string | null | undefined): number | undefined`

Cette tâche couvre paragraphes, titres, marques de texte, alignement, interligne, citations, retours à la ligne et document vide. La Tâche 6 ajoute listes, liens, tableaux et images dans le même fichier.

- [ ] **Étape 1 : écrire le test qui échoue**

`src/export/toDocx.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import type { JSONContent } from "@tiptap/core";
import { buildDocument, toHex, toHalfPoints, type DocxOptions } from "./toDocx";

const noImages: DocxOptions["getImage"] = async () => undefined;

async function exportZip(content: JSONContent[], getImage = noImages) {
  const doc = await buildDocument({ type: "doc", content }, { title: "T", getImage });
  return JSZip.loadAsync(await Packer.toBuffer(doc));
}

async function documentXml(content: JSONContent[], getImage = noImages) {
  return (await exportZip(content, getImage)).file("word/document.xml")!.async("string");
}

const p = (content: JSONContent[], attrs?: Record<string, unknown>): JSONContent => ({ type: "paragraph", ...(attrs ? { attrs } : {}), content });
const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text, ...(marks ? { marks } : {}) });

describe("toHex", () => {
  it("normalises css colours", () => {
    expect(toHex("#abc")).toBe("AABBCC");
    expect(toHex("#fef08a")).toBe("FEF08A");
    expect(toHex("rgb(255, 0, 16)")).toBe("FF0010");
    expect(toHex("rgba(0,0,0,0.5)")).toBe("000000");
    expect(toHex("red")).toBeUndefined();
    expect(toHex(null)).toBeUndefined();
  });
});

describe("toHalfPoints", () => {
  it("converts pt, px and unitless sizes", () => {
    expect(toHalfPoints("12pt")).toBe(24);
    expect(toHalfPoints("16px")).toBe(24);
    expect(toHalfPoints("14")).toBe(28);
    expect(toHalfPoints("big")).toBeUndefined();
    expect(toHalfPoints(undefined)).toBeUndefined();
  });
});

describe("toDocx — text and blocks", () => {
  it("exports an empty document as one empty paragraph", async () => {
    const xml = await documentXml([]);
    expect(xml).toMatch(/<w:body>.*<w:p[ >]/s);
  });

  it("exports paragraph text", async () => {
    expect(await documentXml([p([t("Bonjour")])])).toMatch(/<w:t[^>]*>Bonjour<\/w:t>/);
  });

  it("exports headings 1-3 as Word heading styles", async () => {
    const xml = await documentXml([1, 2, 3].map((level) => ({ type: "heading", attrs: { level }, content: [t(`H${level}`)] })));
    expect(xml).toMatch(/w:pStyle w:val="Heading1"/);
    expect(xml).toMatch(/w:pStyle w:val="Heading2"/);
    expect(xml).toMatch(/w:pStyle w:val="Heading3"/);
  });

  it("exports bold, italic, underline", async () => {
    const xml = await documentXml([p([t("x", [{ type: "bold" }, { type: "italic" }, { type: "underline" }])])]);
    expect(xml).toMatch(/<w:b\/>/);
    expect(xml).toMatch(/<w:i\/>/);
    expect(xml).toMatch(/<w:u w:val="single"\/>/);
  });

  it("exports font family, size, colour and highlight", async () => {
    const xml = await documentXml([p([t("x", [
      { type: "textStyle", attrs: { fontFamily: "\"Times New Roman\", serif", fontSize: "14pt", color: "#ff0000" } },
      { type: "highlight", attrs: { color: "#fef08a" } },
    ])])]);
    expect(xml).toMatch(/w:ascii="Times New Roman"/);
    expect(xml).toMatch(/<w:sz w:val="28"\/>/);
    expect(xml).toMatch(/<w:color w:val="FF0000"\/>/);
    expect(xml).toMatch(/<w:shd [^>]*w:fill="FEF08A"/);
  });

  it("uses yellow when highlight has no colour", async () => {
    const xml = await documentXml([p([t("x", [{ type: "highlight" }])])]);
    expect(xml).toMatch(/<w:shd [^>]*w:fill="FEF08A"/);
  });

  it("exports alignment and line height", async () => {
    const xml = await documentXml([
      p([t("c")], { textAlign: "center", lineHeight: "1.5" }),
      p([t("j")], { textAlign: "justify" }),
    ]);
    expect(xml).toMatch(/<w:jc w:val="center"\/>/);
    expect(xml).toMatch(/<w:jc w:val="both"\/>/);
    expect(xml).toMatch(/<w:spacing [^>]*w:line="360"/);
  });

  it("exports blockquote paragraphs indented with a left border", async () => {
    const xml = await documentXml([{ type: "blockquote", content: [p([t("cité")])] }]);
    expect(xml).toMatch(/<w:ind w:left="720"/);
    expect(xml).toMatch(/<w:pBdr>.*<w:left /s);
  });

  it("exports hard breaks", async () => {
    const xml = await documentXml([p([t("a"), { type: "hardBreak" }, t("b")])]);
    expect(xml).toMatch(/<w:br\/>/);
  });

  it("sets A4 page with 2.5 cm margins", async () => {
    const xml = await documentXml([p([t("x")])]);
    expect(xml).toMatch(/<w:pgSz [^>]*w:w="11906"[^>]*w:h="16838"/);
    expect(xml).toMatch(/<w:pgMar [^>]*w:top="1417"/);
  });

  it("produces a Blob through toDocx", async () => {
    const { toDocx } = await import("./toDocx");
    const blob = await toDocx({ type: "doc", content: [p([t("x")])] }, { title: "T", getImage: noImages });
    expect(blob.size).toBeGreaterThan(0);
  });
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/export/toDocx.test.ts`
Résultat attendu : ÉCHEC avec « Failed to resolve import "./toDocx" ».

- [ ] **Étape 3 : écrire l'implémentation**

`src/export/toDocx.ts` :

```ts
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat,
  LineRuleType, Packer, Paragraph, ShadingType, TextRun,
  convertMillimetersToTwip, type IRunOptions, type ParagraphChild,
} from "docx";
import type { JSONContent } from "@tiptap/core";

export interface DocxOptions {
  title: string;
  getImage: (id: string) => Promise<Blob | undefined>;
}

type Block = Paragraph | Table;

interface ListContext {
  reference: "bullets" | "numbers";
  level: number;
  instance: number;
}

interface BlockContext {
  quote?: boolean;
  bold?: boolean;
  list?: ListContext;
}

interface ExportContext {
  opts: DocxOptions;
  nextListInstance: number;
}

const PAGE_MARGIN = convertMillimetersToTwip(25); // 1417
const DEFAULT_HIGHLIGHT = "FEF08A";
const INDENT_STEP = 720; // 0,5 pouce en twips

const ALIGNMENTS: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

export function toHex(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const c = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (short) return (short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toUpperCase();
  const long = /^#([0-9a-f]{6})$/i.exec(c);
  if (long) return long[1].toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (rgb) {
    return rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return undefined;
}

export function toHalfPoints(fontSize: string | null | undefined): number | undefined {
  if (!fontSize) return undefined;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(pt|px)?\s*$/i.exec(fontSize);
  if (!m) return undefined;
  const value = Number(m[1]);
  const pt = m[2]?.toLowerCase() === "px" ? value * 0.75 : value;
  return Math.round(pt * 2);
}

function firstFontFamily(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

function runOptions(marks: JSONContent["marks"], bctx: BlockContext): IRunOptions {
  const opts: Record<string, unknown> = {};
  if (bctx.bold) opts.bold = true;
  for (const mark of marks ?? []) {
    const a = mark.attrs ?? {};
    switch (mark.type) {
      case "bold": opts.bold = true; break;
      case "italic": opts.italics = true; break;
      case "underline": opts.underline = {}; break;
      case "textStyle": {
        const font = firstFontFamily(a.fontFamily);
        if (font) opts.font = font;
        const size = toHalfPoints(a.fontSize);
        if (size) opts.size = size;
        const color = toHex(a.color);
        if (color) opts.color = color;
        break;
      }
      case "highlight":
        opts.shading = { type: ShadingType.CLEAR, color: "auto", fill: toHex(a.color) ?? DEFAULT_HIGHLIGHT };
        break;
      case "link":
        opts.color = "0563C1";
        opts.underline = {};
        break;
    }
  }
  return opts as IRunOptions;
}

function inlineChildren(nodes: JSONContent[] | undefined, bctx: BlockContext): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") {
      children.push(new TextRun({ text: "", break: 1 }));
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const run = new TextRun({ text: node.text, ...runOptions(node.marks, bctx) });
    const link = node.marks?.find((m) => m.type === "link");
    const href = typeof link?.attrs?.href === "string" ? link.attrs.href : undefined;
    children.push(href ? new ExternalHyperlink({ link: href, children: [run] }) : run);
  }
  return children;
}

function paragraph(node: JSONContent, bctx: BlockContext, numbered: boolean): Paragraph {
  const a = node.attrs ?? {};
  const level = Number(a.level);
  const lineHeight = Number(a.lineHeight);
  const listIndent = bctx.list ? INDENT_STEP * (bctx.list.level + 1) : 0;
  const quoteIndent = bctx.quote ? INDENT_STEP : 0;
  return new Paragraph({
    children: inlineChildren(node.content, bctx),
    ...(node.type === "heading" && HEADINGS[level - 1] ? { heading: HEADINGS[level - 1] } : {}),
    ...(typeof a.textAlign === "string" && ALIGNMENTS[a.textAlign] ? { alignment: ALIGNMENTS[a.textAlign] } : {}),
    ...(lineHeight > 0 ? { spacing: { line: Math.round(240 * lineHeight), lineRule: LineRuleType.AUTO } } : {}),
    ...(bctx.list && numbered
      ? { numbering: { reference: bctx.list.reference, level: bctx.list.level, instance: bctx.list.instance } }
      : listIndent + quoteIndent > 0
        ? { indent: { left: listIndent + quoteIndent } }
        : {}),
    ...(bctx.quote
      ? { border: { left: { style: BorderStyle.SINGLE, size: 12, color: "CCCCCC", space: 8 } } }
      : {}),
  });
}

async function blocks(nodes: JSONContent[] | undefined, ctx: ExportContext, bctx: BlockContext): Promise<Block[]> {
  const out: Block[] = [];
  for (const node of nodes ?? []) {
    switch (node.type) {
      case "paragraph":
      case "heading":
        out.push(paragraph(node, bctx, false));
        break;
      case "blockquote":
        out.push(...(await blocks(node.content, ctx, { ...bctx, quote: true })));
        break;
      default:
        out.push(...(await blocks(node.content, ctx, bctx)));
    }
  }
  return out;
}

function numberingConfig(reference: "bullets" | "numbers") {
  const bullet = reference === "bullets";
  return {
    reference,
    levels: Array.from({ length: 9 }, (_, level) => ({
      level,
      format: bullet ? LevelFormat.BULLET : LevelFormat.DECIMAL,
      text: bullet ? ["•", "◦", "▪"][level % 3] : `%${level + 1}.`,
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: INDENT_STEP * (level + 1), hanging: 360 } } },
    })),
  };
}

export async function buildDocument(content: JSONContent, opts: DocxOptions): Promise<Document> {
  const ctx: ExportContext = { opts, nextListInstance: 1 };
  const children = await blocks(content.content, ctx, {});
  return new Document({
    title: opts.title,
    numbering: { config: [numberingConfig("bullets"), numberingConfig("numbers")] },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
          },
        },
        children: children.length ? children : [new Paragraph({})],
      },
    ],
  });
}

export async function toDocx(content: JSONContent, opts: DocxOptions): Promise<Blob> {
  return Packer.toBlob(await buildDocument(content, opts));
}
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/export/toDocx.test.ts`
Résultat attendu : 13 tests PASS. Si une regex XML échoue à cause d'un ordre d'attributs différent dans la sortie de `docx`, afficher le XML (`console.log(xml)`), puis ajuster **uniquement la regex** pour qu'elle vérifie la même propriété ; ne jamais affaiblir ce qu'elle contrôle.

- [ ] **Étape 5 : vérifier les types et commiter**

Commande : `npx tsc --noEmit` → aucune erreur.

```bash
git add src/export
git commit -m "feat(export): conversion TipTap vers docx (texte, titres, styles, citations)"
```

---

### Tâche 6 : export .docx, listes, liens, tableaux et images

**Fichiers :**
- Modifier : `src/export/toDocx.ts`
- Modifier : `src/export/toDocx.test.ts` (ajouter des tests)

**Interfaces :**
- Consomme : `buildDocument`, `DocxOptions` (Tâche 5), `aiMarkersPlugin`, `setMarkers` (Tâche 4), `baseExtensions` (Tâche 1).
- Produit : les mêmes signatures, avec une couverture complète des nœuds.

- [ ] **Étape 1 : ajouter les tests qui échouent**

À la fin de `src/export/toDocx.test.ts` :

```ts
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { baseExtensions } from "../editor/schema";
import { aiMarkersPlugin, setMarkers } from "../editor/extensions/AiMarkers";

const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
const numIds = (xml: string) => [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);

// PNG 1×1 transparent
const PNG = Uint8Array.from(atob(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
), (c) => c.charCodeAt(0));

describe("toDocx — lists, links, tables, images", () => {
  it("exports bullet and nested lists with levels", async () => {
    const xml = await documentXml([{ type: "bulletList", content: [
      li(p([t("a")]), { type: "bulletList", content: [li(p([t("b")]))] }),
    ] }]);
    expect(xml).toMatch(/<w:ilvl w:val="0"\/>/);
    expect(xml).toMatch(/<w:ilvl w:val="1"\/>/);
  });

  it("restarts numbering for two separate ordered lists", async () => {
    const xml = await documentXml([
      { type: "orderedList", content: [li(p([t("un")])), li(p([t("deux")]))] },
      p([t("entre")]),
      { type: "orderedList", content: [li(p([t("un bis")]))] },
    ]);
    const ids = numIds(xml);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("indents extra paragraphs of a list item without numbering them", async () => {
    const xml = await documentXml([{ type: "bulletList", content: [li(p([t("a")]), p([t("suite")]))] }]);
    expect(numIds(xml)).toHaveLength(1);
    expect(xml).toMatch(/<w:ind w:left="720"/);
  });

  it("exports links as hyperlinks with relationship", async () => {
    const zip = await exportZip([p([t("site", [{ type: "link", attrs: { href: "https://example.com" } }])])]);
    const xml = await zip.file("word/document.xml")!.async("string");
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(xml).toMatch(/<w:hyperlink [^>]*r:id="[^"]+"/);
    expect(rels).toContain("https://example.com");
  });

  it("exports tables with header cells in bold", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [
        { type: "tableHeader", content: [p([t("H")])] },
        { type: "tableHeader", content: [p([t("H2")])] },
      ] },
      { type: "tableRow", content: [
        { type: "tableCell", content: [p([t("c1")])] },
        { type: "tableCell", content: [p([t("c2")])] },
      ] },
    ] }]);
    expect(xml).toMatch(/<w:tbl>/);
    expect(xml.match(/<w:tr[ >]/g)).toHaveLength(2);
    expect(xml).toMatch(/<w:b\/>.*H<\/w:t>/s);
  });

  it("keeps merged cells from pasted tables", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 2, rowspan: 1 }, content: [p([t("fusion")])] }] },
      { type: "tableRow", content: [
        { type: "tableCell", content: [p([t("a")])] },
        { type: "tableCell", content: [p([t("b")])] },
      ] },
    ] }]);
    expect(xml).toMatch(/<w:gridSpan w:val="2"\/>/);
  });

  it("gives an empty cell an empty paragraph", async () => {
    const xml = await documentXml([{ type: "table", content: [
      { type: "tableRow", content: [{ type: "tableCell", content: [] }] },
    ] }]);
    expect(xml).toMatch(/<w:tc>.*<w:p[ >\/].*<\/w:tc>/s);
  });

  it("embeds stored images scaled to the 16 cm content width", async () => {
    const zip = await exportZip(
      [{ type: "storedImage", attrs: { imageId: "img", width: 1210, height: 605, alt: "" } }],
      async (id) => (id === "img" ? new Blob([PNG], { type: "image/png" }) : undefined),
    );
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:drawing>/);
    // 1210×605 réduit à 605×303 px ; 1 px = 9525 EMU
    expect(xml).toMatch(/<wp:extent cx="5762625" cy="2886075"\/>/);
    expect(Object.keys(zip.files).some((f) => f.startsWith("word/media/"))).toBe(true);
  });

  it("skips missing images and unsupported formats without failing", async () => {
    const xml = await documentXml(
      [
        { type: "storedImage", attrs: { imageId: "missing", width: 10, height: 10, alt: "" } },
        { type: "storedImage", attrs: { imageId: "svg", width: 10, height: 10, alt: "" } },
        p([t("après")]),
      ],
      async (id) => (id === "svg" ? new Blob(["<svg/>"], { type: "image/svg+xml" }) : undefined),
    );
    expect(xml).not.toMatch(/<w:drawing>/);
    expect(xml).toMatch(/après/);
  });

  it("never exports AI markers", async () => {
    const schema = getSchema(baseExtensions());
    let state = EditorState.create({
      schema,
      doc: schema.nodeFromJSON({ type: "doc", content: [p([t("Il faut delve ici")])] }),
      plugins: [aiMarkersPlugin()],
    });
    state = state.apply(setMarkers(state, [{ from: 9, to: 14, detection: {
      id: "a", type: "lexical", category: "lexical-marker", text: "delve", start: 8, end: 13,
      score: 90, confidence: 0.9, explanation: "", suggestions: [],
    } }]));
    const xml = await documentXml(state.doc.toJSON().content);
    expect(xml).not.toMatch(/to-marker|detection/);
    expect(xml).toMatch(/Il faut delve ici/);
  });
});
```

Déplacer les nouvelles lignes `import` en haut du fichier, avec les autres imports.

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

Commande : `npx vitest run src/export/toDocx.test.ts`
Résultat attendu : ÉCHEC des nouveaux tests (pas de `numPr`, ni de `w:tbl`, ni de `w:drawing`).

- [ ] **Étape 3 : implémenter listes, tableaux et images**

Dans `src/export/toDocx.ts` :

(a) Ajouter `ImageRun, Table, TableCell, TableRow, WidthType` à l'import depuis `"docx"`, et ajouter sous `const PAGE_MARGIN` :

```ts
const CONTENT_WIDTH_PX = Math.round((160 / 25.4) * 96); // 16 cm à 96 dpi = 605
```

(b) Ajouter ces fonctions avant `blocks` :

```ts
const IMAGE_TYPES: Record<string, "png" | "jpg" | "gif"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
};

function fitToContent(width: number, height: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: CONTENT_WIDTH_PX, height: Math.round(CONTENT_WIDTH_PX * 0.75) };
  const scale = Math.min(1, CONTENT_WIDTH_PX / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function image(node: JSONContent, ctx: ExportContext): Promise<Block[]> {
  const a = node.attrs ?? {};
  if (typeof a.imageId !== "string") return [];
  const blob = await ctx.opts.getImage(a.imageId);
  const type = blob ? IMAGE_TYPES[blob.type] : undefined;
  // Image absente ou format non pris en charge par docx : on l'ignore
  if (!blob || !type) return [];
  return [
    new Paragraph({
      children: [
        new ImageRun({
          type,
          data: new Uint8Array(await blob.arrayBuffer()),
          transformation: fitToContent(Number(a.width), Number(a.height)),
        }),
      ],
    }),
  ];
}

async function list(node: JSONContent, ctx: ExportContext, bctx: BlockContext): Promise<Block[]> {
  const reference = node.type === "orderedList" ? "numbers" : "bullets";
  const parent = bctx.list;
  const listCtx: ListContext = {
    reference,
    level: parent ? Math.min(8, parent.level + 1) : 0,
    // Une liste imbriquée de même type poursuit l'instance du parent ;
    // une nouvelle liste de premier niveau recommence la numérotation.
    instance: parent && parent.reference === reference ? parent.instance : ctx.nextListInstance++,
  };
  const out: Block[] = [];
  for (const item of node.content ?? []) {
    let numbered = false;
    for (const child of item.content ?? []) {
      if (child.type === "bulletList" || child.type === "orderedList") {
        out.push(...(await list(child, ctx, { ...bctx, list: listCtx })));
      } else if (child.type === "paragraph" || child.type === "heading") {
        out.push(paragraph(child, { ...bctx, list: listCtx }, !numbered));
        numbered = true;
      } else {
        out.push(...(await blocks([child], ctx, { ...bctx, list: listCtx })));
      }
    }
  }
  return out;
}

async function table(node: JSONContent, ctx: ExportContext, bctx: BlockContext): Promise<Block[]> {
  const rows: TableRow[] = [];
  for (const row of node.content ?? []) {
    const cells: TableCell[] = [];
    for (const cell of row.content ?? []) {
      const a = cell.attrs ?? {};
      const children = await blocks(cell.content, ctx, { ...bctx, list: undefined, bold: cell.type === "tableHeader" });
      cells.push(
        new TableCell({
          children: children.length ? children : [new Paragraph({})],
          ...(Number(a.colspan) > 1 ? { columnSpan: Number(a.colspan) } : {}),
          ...(Number(a.rowspan) > 1 ? { rowSpan: Number(a.rowspan) } : {}),
        }),
      );
    }
    if (cells.length) rows.push(new TableRow({ children: cells }));
  }
  return rows.length ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })] : [];
}
```

(c) Dans `blocks`, ajouter ces cas avant `default:` :

```ts
      case "bulletList":
      case "orderedList":
        out.push(...(await list(node, ctx, bctx)));
        break;
      case "table":
        out.push(...(await table(node, ctx, bctx)));
        break;
      case "storedImage":
        out.push(...(await image(node, ctx)));
        break;
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

Commande : `npx vitest run src/export/toDocx.test.ts`
Résultat attendu : 23 tests PASS.

- [ ] **Étape 5 : vérifier les types, puis commiter**

Commande : `npx tsc --noEmit && npx vitest run` → aucune erreur, tous les tests PASS.

```bash
git add src/export
git commit -m "feat(export): listes, liens, tableaux et images dans l'export docx"
```

---

### Tâche 7 : téléchargement et préparation des images

**Fichiers :**
- Créer : `src/export/download.ts`
- Créer : `src/editor/images.ts`
- Test : `src/export/download.test.ts`, `src/editor/images.test.ts`

**Interfaces :**
- Produit :
  - `sanitizeFilename(title: string, ext: string): string`
  - `downloadBlob(blob: Blob, filename: string): void`
  - `ACCEPTED_IMAGE_TYPES: readonly string[]`, `MAX_IMAGE_BYTES = 10 * 1024 * 1024`
  - `validateImage(file: { type: string; size: number }): string | null` (message d'erreur, ou `null` si l'image est valide)
  - `prepareImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }>` (navigateur uniquement)

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/export/download.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "./download";

describe("sanitizeFilename", () => {
  it("removes forbidden characters and collapses spaces", () => {
    expect(sanitizeFilename('Rapport: "final" / v2?', "docx")).toBe("Rapport final v2.docx");
  });
  it("falls back to 'document' when the title is empty", () => {
    expect(sanitizeFilename("  ", "docx")).toBe("document.docx");
    expect(sanitizeFilename("***", "pdf")).toBe("document.pdf");
  });
  it("strips trailing dots and limits length", () => {
    expect(sanitizeFilename("note...", "docx")).toBe("note.docx");
    expect(sanitizeFilename("a".repeat(300), "docx")).toBe(`${"a".repeat(120)}.docx`);
  });
  it("keeps accents", () => {
    expect(sanitizeFilename("Été à Paris", "docx")).toBe("Été à Paris.docx");
  });
});
```

`src/editor/images.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { validateImage, MAX_IMAGE_BYTES } from "./images";

describe("validateImage", () => {
  it("accepts png, jpeg, gif and webp up to 10 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      expect(validateImage({ type, size: MAX_IMAGE_BYTES })).toBeNull();
    }
  });
  it("rejects other types", () => {
    expect(validateImage({ type: "image/svg+xml", size: 10 })).toBe(
      "Format d'image non pris en charge (png, jpeg, gif ou webp).",
    );
    expect(validateImage({ type: "application/pdf", size: 10 })).not.toBeNull();
  });
  it("rejects files over 10 MB", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toBe("Image trop lourde (10 Mo maximum).");
  });
});
```

- [ ] **Étape 2 : lancer les tests pour vérifier qu'ils échouent**

Commande : `npx vitest run src/export/download.test.ts src/editor/images.test.ts`
Résultat attendu : ÉCHEC, modules introuvables.

- [ ] **Étape 3 : créer `src/export/download.ts`**

```ts
export function sanitizeFilename(title: string, ext: string): string {
  const base = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .slice(0, 120)
    .trim();
  return `${base || "document"}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Étape 4 : créer `src/editor/images.ts`**

```ts
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImage(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Format d'image non pris en charge (png, jpeg, gif ou webp).";
  }
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde (10 Mo maximum).";
  return null;
}

/**
 * Lit les dimensions d'origine (nécessaires à l'export .docx) et convertit
 * le webp en png, format que la bibliothèque docx ne sait pas embarquer sinon.
 */
export async function prepareImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.type !== "image/webp") {
    bitmap.close();
    return { blob: file, width, height };
  }
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { blob: await canvas.convertToBlob({ type: "image/png" }), width, height };
}
```

- [ ] **Étape 5 : lancer les tests pour vérifier qu'ils passent**

Commande : `npx vitest run src/export/download.test.ts src/editor/images.test.ts`
Résultat attendu : 7 tests PASS.

- [ ] **Étape 6 : commiter**

```bash
git add src/export/download.ts src/export/download.test.ts src/editor/images.ts src/editor/images.test.ts
git commit -m "feat(editor): nom de fichier d'export sûr, validation et préparation des images"
```

---

### Tâche 8 : page éditeur, chargement des documents et sauvegarde automatique

**Fichiers :**
- Créer : `src/editor/index.html`, `src/editor/main.tsx`, `src/editor/editor.css`
- Créer : `src/editor/Toast.tsx`, `src/editor/useAutosave.ts`, `src/editor/StoredImageView.tsx`, `src/editor/EditorApp.tsx`
- Modifier : `vite.config.ts` (entrée `editor`)

**Interfaces :**
- Consomme : `baseExtensions`, `StoredImage` (Tâche 1), stockage (Tâche 2), `AiMarkers` (Tâche 4), `validateImage` et `prepareImage` (Tâche 7).
- Produit :
  - `ToastProvider`, `useToast(): { show(message: string, kind?: "info" | "warning" | "error"): void }`
  - `type SaveStatus = "saved" | "saving" | "error"`
  - `useAutosave(): { status: SaveStatus; schedule(id: string, patch: Partial<Pick<StoredDocument, "title" | "content">>): void; flush(): Promise<void> }`
  - `editorExtensions(): Extensions` (base, image avec NodeView et AiMarkers)
  - `insertImageFiles(view: EditorView, files: File[], notify: (msg: string) => void, pos?: number): Promise<void>`
  - le composant `EditorApp`, qui contient des emplacements pour la Toolbar (Tâche 9), l'AnalysisPanel (Tâche 10), le DocumentList (Tâche 11) et l'ExportMenu (Tâche 12)

Cette tâche n'a pas de test unitaire (assemblage React). La vérification se fait par build et à la main.

- [ ] **Étape 1 : ajouter l'entrée Vite**

Dans `vite.config.ts`, dans `rollupOptions.input`, ajouter après `popup` :

```ts
        editor: resolve(__dirname, "src/editor/index.html"),
```

(L'entrée `content` est retirée à la Tâche 13.)

- [ ] **Étape 2 : créer `src/editor/index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TextOrigin — Éditeur</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Étape 3 : créer `src/editor/editor.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --sheet-width: 21cm;
  --sheet-padding: 2.5cm;
}

body {
  background: #f1f3f4;
}

.sheet {
  width: var(--sheet-width);
  min-height: 29.7cm;
  padding: var(--sheet-padding);
  background: #fff;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3), 0 4px 8px rgba(60, 64, 67, 0.15);
  margin: 24px auto;
  font-family: Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.15;
  color: #202124;
}

.sheet .ProseMirror {
  outline: none;
  min-height: 24.7cm;
}
.sheet .ProseMirror > * + * { margin-top: 0.5em; }
.sheet h1 { font-size: 20pt; font-weight: 700; }
.sheet h2 { font-size: 16pt; font-weight: 700; }
.sheet h3 { font-size: 13pt; font-weight: 700; }
.sheet ul { list-style: disc; padding-left: 1.5em; }
.sheet ol { list-style: decimal; padding-left: 1.5em; }
.sheet blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #5f6368; }
.sheet a { color: #0563c1; text-decoration: underline; }
.sheet table { border-collapse: collapse; width: 100%; table-layout: fixed; }
.sheet td, .sheet th { border: 1px solid #bdc1c6; padding: 4px 8px; vertical-align: top; }
.sheet th { font-weight: 700; background: #f8f9fa; }
.sheet .selectedCell { background: rgba(26, 115, 232, 0.12); }
.sheet img { max-width: 100%; height: auto; display: block; }
.sheet .ProseMirror-selectednode img { outline: 2px solid #1a73e8; }

/* Marqueurs IA (palette reprise de l'ancien surlignage dans la page) */
.to-marker { border-radius: 2px; cursor: help; }
.to-marker--low { background-color: rgba(96, 165, 250, 0.35); }
.to-marker--medium { background-color: rgba(251, 191, 36, 0.45); }
.to-marker--high { background-color: rgba(239, 68, 68, 0.35); }
.to-marker--focus { outline: 2px solid #4f46e5; }
```

- [ ] **Étape 4 : créer `src/editor/Toast.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "info" | "warning" | "error";
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ToastApi { show(message: string, kind?: ToastKind): void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

const KIND_CLASS: Record<ToastKind, string> = {
  info: "bg-gray-800",
  warning: "bg-verify-500",
  error: "bg-alert-600",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  // Valeur stable : les effets qui dépendent de useToast() ne se relancent pas
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={`${KIND_CLASS[t.kind]} text-white text-sm px-4 py-2 rounded-lg shadow-lg`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => useContext(ToastContext);
```

- [ ] **Étape 5 : créer `src/editor/useAutosave.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { update, type StoredDocument } from "../storage/documents";

export type SaveStatus = "saved" | "saving" | "error";
type Patch = Partial<Pick<StoredDocument, "title" | "content">>;

const SAVE_DELAY = 1000;

/**
 * Sauvegarde différée. En cas d'échec, le contenu reste en attente et
 * repart à la modification suivante ou via flush() (bouton Réessayer).
 */
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pending = useRef<{ id: string; patch: Patch } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    try {
      await update(job.id, job.patch);
      if (!pending.current) setStatus("saved");
    } catch (e) {
      console.error("[TextOrigin] sauvegarde impossible:", e);
      // Les modifications arrivées pendant l'échec priment sur l'ancien patch
      pending.current = {
        id: job.id,
        patch: { ...job.patch, ...(pending.current?.id === job.id ? pending.current.patch : {}) },
      };
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(
    (id: string, patch: Patch) => {
      const merged = pending.current?.id === id ? { ...pending.current.patch, ...patch } : patch;
      if (pending.current && pending.current.id !== id) void flush();
      pending.current = { id, patch: merged };
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  return { status, schedule, flush };
}
```

- [ ] **Étape 6 : créer `src/editor/StoredImageView.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { StoredImage } from "./extensions/StoredImage";
import { getImage, putImage } from "../storage/documents";
import { prepareImage, validateImage } from "./images";

const StoredImageComponent: React.FC<NodeViewProps> = ({ node }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getImage(node.attrs.imageId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [node.attrs.imageId]);

  return (
    <NodeViewWrapper data-drag-handle="">
      {missing ? (
        <div className="border border-dashed border-gray-400 text-gray-500 text-xs p-4 text-center">Image introuvable</div>
      ) : src ? (
        <img src={src} alt={node.attrs.alt} width={node.attrs.width || undefined} />
      ) : (
        <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: `${node.attrs.width || 4} / ${node.attrs.height || 3}` }} />
      )}
    </NodeViewWrapper>
  );
};

export const StoredImageWithView = StoredImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(StoredImageComponent);
  },
});

/** Valide, stocke et insère des fichiers image (collage, dépôt ou bouton). */
export async function insertImageFiles(
  view: EditorView,
  files: File[],
  notify: (message: string) => void,
  pos?: number,
): Promise<void> {
  for (const file of files) {
    const error = validateImage(file);
    if (error) {
      notify(error);
      continue;
    }
    try {
      const { blob, width, height } = await prepareImage(file);
      const imageId = await putImage(blob);
      const node = view.state.schema.nodes.storedImage.create({ imageId, width, height, alt: file.name });
      const tr = pos != null ? view.state.tr.replaceRangeWith(pos, pos, node) : view.state.tr.replaceSelectionWith(node);
      view.dispatch(tr.scrollIntoView());
    } catch (e) {
      console.error("[TextOrigin] insertion d'image impossible:", e);
      notify("Impossible d'insérer l'image.");
    }
  }
}
```

- [ ] **Étape 7 : créer `src/editor/EditorApp.tsx`**

```tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Extensions } from "@tiptap/core";
import { baseExtensions } from "./schema";
import { AiMarkers } from "./extensions/AiMarkers";
import { StoredImageWithView, insertImageFiles } from "./StoredImageView";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { useToast } from "./Toast";
import { create, get, list, type StoredDocument } from "../storage/documents";

export function editorExtensions(): Extensions {
  return [...baseExtensions({ storedImage: StoredImageWithView }), AiMarkers];
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "✓ Enregistré",
  saving: "Enregistrement…",
  error: "⚠ Non enregistré",
};

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

export const EditorApp: React.FC = () => {
  const toast = useToast();
  const { status, schedule, flush } = useAutosave();
  const [current, setCurrent] = useState<StoredDocument | null>(null);
  const [title, setTitle] = useState("");
  const currentId = useRef<string | null>(null);

  const open = useCallback(
    async (doc: StoredDocument) => {
      await flush();
      currentId.current = doc.id;
      setCurrent(doc);
      setTitle(doc.title);
      history.replaceState(null, "", `?doc=${doc.id}`);
      document.title = `${doc.title} — TextOrigin`;
    },
    [flush],
  );

  // Un éditeur neuf par document : l'historique d'annulation ne déborde
  // jamais d'un document à l'autre.
  const editor = useEditor(
    {
      extensions: editorExtensions(),
      content: current?.content ?? null,
      editable: current != null,
      onUpdate: ({ editor }) => {
        if (currentId.current) schedule(currentId.current, { content: editor.getJSON() });
      },
      editorProps: {
        attributes: { spellcheck: "true", "aria-label": "Document" },
        handlePaste: (view, event) => {
          const files = imageFiles(event.clipboardData?.files);
          if (!files.length) return false;
          void insertImageFiles(view, files, (m) => toast.show(m, "error"));
          return true;
        },
        handleDrop: (view, event) => {
          const files = imageFiles(event.dataTransfer?.files);
          if (!files.length) return false;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          void insertImageFiles(view, files, (m) => toast.show(m, "error"), pos);
          return true;
        },
      },
    },
    [current?.id],
  );

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      const wanted = new URLSearchParams(location.search).get("doc");
      let doc = wanted ? await get(wanted) : undefined;
      if (wanted && !doc) toast.show("Document introuvable", "warning");
      doc ??= (await list())[0] ?? (await create());
      await open(doc);
    })().catch((e) => {
      console.error("[TextOrigin] stockage indisponible:", e);
      toast.show("Stockage local indisponible : vos modifications ne seront pas enregistrées.", "error");
    });
  }, [open, toast]);

  const rename = (value: string) => {
    setTitle(value);
    if (!currentId.current) return;
    schedule(currentId.current, { title: value });
    document.title = `${value.trim() || "Sans titre"} — TextOrigin`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* DocumentList (Tâche 11) */}
          <input
            value={title}
            onChange={(e) => rename(e.target.value)}
            aria-label="Titre du document"
            className="text-lg px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none min-w-0 flex-1 max-w-md"
          />
          <span className={`text-xs ${status === "error" ? "text-alert-600" : "text-gray-500"}`} role="status">
            {STATUS_LABEL[status]}
          </span>
          {status === "error" && (
            <button onClick={() => void flush()} className="text-xs underline text-alert-600">
              Réessayer
            </button>
          )}
          <div className="flex-1" />
          {/* ExportMenu (Tâche 12) */}
        </div>
        {/* Toolbar (Tâche 9) */}
      </header>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-auto">
          <div className="sheet">
            <EditorContent editor={editor} />
          </div>
        </main>
        {/* AnalysisPanel (Tâche 10) */}
      </div>
    </div>
  );
};
```

- [ ] **Étape 8 : créer `src/editor/main.tsx`**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { EditorApp } from "./EditorApp";
import { ToastProvider } from "./Toast";
import "./editor.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <EditorApp />
    </ToastProvider>
  </React.StrictMode>,
);
```

- [ ] **Étape 9 : build et vérification manuelle**

Commande : `npm run build`
Résultat attendu : build OK, `dist/src/editor/index.html` présent.

Vérification manuelle :
1. Recharger l'extension dans `chrome://extensions`.
2. Ouvrir `chrome-extension://<id>/src/editor/index.html`. Une feuille blanche s'affiche, l'URL prend `?doc=…`.
3. Taper du texte : « Enregistrement… » puis « ✓ Enregistré ». Recharger : le texte est toujours là.
4. Coller une image png : elle s'affiche. Recharger : elle est toujours là.
5. Ouvrir `?doc=inexistant` : toast « Document introuvable », puis ouverture du dernier document.

- [ ] **Étape 10 : commiter**

```bash
git add vite.config.ts src/editor
git commit -m "feat(editor): page éditeur, chargement des documents et sauvegarde automatique"
```

---

### Tâche 9 : barre d'outils de mise en forme

**Fichiers :**
- Créer : `src/editor/Toolbar.tsx`
- Modifier : `src/editor/EditorApp.tsx` (insérer `<Toolbar>`)

**Interfaces :**
- Consomme : `Editor` de `@tiptap/react` ; `FONT_FAMILIES`, `FONT_SIZES` (Tâche 1) ; `LINE_HEIGHTS` (Tâche 1) ; `insertImageFiles` (Tâche 8) ; `useToast` (Tâche 8).
- Produit : `Toolbar: React.FC<{ editor: Editor | null }>`.

- [ ] **Étape 1 : créer `src/editor/Toolbar.tsx`**

```tsx
import React, { useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { FONT_FAMILIES, FONT_SIZES } from "./schema";
import { LINE_HEIGHTS } from "./extensions/ParagraphLineHeight";
import { insertImageFiles } from "./StoredImageView";
import { useToast } from "./Toast";

const TEXT_COLORS = ["#202124", "#d93025", "#e37400", "#188038", "#1a73e8", "#9334e6", "#80868b"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];

const Btn: React.FC<{
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}> = ({ label, active, disabled, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`h-8 min-w-8 px-1.5 rounded text-sm ${active ? "bg-primary-100 text-primary-700" : "hover:bg-gray-100"} disabled:opacity-40`}
  >
    {children}
  </button>
);

const Sep = () => <span className="w-px h-5 bg-gray-300 mx-1" aria-hidden="true" />;

const Swatches: React.FC<{ label: string; colors: string[]; onPick: (c: string | null) => void; children: React.ReactNode }> = ({
  label, colors, onPick, children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Btn label={label} onClick={() => setOpen((o) => !o)}>{children}</Btn>
      {open && (
        <div className="absolute top-9 left-0 z-30 bg-white shadow-lg rounded p-2 flex gap-1" onMouseLeave={() => setOpen(false)}>
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(c); setOpen(false); }}
              className="w-5 h-5 rounded border border-gray-300"
              style={{ background: c }}
            />
          ))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(null); setOpen(false); }} className="text-xs px-1">
            Aucune
          </button>
        </div>
      )}
    </div>
  );
};

export const Toolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            table: e.isActive("table"),
            heading: ([1, 2, 3] as const).find((level) => e.isActive("heading", { level })) ?? 0,
            align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
            font: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
            size: ((e.getAttributes("textStyle").fontSize as string | undefined) ?? "").replace("pt", ""),
            lineHeight: (e.getAttributes("paragraph").lineHeight as string | undefined) ?? "",
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !s) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1 bg-gray-50 border-t border-gray-200" role="toolbar" aria-label="Mise en forme">
      <Btn label="Annuler (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>↶</Btn>
      <Btn label="Rétablir (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>↷</Btn>
      <Sep />
      <select
        aria-label="Style de paragraphe"
        value={s.heading}
        onChange={(e) => {
          const level = Number(e.target.value) as 0 | 1 | 2 | 3;
          if (level === 0) chain().setParagraph().run();
          else chain().setHeading({ level }).run();
        }}
        className="h-8 text-sm bg-transparent rounded hover:bg-gray-100 px-1"
      >
        <option value={0}>Texte normal</option>
        <option value={1}>Titre 1</option>
        <option value={2}>Titre 2</option>
        <option value={3}>Titre 3</option>
      </select>
      <select
        aria-label="Police"
        value={s.font}
        onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
        className="h-8 text-sm bg-transparent rounded hover:bg-gray-100 px-1 w-36"
      >
        <option value="">Police par défaut</option>
        {FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <select
        aria-label="Taille"
        value={s.size}
        onChange={(e) => (e.target.value ? chain().setFontSize(`${e.target.value}pt`).run() : chain().unsetFontSize().run())}
        className="h-8 text-sm bg-transparent rounded hover:bg-gray-100 px-1 w-16"
      >
        <option value="">11</option>
        {FONT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <Sep />
      <Btn label="Gras (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italique (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Souligné (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}><u>U</u></Btn>
      <Swatches label="Couleur du texte" colors={TEXT_COLORS} onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())}>A</Swatches>
      <Swatches label="Surlignage" colors={HIGHLIGHTS} onPick={(c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run())}>🖍</Swatches>
      <Sep />
      <select
        aria-label="Alignement"
        value={s.align}
        onChange={(e) => chain().setTextAlign(e.target.value).run()}
        className="h-8 text-sm bg-transparent rounded hover:bg-gray-100 px-1"
      >
        <option value="left">Gauche</option>
        <option value="center">Centré</option>
        <option value="right">Droite</option>
        <option value="justify">Justifié</option>
      </select>
      <select
        aria-label="Interligne"
        value={s.lineHeight}
        onChange={(e) => (e.target.value ? chain().setParagraphLineHeight(e.target.value).run() : chain().unsetParagraphLineHeight().run())}
        className="h-8 text-sm bg-transparent rounded hover:bg-gray-100 px-1"
      >
        <option value="">Interligne</option>
        {LINE_HEIGHTS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <Sep />
      <Btn label="Liste à puces" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>•</Btn>
      <Btn label="Liste numérotée" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>1.</Btn>
      <Btn label="Citation" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>❝</Btn>
      <Sep />
      <LinkButton editor={editor} active={s.link} />
      <Btn label="Insérer une image" onClick={() => fileInput.current?.click()}>🖼</Btn>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void insertImageFiles(editor.view, files, (m) => toast.show(m, "error"));
        }}
      />
      <Btn label="Insérer un tableau" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>⊞</Btn>
      {s.table && (
        <>
          <Btn label="Ajouter une ligne" onClick={() => chain().addRowAfter().run()}>+L</Btn>
          <Btn label="Supprimer la ligne" onClick={() => chain().deleteRow().run()}>−L</Btn>
          <Btn label="Ajouter une colonne" onClick={() => chain().addColumnAfter().run()}>+C</Btn>
          <Btn label="Supprimer la colonne" onClick={() => chain().deleteColumn().run()}>−C</Btn>
          <Btn label="Supprimer le tableau" onClick={() => chain().deleteTable().run()}>✕⊞</Btn>
        </>
      )}
    </div>
  );
};

/** Saisie d'URL en ligne (pas de prompt() natif). */
const LinkButton: React.FC<{ editor: Editor; active: boolean }> = ({ editor, active }) => {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  if (active) {
    return <Btn label="Retirer le lien" active onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>🔗</Btn>;
  }
  return (
    <div className="relative">
      <Btn label="Insérer un lien" onClick={() => setOpen((o) => !o)}>🔗</Btn>
      {open && (
        <form
          className="absolute top-9 left-0 z-30 bg-white shadow-lg rounded p-2 flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const url = href.trim();
            if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run();
            setHref("");
            setOpen(false);
          }}
        >
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://…"
            aria-label="Adresse du lien"
            className="border rounded px-2 py-1 text-sm w-64"
          />
          <button type="submit" className="text-sm px-2 bg-primary-600 text-white rounded">OK</button>
        </form>
      )}
    </div>
  );
};
```

- [ ] **Étape 2 : brancher la barre dans `EditorApp.tsx`**

Ajouter l'import `import { Toolbar } from "./Toolbar";` et remplacer `{/* Toolbar (Tâche 9) */}` par :

```tsx
        <Toolbar editor={editor} />
```

- [ ] **Étape 3 : build et vérification manuelle**

Commande : `npx tsc --noEmit && npm run build` → OK.

Vérification manuelle (après rechargement de l'extension) : chaque contrôle s'applique et se voit sur la sélection, puis Ctrl+Z l'annule :
- Titre 1, 2, 3 ;
- police (6) et taille ;
- gras, italique, souligné ;
- couleur et surlignage ;
- les 4 alignements ;
- les 4 interlignes ;
- listes à puces et numérotées (avec Tab pour imbriquer), citation ;
- lien (saisie « example.com », qui devient `https://example.com`) ;
- image par le bouton ;
- tableau 3×3 et ajout ou suppression de lignes et de colonnes.

- [ ] **Étape 4 : commiter**

```bash
git add src/editor/Toolbar.tsx src/editor/EditorApp.tsx
git commit -m "feat(editor): barre d'outils de mise en forme"
```

---

### Tâche 10 : panneau d'analyse en direct, infobulle et suggestions

**Fichiers :**
- Créer : `src/editor/useLiveAnalysis.ts`
- Créer : `src/editor/AnalysisPanel.tsx`
- Créer : `src/editor/MarkerTooltip.tsx`
- Modifier : `src/editor/EditorApp.tsx`

**Interfaces :**
- Consomme : `buildTextIndex`, `toRanges` (Tâche 3) ; `setMarkers`, `setMarkersVisible`, `markersVisible`, `findMarkerRange`, `markerLevel` (Tâche 4) ; `analysisDelay`, `createLatestOnly`, `matchCase`, `createDetectorService` (Tâche 4).
- Produit :
  - `type AnalysisState = "empty" | "running" | "ready" | "error"`
  - `useLiveAnalysis(editor: Editor | null): { result: AnalysisResult | null; state: AnalysisState; sourceText: string }`
  - `AnalysisPanel: React.FC<{ editor: Editor | null; analysis: ReturnType<typeof useLiveAnalysis> }>`
  - `MarkerTooltip: React.FC<{ editor: Editor | null; result: AnalysisResult | null; sourceText: string }>`
  - `applySuggestion(editor: Editor, detection: Detection, original: string, replacement: string): boolean`

- [ ] **Étape 1 : créer `src/editor/useLiveAnalysis.ts`**

```ts
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult } from "../types/types";
import { buildTextIndex, toRanges } from "../analysis/positions";
import { analysisDelay, createLatestOnly } from "../analysis/live";
import { createDetectorService } from "../analysis/service";
import { setMarkers } from "./extensions/AiMarkers";

export type AnalysisState = "empty" | "running" | "ready" | "error";

const service = createDetectorService();

/**
 * Analyse différée du document : le détecteur tourne dans la page, sans
 * passer par le background. Une réponse dépassée par une frappe plus
 * récente est ignorée.
 */
export function useLiveAnalysis(editor: Editor | null) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AnalysisState>("empty");
  const [sourceText, setSourceText] = useState("");

  useEffect(() => {
    if (!editor) return;
    const latest = createLatestOnly<AnalysisResult>();
    let timer: number | undefined;

    const run = async () => {
      if (editor.isDestroyed) return;
      const index = buildTextIndex(editor.state.doc);
      if (!index.text.trim()) {
        latest.cancel();
        editor.view.dispatch(setMarkers(editor.state, []));
        setResult(null);
        setSourceText("");
        setState("empty");
        return;
      }
      setState("running");
      try {
        const { stale, value } = await latest.run(() => service.detectAll(index.text));
        if (stale || editor.isDestroyed) return;
        const fresh = buildTextIndex(editor.state.doc);
        if (fresh.text !== index.text) return; // le texte a changé : une autre analyse suit
        editor.view.dispatch(setMarkers(editor.state, toRanges(fresh, value.detections)));
        setResult(value);
        setSourceText(fresh.text);
        setState("ready");
      } catch (e) {
        console.error("[TextOrigin] analyse impossible:", e);
        setState("error");
      }
    };

    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, analysisDelay(editor.state.doc.textContent.length));
    };

    editor.on("update", onUpdate);
    void run();
    return () => {
      window.clearTimeout(timer);
      latest.cancel();
      editor.off("update", onUpdate);
    };
  }, [editor]);

  return { result, state, sourceText };
}
```

- [ ] **Étape 2 : créer `src/editor/AnalysisPanel.tsx`**

```tsx
import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Detection, DetectionCategory } from "../types/types";
import { findMarkerRange, markerLevel, markersVisible, setMarkersVisible } from "./extensions/AiMarkers";
import { matchCase } from "../analysis/live";
import type { useLiveAnalysis } from "./useLiveAnalysis";

export const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Structure discursive",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

const LEVEL_DOT = { low: "bg-blue-400", medium: "bg-amber-400", high: "bg-red-500" } as const;
const CONFIDENCE_LABEL: Record<string, string> = { high: "Haute", medium: "Moyenne", low: "Faible" };

export function scoreColor(score: number): string {
  return score < 21 ? "text-natural-500" : score < 41 ? "text-primary-500" : score < 61 ? "text-verify-500" : "text-alert-500";
}

/** Remplace le passage marqué ; transaction normale, donc annulable par Ctrl+Z. */
export function applySuggestion(editor: Editor, detection: Detection, original: string, replacement: string): boolean {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return false;
  const text = matchCase(original, replacement);
  const tr = text
    ? editor.state.tr.insertText(text, range.from, range.to)
    : editor.state.tr.delete(range.from, range.to);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

function reveal(editor: Editor, detection: Detection) {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return;
  editor.chain().focus().setTextSelection(range).scrollIntoView().run();
}

export const AnalysisPanel: React.FC<{ editor: Editor | null; analysis: ReturnType<typeof useLiveAnalysis> }> = ({
  editor, analysis,
}) => {
  const { result, state, sourceText } = analysis;
  const [visible, setVisible] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleVisible = () => {
    if (!editor) return;
    const next = !markersVisible(editor.state);
    editor.view.dispatch(setMarkersVisible(editor.state, next));
    setVisible(next);
  };

  const detections = [...(result?.detections ?? [])].sort((a, b) => a.start - b.start);

  return (
    <aside className="no-print w-80 shrink-0 border-l border-gray-200 bg-white overflow-auto" aria-label="Analyse">
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analyse</h2>

        {state === "empty" && <p className="text-sm text-gray-500">Écrivez ou collez du texte pour l'analyser.</p>}
        {state === "error" && <p className="text-sm text-alert-600" role="alert">Analyse indisponible. Nouvel essai à la prochaine modification.</p>}

        {result && state !== "empty" && (
          <>
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor(result.totalScore)}`}>{result.totalScore}<span className="text-base text-gray-400">/100</span></div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">AI Marker Score</div>
              <div className="text-xs text-gray-500 mt-1">
                Confiance : {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}
                {state === "running" && " · mise à jour…"}
              </div>
            </div>

            <ul className="text-sm space-y-1">
              {(Object.keys(CATEGORY_LABEL) as DetectionCategory[])
                .filter((c) => result.categories[c] > 0)
                .map((c) => (
                  <li key={c} className="flex justify-between">
                    <span>{CATEGORY_LABEL[c]}</span>
                    <span className="font-medium">{result.categories[c]}</span>
                  </li>
                ))}
            </ul>

            <button onClick={toggleVisible} className="w-full text-sm py-1.5 rounded border border-gray-300 hover:bg-gray-50">
              {visible ? "Masquer les marqueurs" : "Afficher les marqueurs"}
            </button>

            {detections.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun marqueur détecté.</p>
            ) : (
              <ul className="space-y-2">
                {detections.map((d) => {
                  const original = sourceText.slice(d.start, d.end) || d.text;
                  return (
                    <li key={d.id} className="border rounded-lg p-2 text-sm">
                      <button
                        className="w-full text-left flex items-center gap-2"
                        onClick={() => { if (editor) reveal(editor, d); setOpenId(openId === d.id ? null : d.id); }}
                      >
                        <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[markerLevel(d.score)]}`} aria-hidden="true" />
                        <span className="font-medium">« {original} »</span>
                        <span className="ml-auto text-xs text-gray-500">{CATEGORY_LABEL[d.category]}</span>
                      </button>
                      {openId === d.id && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-gray-600">{d.explanation}</p>
                          <div className="flex flex-wrap gap-1">
                            {d.suggestions.map((s) => (
                              <button
                                key={s.text}
                                title={s.reason}
                                onClick={() => editor && applySuggestion(editor, d, original, s.text)}
                                className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100"
                              >
                                {s.text ? `→ ${matchCase(original, s.text)}` : "Supprimer"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
```

- [ ] **Étape 3 : créer `src/editor/MarkerTooltip.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult, Detection } from "../types/types";
import { CATEGORY_LABEL } from "./AnalysisPanel";
import { matchCase } from "../analysis/live";

interface Hover { detection: Detection; x: number; y: number }

/** Infobulle au survol d'un marqueur : explication et suggestions. */
export const MarkerTooltip: React.FC<{ editor: Editor | null; result: AnalysisResult | null; sourceText: string }> = ({
  editor, result, sourceText,
}) => {
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    if (!editor || !result) return;
    const root = editor.view.dom;
    const byId = new Map(result.detections.map((d) => [d.id, d]));
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-detection-id]");
      const detection = el && byId.get(el.dataset.detectionId!);
      if (!el || !detection) return setHover(null);
      const rect = el.getBoundingClientRect();
      setHover({ detection, x: rect.left, y: rect.bottom + 6 });
    };
    const onLeave = () => setHover(null);
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [editor, result]);

  if (!hover) return null;
  const { detection: d } = hover;
  const original = sourceText.slice(d.start, d.end) || d.text;
  return (
    <div
      role="tooltip"
      className="no-print fixed z-40 max-w-xs bg-gray-800 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none"
      style={{ left: Math.min(hover.x, window.innerWidth - 330), top: hover.y }}
    >
      <div className="text-blue-300 mb-1">{CATEGORY_LABEL[d.category]} · score {d.score}</div>
      <p className="mb-2">{d.explanation}</p>
      {d.suggestions.length > 0 && (
        <p className="text-gray-300">Suggestions : {d.suggestions.map((s) => matchCase(original, s.text) || "supprimer").join(", ")}</p>
      )}
    </div>
  );
};
```

- [ ] **Étape 4 : brancher le panneau dans `EditorApp.tsx`**

Ajouter les imports :

```tsx
import { AnalysisPanel } from "./AnalysisPanel";
import { MarkerTooltip } from "./MarkerTooltip";
import { useLiveAnalysis } from "./useLiveAnalysis";
```

Juste après la déclaration de `editor`, ajouter :

```tsx
  const analysis = useLiveAnalysis(editor);
```

Remplacer `{/* AnalysisPanel (Tâche 10) */}` par :

```tsx
        <AnalysisPanel editor={editor} analysis={analysis} />
        <MarkerTooltip editor={editor} result={analysis.result} sourceText={analysis.sourceText} />
```

- [ ] **Étape 5 : build et vérification manuelle**

Commande : `npx tsc --noEmit && npm run build && npx vitest run` → OK.

Vérification manuelle avec le texte « Furthermore, we must delve into this comprehensive topic. » :
1. Environ une demi-seconde après la frappe, les 3 mots sont surlignés et le panneau affiche le score, les catégories et la liste.
2. Au survol de « delve », l'infobulle affiche l'explication et les suggestions.
3. Un clic sur « Furthermore » dans le panneau sélectionne le mot dans le document.
4. « → Explore » sur « delve » remplace le mot (minuscule conservée) ; « Furthermore » est remplacé avec une majuscule. Ctrl+Z rétablit.
5. « Masquer les marqueurs » retire les surlignages, le score reste affiché.
6. Ctrl+Z après l'analyse n'annule pas l'apparition des marqueurs (ils ne sont pas dans l'historique).
7. Vider le document : « Écrivez ou collez du texte pour l'analyser. »

- [ ] **Étape 6 : commiter**

```bash
git add src/editor
git commit -m "feat(editor): panneau d'analyse en direct, infobulle et application des suggestions"
```

---

### Tâche 11 : tiroir « Mes documents »

**Fichiers :**
- Créer : `src/editor/DocumentList.tsx`
- Modifier : `src/editor/EditorApp.tsx`

**Interfaces :**
- Consomme : `list`, `create`, `update`, `remove`, `StoredDocument` (Tâche 2) ; `useToast` (Tâche 8).
- Produit : `DocumentList: React.FC<{ currentId: string | null; onOpen(doc: StoredDocument): void; onCurrentRenamed(title: string): void; beforeAction(): Promise<void> }>`.

- [ ] **Étape 1 : créer `src/editor/DocumentList.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from "react";
import { create, list, remove, update, type StoredDocument } from "../storage/documents";
import { useToast } from "./Toast";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export const DocumentList: React.FC<{
  currentId: string | null;
  onOpen: (doc: StoredDocument) => void;
  onCurrentRenamed: (title: string) => void;
  beforeAction: () => Promise<void>;
}> = ({ currentId, onOpen, onCurrentRenamed, beforeAction }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await beforeAction(); // la liste reflète la dernière sauvegarde
      setDocs(await list());
    } catch {
      toast.show("Impossible de lire vos documents.", "error");
    }
  }, [beforeAction, toast]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      await refresh();
    } catch (e) {
      console.error("[TextOrigin] action document:", e);
      toast.show("L'opération a échoué.", "error");
    }
  };

  const newDoc = () =>
    run(async () => {
      const doc = await create();
      onOpen(doc);
      setOpen(false);
    });

  const saveRename = () =>
    renaming &&
    run(async () => {
      const doc = await update(renaming.id, { title: renaming.title });
      if (doc.id === currentId) onCurrentRenamed(doc.title);
      setRenaming(null);
    });

  const doDelete = (id: string) =>
    run(async () => {
      await remove(id);
      setConfirmDelete(null);
      if (id === currentId) onOpen((await list())[0] ?? (await create()));
    });

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Mes documents" title="Mes documents" className="h-9 w-9 rounded hover:bg-gray-100 text-xl">
        ☰
      </button>
      {open && (
        <div className="no-print fixed inset-0 z-40 flex" role="dialog" aria-label="Mes documents">
          <div className="w-96 max-w-full bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Mes documents</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-xl px-2">×</button>
            </div>
            <div className="p-4">
              <button onClick={() => void newDoc()} className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
                + Nouveau document
              </button>
            </div>
            <ul className="flex-1 overflow-auto px-2 pb-4">
              {docs.map((d) => (
                <li key={d.id} className={`group rounded-lg p-2 ${d.id === currentId ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                  {renaming?.id === d.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); void saveRename(); }} className="flex gap-1">
                      <input
                        autoFocus
                        value={renaming.title}
                        onChange={(e) => setRenaming({ id: d.id, title: e.target.value })}
                        aria-label="Nouveau titre"
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                      <button type="submit" className="text-sm px-2">OK</button>
                    </form>
                  ) : confirmDelete === d.id ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-1">Supprimer « {d.title} » ?</span>
                      <button onClick={() => void doDelete(d.id)} className="text-alert-600 font-medium">Supprimer</button>
                      <button onClick={() => setConfirmDelete(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => { if (d.id !== currentId) onOpen(d); setOpen(false); }}
                      >
                        <div className="text-sm font-medium truncate">{d.title}</div>
                        <div className="text-xs text-gray-500">{dateFmt.format(d.updatedAt)}</div>
                      </button>
                      <button onClick={() => setRenaming({ id: d.id, title: d.title })} className="text-xs opacity-0 group-hover:opacity-100 focus:opacity-100">Renommer</button>
                      <button onClick={() => setConfirmDelete(d.id)} className="text-xs text-alert-600 opacity-0 group-hover:opacity-100 focus:opacity-100">Supprimer</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
};
```

- [ ] **Étape 2 : brancher le tiroir dans `EditorApp.tsx`**

Ajouter l'import `import { DocumentList } from "./DocumentList";`. Puis remplacer `{/* DocumentList (Tâche 11) */}` par :

```tsx
          <DocumentList
            currentId={current?.id ?? null}
            onOpen={(doc) => void open(doc)}
            onCurrentRenamed={(t) => { setTitle(t); document.title = `${t} — TextOrigin`; }}
            beforeAction={flush}
          />
```

Remarque : `open()` appelle `flush()` avant de changer de document, donc les modifications en attente du document courant sont enregistrées.

- [ ] **Étape 3 : build et vérification manuelle**

Commande : `npx tsc --noEmit && npm run build` → OK.

Vérification manuelle :
1. Avec ☰ → « Nouveau document » : un document vide s'ouvre et l'URL change.
2. Taper dans le document B puis rouvrir le document A : son contenu est intact. **Ctrl+Z dans A ne fait pas réapparaître le texte de B.**
3. Renommer le document courant : le titre de l'en-tête suit.
4. Supprimer le document courant (confirmation dans l'interface) : le document suivant s'ouvre.
5. Supprimer le dernier document : un document vide est créé.

- [ ] **Étape 4 : commiter**

```bash
git add src/editor/DocumentList.tsx src/editor/EditorApp.tsx
git commit -m "feat(editor): tiroir Mes documents (créer, ouvrir, renommer, supprimer)"
```

---

### Tâche 12 : menu Exporter (.docx et PDF)

**Fichiers :**
- Créer : `src/editor/ExportMenu.tsx`
- Créer : `src/editor/print.css`
- Modifier : `src/editor/main.tsx` (importer `print.css`)
- Modifier : `src/editor/EditorApp.tsx`

**Interfaces :**
- Consomme : `toDocx` (Tâches 5 et 6) ; `sanitizeFilename`, `downloadBlob` (Tâche 7) ; `getImage` (Tâche 2) ; `useToast` (Tâche 8).
- Produit : `ExportMenu: React.FC<{ editor: Editor | null; title: string }>`.

- [ ] **Étape 1 : créer `src/editor/print.css`**

```css
@page {
  size: A4;
  margin: 2.5cm;
}

@media print {
  html, body {
    background: #fff !important;
  }
  .no-print {
    display: none !important;
  }
  main {
    overflow: visible !important;
  }
  .sheet {
    width: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
  .sheet .ProseMirror {
    min-height: 0;
  }
  /* Les marqueurs IA ne s'impriment jamais */
  .to-marker {
    background: none !important;
    outline: none !important;
  }
  .sheet img,
  .sheet tr,
  .sheet blockquote {
    break-inside: avoid;
  }
  .sheet h1, .sheet h2, .sheet h3 {
    break-after: avoid;
  }
  .ProseMirror-selectednode img {
    outline: none !important;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Étape 2 : importer la feuille d'impression**

Dans `src/editor/main.tsx`, après `import "./editor.css";`, ajouter :

```tsx
import "./print.css";
```

- [ ] **Étape 3 : créer `src/editor/ExportMenu.tsx`**

```tsx
import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import { toDocx } from "../export/toDocx";
import { downloadBlob, sanitizeFilename } from "../export/download";
import { getImage } from "../storage/documents";
import { useToast } from "./Toast";

const PRINT_HINT_KEY = "textorigin:print-hint-shown";

export const ExportMenu: React.FC<{ editor: Editor | null; title: string }> = ({ editor, title }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportDocx = async () => {
    if (!editor) return;
    setOpen(false);
    setBusy(true);
    try {
      const blob = await toDocx(editor.getJSON(), { title, getImage });
      downloadBlob(blob, sanitizeFilename(title, "docx"));
    } catch (e) {
      console.error("[TextOrigin] export docx:", e);
      toast.show(`Export Word impossible : ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = () => {
    setOpen(false);
    try {
      if (!localStorage.getItem(PRINT_HINT_KEY)) {
        toast.show("Choisissez « Enregistrer au format PDF » comme destination.", "info");
        localStorage.setItem(PRINT_HINT_KEY, "1");
      }
    } catch {
      // stockage local indisponible : l'aide s'affichera simplement à chaque fois
    }
    const previous = document.title;
    // Chrome propose document.title comme nom du PDF
    document.title = sanitizeFilename(title, "pdf").replace(/\.pdf$/, "");
    // Laisse le toast s'afficher avant la boîte d'impression (bloquante)
    setTimeout(() => {
      window.print();
      document.title = previous;
    }, 50);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!editor || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 px-4 rounded-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-medium"
      >
        {busy ? "Export…" : "Exporter ▾"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 bg-white shadow-lg rounded-lg py-1 w-48" onMouseLeave={() => setOpen(false)}>
          <button role="menuitem" onClick={() => void exportDocx()} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            Word (.docx)
          </button>
          <button role="menuitem" onClick={exportPdf} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            PDF
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Étape 4 : brancher le menu dans `EditorApp.tsx`**

Ajouter l'import `import { ExportMenu } from "./ExportMenu";`. Puis remplacer `{/* ExportMenu (Tâche 12) */}` par :

```tsx
          <ExportMenu editor={editor} title={title} />
```

- [ ] **Étape 5 : build et vérification manuelle**

Commande : `npx tsc --noEmit && npm run build && npx vitest run` → OK.

Vérification manuelle sur un document qui contient un titre, du gras, une couleur, une liste imbriquée, un tableau, une image, un lien et des marqueurs visibles :
1. Exporter → Word (.docx) : le fichier `<titre>.docx` se télécharge. Ouvert dans Word ou LibreOffice, toute la mise en forme est présente et aucun surlignage de marqueur n'apparaît.
2. Exporter → PDF : la boîte d'impression s'ouvre avec le titre comme nom. L'aperçu montre une page A4 sans barre d'outils, sans panneau ni marqueurs ; le texte est sélectionnable dans le PDF.

- [ ] **Étape 6 : commiter**

```bash
git add src/editor
git commit -m "feat(editor): export Word (.docx) et PDF par impression"
```

---

### Tâche 13 : popup « Ouvrir dans l'éditeur », retrait du content script, manifest

**Fichiers :**
- Modifier : `src/popup/index.tsx`
- Modifier : `manifest.json`
- Modifier : `vite.config.ts`
- Supprimer : `src/content/index.ts`, `src/content/highlighter.ts`, `src/content/styles.css`
- Créer : `scripts/check-bundle.mjs`
- Modifier : `package.json` (script `build`)

**Interfaces :**
- Consomme : `create` (Tâche 2).
- Produit : aucune nouvelle interface.

- [ ] **Étape 1 : écrire le contrôle de bundle (test qui échoue)**

`scripts/check-bundle.mjs` :

```js
// Vérifie que le popup reste léger et que le content script a disparu.
import { readFileSync, existsSync } from "node:fs";

const failures = [];
const popup = readFileSync("dist/assets/popup.js", "utf8");
for (const needle of ["@tiptap", "prosemirror", "ProseMirror", "Packer.toBlob", "officedocument"]) {
  if (popup.includes(needle)) failures.push(`popup.js contient « ${needle} »`);
}
if (existsSync("dist/assets/content.js")) failures.push("dist/assets/content.js existe encore");
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
if (manifest.content_scripts) failures.push("manifest.content_scripts encore présent");
if (manifest.host_permissions) failures.push("manifest.host_permissions encore présent");

if (failures.length) {
  console.error("Contrôle du bundle en échec :\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Contrôle du bundle OK");
```

Dans `package.json`, remplacer le script `build` par :

```json
    "build": "tsc && vite build && node scripts/check-bundle.mjs",
```

Commande : `npm run build`
Résultat attendu : ÉCHEC, avec « content.js existe encore » et « manifest.content_scripts encore présent ».

- [ ] **Étape 2 : supprimer le content script**

```bash
git rm src/content/index.ts src/content/highlighter.ts src/content/styles.css
```

Dans `vite.config.ts`, supprimer la ligne :

```ts
        content: resolve(__dirname, "src/content/index.ts"),
```

- [ ] **Étape 3 : mettre à jour `manifest.json`**

Remplacer le fichier entier par :

```json
{
  "manifest_version": 3,
  "name": "TextOrigin AI",
  "version": "0.2.0",
  "description": "Identifiez les marqueurs stylistiques des textes générés par l'IA",
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "TextOrigin AI",
    "default_icon": {
      "16": "public/icon16.png",
      "48": "public/icon48.png",
      "128": "public/icon128.png"
    }
  },
  "icons": {
    "16": "public/icon16.png",
    "48": "public/icon48.png",
    "128": "public/icon128.png"
  },
  "background": {
    "service_worker": "assets/background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  },
  "minimum_chrome_version": "88"
}
```

Mettre aussi `"version": "0.2.0"` dans `package.json`.

- [ ] **Étape 4 : simplifier la lecture de sélection du popup et ajouter le bouton**

Dans `src/popup/index.tsx` :

(a) Ajouter l'import `import { create } from "../storage/documents";`.

(b) Remplacer le corps de `getPageSelection`, qui interroge d'abord le content script (supprimé), par la seule injection. Toute la fonction devient :

```tsx
  /**
   * Lit la sélection de l'onglet actif par injection à la demande
   * (autorisée par activeTab), dans tous les cadres.
   */
  const getPageSelection = async (): Promise<string> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error("Impossible d'accéder à l'onglet actif.");
    try {
      const injections = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          const active = document.activeElement;
          if (
            active instanceof HTMLTextAreaElement ||
            (active instanceof HTMLInputElement && active.type === "text")
          ) {
            const { selectionStart: s, selectionEnd: e, value } = active;
            if (s != null && e != null && e > s) return value.slice(s, e);
          }
          return window.getSelection()?.toString() ?? "";
        },
      });
      const found = injections.find(
        (i) => typeof i.result === "string" && i.result.trim(),
      );
      return (found?.result as string) ?? "";
    } catch (e) {
      console.warn("[TextOrigin] injection impossible:", e);
      throw new Error("Cette page ne peut pas être analysée (page protégée du navigateur).");
    }
  };
```

(c) Ajouter, après `handleAnalyze` :

```tsx
  const [opening, setOpening] = useState(false);

  /** Crée un document à partir de la sélection (ou vide) et l'ouvre dans l'éditeur. */
  const handleOpenEditor = async () => {
    if (opening) return;
    setOpening(true);
    let text = "";
    try {
      text = (await getPageSelection()).trim();
    } catch {
      // page protégée : on ouvre un document vide
    }
    try {
      const doc = await create({ text });
      await chrome.tabs.create({ url: chrome.runtime.getURL(`src/editor/index.html?doc=${doc.id}`) });
      window.close();
    } catch (e) {
      setError(`Impossible d'ouvrir l'éditeur : ${(e as Error).message}`);
      setOpening(false);
    }
  };
```

(d) Juste après le bouton « Analyze », ajouter :

```tsx
        <button
          onClick={handleOpenEditor}
          disabled={opening}
          aria-label="Ouvrir la sélection dans l'éditeur"
          className="w-full py-2.5 px-4 border border-primary-600 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-800 disabled:opacity-50 rounded-lg font-medium transition-colors"
        >
          {opening ? "Ouverture…" : "Ouvrir dans l'éditeur"}
        </button>
```

- [ ] **Étape 5 : build et contrôle du bundle**

Commande : `npm run build`
Résultat attendu : build OK puis « Contrôle du bundle OK ».

Commande : `npx vitest run`
Résultat attendu : tous les tests PASS.

- [ ] **Étape 6 : vérification manuelle**

1. Recharger l'extension. Dans `chrome://extensions`, les détails n'affichent plus « Lire et modifier toutes vos données sur tous les sites ».
2. Sur une page web, aucun bouton « Analyze » flottant n'apparaît.
3. Sélectionner un paragraphe, puis popup → « Analyze » : le score s'affiche (comme avant).
4. Sélectionner un paragraphe, puis popup → « Ouvrir dans l'éditeur » : un onglet éditeur s'ouvre avec ce texte, déjà analysé.
5. Sans sélection → « Ouvrir dans l'éditeur » : un document vide.
6. Sur `chrome://extensions` → « Ouvrir dans l'éditeur » : un document vide, sans erreur.

- [ ] **Étape 7 : commiter**

```bash
git add -A src/popup src/content manifest.json vite.config.ts package.json scripts
git commit -m "feat: popup « Ouvrir dans l'éditeur », retrait du content script et de <all_urls>"
```

---

### Tâche 14 : guide de test manuel et vérification finale

**Fichiers :**
- Modifier : `extension/e2e-manual-test.md` (réécriture complète)

- [ ] **Étape 1 : réécrire `e2e-manual-test.md`**

```markdown
# Test manuel de bout en bout — TextOrigin AI 0.2

## Préparation
1. `npm run build` (doit finir par « Contrôle du bundle OK »).
2. `chrome://extensions` → Mode développeur → Charger l'extension non empaquetée → `extension/dist` (ou « Recharger »).

## A. Plus d'injection dans les pages
- [ ] Sur un site quelconque, aucun bouton flottant ni style ajouté.
- [ ] Les détails de l'extension ne demandent plus l'accès à tous les sites.

## B. Popup
- [ ] Sélection + « Analyze » → score, nombre de marqueurs, confiance.
- [ ] Sélection + « Ouvrir dans l'éditeur » → nouvel onglet avec le texte (paragraphes conservés).
- [ ] Sans sélection → document vide.
- [ ] Sur chrome://extensions → document vide, aucune erreur.

## C. Mise en forme
- [ ] Titres 1–3, police (6), taille (8–72), gras, italique, souligné.
- [ ] Couleur du texte, surlignage, « Aucune » retire.
- [ ] Alignements (4), interlignes (1.0, 1.15, 1.5, 2.0).
- [ ] Listes à puces, numérotées, imbrication avec Tab, citation.
- [ ] Lien (« example.com » → https://example.com), retrait du lien.
- [ ] Tableau 3×3, ajout/suppression ligne et colonne, suppression du tableau.
- [ ] Image par bouton, collage et glisser-déposer ; svg et fichier > 10 Mo refusés par un toast.
- [ ] Ctrl+Z / Ctrl+Y sur chaque action.

## D. Analyse
Texte : « Furthermore, we must delve into this comprehensive topic. »
- [ ] Surlignage ~0,5 s après la frappe ; panneau à jour.
- [ ] Survol → infobulle (explication, suggestions).
- [ ] Clic dans le panneau → passage sélectionné dans le texte.
- [ ] « → Moreover » sur « Furthermore » garde la majuscule ; Ctrl+Z rétablit.
- [ ] Masquer / afficher les marqueurs ; le score reste.
- [ ] Ctrl+Z ne retire pas les marqueurs (hors historique).
- [ ] Document vide → « Écrivez ou collez du texte pour l'analyser. »

## E. Documents
- [ ] « ✓ Enregistré » après modification ; rechargement → contenu et images intacts.
- [ ] Nouveau, ouvrir, renommer, supprimer (confirmation intégrée, pas de boîte native).
- [ ] Passer de B à A puis Ctrl+Z dans A : le texte de B ne réapparaît pas.
- [ ] Copier une image de A vers B, supprimer A : l'image reste dans B.
- [ ] `?doc=inexistant` → toast « Document introuvable ».

## F. Exports
Document de test : titre, gras, couleur, surlignage, liste imbriquée, 2 listes numérotées séparées, tableau, image, lien, marqueurs visibles.
- [ ] Word (.docx) → nom = titre ; ouvert dans Word ou LibreOffice : tout est présent, la 2ᵉ liste numérotée recommence à 1, aucun marqueur.
- [ ] PDF → boîte d'impression, nom = titre, A4 sans interface ni marqueurs, texte sélectionnable, pas d'image coupée entre deux pages.
```

- [ ] **Étape 2 : vérification complète**

Commande : `npx tsc --noEmit && npx vitest run && npm run build`
Résultat attendu : aucune erreur de type, tous les tests PASS, « Contrôle du bundle OK ».

Dérouler le guide `e2e-manual-test.md` dans Chrome et noter chaque case.

- [ ] **Étape 3 : commiter**

```bash
git add e2e-manual-test.md
git commit -m "docs: guide de test manuel de l'éditeur 0.2"
```
