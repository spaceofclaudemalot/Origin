# TextOrigin AI — Éditeur de documents intégré (changement de paradigme)

Date : 2026-10-08
Statut : validé en conversation, en attente de relecture de la spec

## 1. Intention

L'extension abandonne l'injection d'interface dans les pages web (bouton flottant « Analyze », surlignage dans le DOM hôte, toasts) au profit d'une **page éditeur interne à l'extension** : un traitement de texte au style « docs en ligne » doté d'un **panneau latéral d'analyse permanent** (score IA, marqueurs, suggestions). L'utilisateur y écrit ou colle un texte, voit les marqueurs IA surlignés en direct, retravaille le texte avec les suggestions, puis exporte en **.docx** ou **PDF**.

Le popup conserve l'analyse rapide d'une sélection de page et gagne « Ouvrir dans l'éditeur ».

### Décisions prises

| Sujet | Choix |
|---|---|
| Rôle de l'éditeur | Traitement de texte complet + panneau d'analyse permanent (option C) |
| Popup | Garde l'analyse rapide de sélection + bouton « Ouvrir dans l'éditeur » (option B) |
| Mise en forme | Essentiel + mise en page (option B) |
| Documents | Multi-documents locaux, IndexedDB, sauvegarde automatique (option B) |
| Moteur d'édition | TipTap (ProseMirror) |
| Export PDF | Impression navigateur (CSS print + `window.print()`) |
| Content script | Supprimé (y compris `host_permissions: <all_urls>`) |

### Contraintes

- **100 % local** : aucun service cloud, aucune donnée envoyée. Les extensions d'export payantes/cloud de TipTap sont exclues.
- **CSP MV3** `script-src 'self'` : aucune bibliothèque chargée depuis un CDN ni utilisant `eval`/`new Function`.
- `minimum_chrome_version` reste 88.
- Pas de nom ni de marque « Word » / « Google Docs » dans l'interface. Libellés d'export : « Word (.docx) » (nom de format) et « PDF ».

## 2. Périmètre

### Inclus (v1)

Mise en forme : titres H1–H3, gras, italique, souligné, police, taille de police, couleur du texte, surlignage, alignement (gauche/centre/droite/justifié), interligne, listes à puces et numérotées (imbriquées), citations, liens, tableaux simples (sans fusion/scission de cellules), images, annuler/rétablir.

Documents : créer, renommer, ouvrir, supprimer ; sauvegarde automatique.

Analyse : en direct, marqueurs en décorations, infobulle, navigation depuis le panneau, application de suggestions, masquage des marqueurs.

Export : .docx et PDF.

### Exclus (v1)

Import .docx, pagination réelle à l'écran (feuille continue), en-têtes/pieds de page, numéros de page, sauts de page, marges réglables, commentaires, fusion de cellules, synchronisation cloud.

## 3. Architecture

```
extension/src/
├── popup/          (modifié)   + « Ouvrir dans l'éditeur »
├── editor/         (nouveau)   page editor.html
│   ├── index.html, main.tsx
│   ├── EditorApp.tsx           barre du haut + feuille + panneau
│   ├── Toolbar.tsx
│   ├── AnalysisPanel.tsx
│   ├── DocumentList.tsx
│   ├── Toast.tsx
│   ├── extensions/
│   │   ├── FontSize.ts
│   │   ├── LineHeight.ts
│   │   ├── StoredImage.ts      image référencée par id IndexedDB
│   │   └── AiMarkers.ts        plugin ProseMirror (décorations)
│   └── print.css
├── analysis/       (nouveau)
│   └── positions.ts            texte brut ⇄ positions ProseMirror
├── export/         (nouveau)
│   ├── toDocx.ts               JSON TipTap → Blob .docx
│   └── download.ts
├── storage/        (nouveau)
│   └── documents.ts            IndexedDB : documents + images
├── services/, detectors/, types/   inchangés
├── background/     conserve ANALYZE_TEXT (utilisé par le popup)
└── content/        SUPPRIMÉ
```

### Unités et interfaces

**`storage/documents.ts`** — seul accès à IndexedDB (base `textorigin`, magasins `documents` et `images`).

```ts
interface StoredDocument {
  id: string;            // crypto.randomUUID()
  title: string;         // « Sans titre » par défaut
  content: JSONContent;  // JSON TipTap
  createdAt: number;
  updatedAt: number;
}
create(init?: { title?: string; text?: string }): Promise<StoredDocument>
get(id: string): Promise<StoredDocument | undefined>
list(): Promise<StoredDocument[]>          // trié par updatedAt décroissant
update(id: string, patch: Partial<Pick<StoredDocument, "title" | "content">>): Promise<void>
remove(id: string): Promise<void>          // supprime aussi les images référencées
putImage(blob: Blob): Promise<string>      // renvoie imageId
getImage(id: string): Promise<Blob | undefined>
```

`create({ text })` convertit le texte brut en paragraphes (une ligne vide = séparation de paragraphe).

**`analysis/positions.ts`** — fonctions pures sur un `Node` ProseMirror.

```ts
interface TextIndex { text: string; map: (offset: number) => number }
buildTextIndex(doc: Node): TextIndex
toRanges(index: TextIndex, detections: Detection[]): Array<{ from: number; to: number; detection: Detection }>
```

Le texte brut sépare les blocs (paragraphes, titres, éléments de liste, cellules) par `\n`. Les nœuds sans texte (images) n'apportent aucun caractère. Les détections dont la plage est invalide sont ignorées.

**`editor/extensions/AiMarkers.ts`** — plugin ProseMirror gérant un `DecorationSet`. Il reçoit les détections par une meta de transaction, remappe les décorations à chaque modification jusqu'à la prochaine analyse, et applique la classe `to-marker to-marker--{low|medium|high}` (palette de l'ancien highlighter). Il expose une option `visible`. Les décorations ne figurent ni dans le JSON, ni dans l'historique, ni dans les exports.

**`export/toDocx.ts`** — `toDocx(content: JSONContent, opts: { title: string; getImage: (id) => Promise<Blob | undefined> }): Promise<Blob>`. Fonction sans React ni DOM éditeur.

**Popup → éditeur** — le popup et l'éditeur partagent l'origine de l'extension, donc la même base IndexedDB. Le popup appelle `create({ text: sélection })`, puis `chrome.tabs.create({ url: "src/editor/index.html?doc=<id>" })`.

### Build

- `vite.config.ts` : une 4ᵉ entrée `editor` ; l'entrée `content` est retirée.
- Vérification : `dist/assets/popup.js` ne contient ni TipTap ni `docx`. Seul `storage/documents.ts` est partagé entre les deux pages.

### Manifest

- Retrait de `content_scripts` et de `host_permissions`.
- Permissions : `storage` (encore utilisé par le popup pour la dernière sélection), `activeTab`, `scripting`, `tabs`.
- Retrait de `web_accessible_resources` (servait au content script).

### Nouvelles dépendances

`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` et les extensions : `underline`, `text-align`, `text-style`, `color`, `highlight`, `font-family`, `link`, `table` (+ `table-row`, `table-cell`, `table-header`), `image`. Ajouter aussi `docx`, et `fake-indexeddb` et `jszip` en dépendances de développement (tests). Les versions exactes et les noms des paquets seront vérifiés à l'installation (TipTap v3 regroupe certaines extensions).

## 4. Interface

```
┌──────────────────────────────────────────────────────────────────┐
│ ☰ Mes documents │ [Titre ✎]  ✓ Enregistré        │ Exporter ▾    │
├──────────────────────────────────────────────────────────────────┤
│ ↶ ↷ │ Police ▾ Taille ▾ │ B I U │ A▾ 🖍▾ │ H▾ │ ≡▾ ↕▾ │ • 1. ❝ │ 🔗 🖼 ⊞ │
├───────────────────────────────────────────────┬──────────────────┤
│   fond gris, feuille blanche 21 cm, marges    │ Score IA  62/100 │
│   2,5 cm, continue (pas de pages à l'écran)   │ Confiance        │
│                                               │ Par catégorie    │
│                                               │ Liste marqueurs  │
│                                               │  + suggestions   │
│                                               │ [Masquer marques]│
└───────────────────────────────────────────────┴──────────────────┘
```

Valeurs de la barre d'outils :
- Polices : Arial, Calibri, Georgia, Times New Roman, Verdana, Courier New.
- Tailles : 8 à 72 pt.
- Interligne : 1.0, 1.15, 1.5, 2.0.

Pour les tableaux : insertion 3×3, ajout ou suppression de ligne et de colonne, suppression du tableau.

## 5. Flux

### Analyse en direct

1. Quand le document change, on attend 500 ms après la dernière modification (1,5 s si le texte dépasse 20 000 caractères).
2. On construit le texte (`buildTextIndex`) ; s'il est vide, le panneau affiche son état vide et on s'arrête.
3. On appelle `DetectorService.detectAll(text)`, instancié dans la page éditeur (pas de passage par le background).
4. On convertit les détections en plages (`toRanges`), on les transmet au plugin `AiMarkers` et on met à jour le panneau.
5. Une réponse d'analyse obsolète (document modifié entre-temps) est ignorée, grâce à un compteur de requêtes.

Interactions :
- **Survol d'un marqueur** : infobulle avec l'explication et les suggestions.
- **Clic sur un marqueur dans le panneau** : défilement jusqu'au passage et sélection de la plage.
- **« Appliquer »** sur une suggestion : remplacement de la plage par une transaction annulable, puis nouvelle analyse.
- **« Masquer les marqueurs »** : bascule de l'option `visible` ; le score reste affiché.

### Documents

- **Sauvegarde automatique** 1 s après la dernière modification. L'indicateur passe par « Enregistrement… », puis « ✓ Enregistré » ou « ⚠ Non enregistré ».
- **Ouverture** : si `?doc=<id>` existe, on charge ce document ; sinon, le dernier modifié ; s'il n'y en a aucun, on en crée un nouveau. L'URL est mise à jour (`history.replaceState`).
- **« Mes documents »** : un tiroir avec la liste (titre, date), Nouveau, Renommer, Supprimer (confirmation dans l'interface).
- **Images** : collage, glisser-déposer ou bouton. On valide le type (png, jpeg, gif, webp) et la taille (≤ 10 Mo), on appelle `putImage`, puis on insère un nœud `StoredImage { imageId }`. L'affichage passe par une URL Blob, révoquée quand le nœud est démonté.

### Popup

Il garde l'analyse de sélection existante. Le bouton « Ouvrir dans l'éditeur » lit la sélection (via le repli `executeScript` existant), crée le document et ouvre l'onglet. Sans sélection, ou si la page est inaccessible, il crée un document vide.

## 6. Exports

### .docx

Correspondance entre nœuds TipTap et éléments `docx` :

| TipTap | docx |
|---|---|
| paragraph | `Paragraph` |
| heading 1–3 | `Paragraph` avec heading `HEADING_1..3` |
| bold / italic / underline | options de `TextRun` |
| textStyle (fontFamily, fontSize, color) | `font`, `size` (demi-points), `color` |
| highlight | `shading` du run |
| textAlign | `alignment` |
| lineHeight | `spacing.line` (240 × valeur) |
| bulletList / orderedList / listItem | `numbering` (puces et décimal, niveaux 0–8) |
| blockquote | paragraphe indenté avec bordure gauche |
| link | `ExternalHyperlink` |
| table / tableRow / tableCell / tableHeader | `Table` / `TableRow` / `TableCell` (en-tête en gras) |
| storedImage | `ImageRun` (octets depuis IndexedDB, largeur ≤ 16 cm, proportions conservées) |
| hardBreak | `break` |

Mise en page : A4, marges de 2,5 cm. Nom de fichier : titre nettoyé, suivi de `.docx` (`document.docx` si le titre est vide). Téléchargement via `<a download>` sur une URL Blob, révoquée ensuite. Une image introuvable est ignorée et l'export n'est pas bloqué.

### PDF

`print.css` :
- masque la barre du haut, la barre d'outils, le panneau, les toasts et le fond gris ;
- masque les marqueurs (classes `to-marker`) ;
- définit `@page { size: A4; margin: 2.5cm }` et met à zéro la marge interne de la feuille ;
- empêche les coupures dans les images et les lignes de tableau (`break-inside: avoid`) et garde les titres avec le paragraphe suivant (`break-after: avoid`).

Le bouton « PDF » donne temporairement au `document.title` le titre du document, appelle `window.print()`, puis rétablit le titre. La première fois, une aide affiche : « Choisissez *Enregistrer au format PDF* comme destination ».

## 7. Gestion des erreurs

Tous les messages passent par le composant `Toast` ; jamais de `alert` ni de `confirm` natifs.

| Situation | Comportement |
|---|---|
| `?doc=<id>` introuvable | Toast, puis ouverture du dernier document ou d'un nouveau |
| IndexedDB indisponible ou quota dépassé | « ⚠ Non enregistré », contenu gardé en mémoire, bouton Réessayer, nouvel essai à chaque modification |
| Image invalide ou de plus de 10 Mo | Refus avec un toast |
| Erreur du détecteur | Panneau « Analyse indisponible », l'édition continue, nouvel essai à la modification suivante |
| Échec de l'export .docx | Toast avec le message |
| Document vide | État vide du panneau, aucun appel au détecteur |
| Popup sur une page inaccessible (`chrome://`, Web Store) | Message dans le popup ; « Ouvrir dans l'éditeur » crée un document vide |

## 8. Tests

TDD sur les unités pures (vitest) :

- `analysis/positions.test.ts` : plusieurs paragraphes, mise en forme mélangée, listes imbriquées, tableaux, images, accents et emoji (paires de substitution), marqueur à cheval sur deux styles, plage invalide.
- `export/toDocx.test.ts` : chaque ligne du tableau de correspondance de la section 6. On décompresse le .docx (`jszip`), on inspecte `word/document.xml`, et on vérifie l'absence de toute trace de marqueur.
- `storage/documents.test.ts` : opérations de création, lecture, mise à jour et suppression, tri de `list`, `create({ text })`, `remove` qui nettoie les images (avec `fake-indexeddb`).
- Les 24 tests existants restent verts.
- Contrôle du build : `popup.js` ne contient ni `@tiptap` ni `docx`.

Manuel : `extension/e2e-manual-test.md` est réécrit pour couvrir :
- popup → éditeur avec et sans sélection ;
- chaque bouton de mise en forme ;
- le surlignage en direct, l'infobulle, l'application d'une suggestion et son annulation ;
- la sauvegarde puis le rechargement de la page ;
- la liste des documents ;
- les images ;
- l'export .docx ouvert dans Word ou LibreOffice ;
- l'export PDF (fidélité visuelle, aucun marqueur) ;
- l'absence de toute injection dans les pages visitées.

## 9. Fichiers supprimés

- `src/content/index.ts`
- `src/content/highlighter.ts`
- `src/content/styles.css`

La palette des niveaux de marqueurs est reprise dans le CSS de l'éditeur.
