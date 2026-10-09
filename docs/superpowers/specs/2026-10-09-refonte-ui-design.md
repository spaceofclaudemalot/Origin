# TextOrigin AI — Refonte de l'interface (éditeur + popup)

Date : 2026-10-09
Statut : validé en conversation, en attente de relecture de la spec
Branche : `feat/refonte-ui` (créée depuis `feat/caracteres-invisibles`, rebasée sur `master` après fusion de la PR #2)

## 1. Intention

Donner à TextOrigin une identité visuelle premium et distinctive (il ressemble aujourd'hui à un clone générique de traitement de texte en ligne), rendre l'analyse plus lisible directement dans la feuille, et rafraîchir la navigation entre documents — sans toucher au moteur d'analyse, au stockage ni aux exports.

Priorités, dans l'ordre : **(1) identité visuelle**, **(2) lisibilité de l'analyse**, **(3) organisation des documents** (visuel seulement).

Références fournies : tableau de bord gris mat à rail d'icônes noir (image 1), styleguide blanc cassé à accent orange `#DF5830` (image 2), éditeur à panneau de droite à sections repliables (image 3), comportement par points de rupture (image 4), étiquettes de statut en marge des paragraphes (image 5).

### Décisions prises

| Sujet | Choix |
|---|---|
| Direction visuelle | Hybride : cadre gris mat + rail noir (image 1), feuille blanche, accent orange `#DF5830` (image 2) |
| Disposition | Adaptative : colonne Documents épinglée ≥ 1440 px, tiroir en dessous ; épinglage manuel possible |
| Affichage de l'analyse | Surlignage dans le texte + étiquettes en marge par bloc (image 5) |
| Blocs sans marqueur | Rien (ni étiquette ni barre) — aucun statut « naturel » |
| Organisation des documents | Refonte visuelle seule : liste plate + recherche + « Récents » ; pas de dossiers |
| Thème | Clair et sombre selon le système (`prefers-color-scheme`) |
| Feuille en mode sombre | Reste claire (ce qui est affiché = ce qui est exporté) |
| Popup | Restyle seul, même parcours |
| Approche technique | Restyle en place sur jetons CSS ; pas de nouvelle bibliothèque d'UI |

### Contraintes

- **CSP MV3** `script-src 'self'` : aucune ressource externe (ni Google Fonts, ni CDN). Police et icônes embarquées.
- **100 % local**, `minimum_chrome_version` 88 inchangé.
- Le moteur d'analyse (`src/analysis`, `src/detectors`), le stockage (`src/storage`) et l'export (`src/export`) ne sont **pas modifiés**.
- Les exports .docx et PDF restent identiques au comportement actuel.
- Pas de nom ni de marque « Word » / « Google Docs » dans l'interface (inchangé).

## 2. Périmètre

### Inclus

- Système de design : jetons CSS clair/sombre, police Inter embarquée, primitives UI partagées, icônes SVG locales.
- Nouvelle structure de l'éditeur : rail, colonne/tiroir Documents, zone document, panneau/tiroir Analyse, comportement par largeur.
- Restyle de tous les composants de l'éditeur (barre du haut, barre d'outils, liste des documents, panneau d'analyse, infobulle, toasts, menu d'export).
- Nouvelle couleur des marqueurs, signaux globaux et caractères invisibles.
- Étiquettes en marge par bloc.
- Restyle du popup, clair et sombre.

### Exclus

Dossiers, statuts de document, arborescence ; score par paragraphe ou statut « naturel » ; feuille sombre ; bascule manuelle de thème ; disposition mobile (l'extension s'ouvre dans un onglet de Chrome de bureau) ; toute modification du moteur, du stockage ou des exports.

## 3. Système de design

### 3.1 Jetons

Définis en variables CSS sur `:root` (clair), redéfinis sous `@media (prefers-color-scheme: dark)`. Valeurs stockées en canaux RVB (`--to-accent: 223 88 48`) pour que Tailwind les expose via `rgb(var(--to-accent) / <alpha-value>)` et que les opacités (`bg-accent/20`) fonctionnent.

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `canvas` | `#CFCCC6` | `#151514` | fond de la page |
| `surface` | `#E4E1DB` | `#232321` | colonnes, panneau, zone document |
| `raised` | `#EBE8E2` | `#2C2C2A` | cartes, barre d'outils, éléments actifs |
| `line` | `#D6D2CA` | `#3A3A37` | bordures, séparateurs |
| `rail` | `#232323` | `#0B0B0B` | rail d'icônes |
| `ink` | `#1D1D1B` | `#ECE9E3` | texte principal |
| `muted` | `#6B665E` | `#9D988F` | texte secondaire |
| `accent` | `#DF5830` | `#E8683F` | actions principales, marqueurs, focus |
| `accent-ink` | `#FFFFFF` | `#FFFFFF` | texte sur accent |
| `sheet` | `#FBFAF7` | `#FBFAF7` | feuille (identique dans les deux thèmes) |
| `sheet-ink` | `#1D1D1B` | `#1D1D1B` | texte par défaut de la feuille |

Règle : **la feuille, l'infobulle des marqueurs et `print.css` utilisent exclusivement les jetons `sheet*` et des valeurs claires épinglées**, jamais `ink`/`surface`, afin qu'aucune valeur sombre ne fuie dans le document affiché, imprimé ou exporté.

Bandes de score (jauge et puce) :

| Bande | Score | Clair | Sombre | Libellé |
|---|---|---|---|---|
| faible | 0–20 | `#A9B8A4` (sauge) | `#7F8F7B` | Faible |
| modéré | 21–40 | `#B9B4AA` (gris) | `#5A5751` | Modéré |
| notable | 41–60 | `#E2A183` (pêche) | `#A8644A` | Notable |
| élevé | 61–100 | `accent` | `accent` | Élevé |

Les seuils reprennent ceux de l'actuel `scoreColor` (21 / 41 / 61). Plus aucun rouge dans l'interface. Les couleurs `primary`, `secondary`, `natural`, `verify`, `alert`, `highlight` sont retirées de `tailwind.config.js`.

### 3.2 Marqueurs, signaux, invisibles (dans la feuille)

- Marqueurs : une teinte unique (accent clair `#DF5830`) en trois intensités — faible `rgba(223,88,48,.16)`, moyen `.32`, fort `.50` + soulignement plein `#B8411D` 2 px. Remplace bleu/ambre/rouge. Focus : contour 2 px `#B8411D`.
- Signaux globaux : soulignement pointillé `#3B3934` 2 px (remplace le violet).
- Caractères invisibles : badge à bordure pointillée `#8A857C`, texte `#6B665E`.
- Ces couleurs sont fixes (feuille toujours claire).

### 3.3 Typographie

- UI : **Inter variable**, embarquée via `@fontsource-variable/inter` (fichiers woff2 servis depuis l'extension). Pile de repli : `system-ui, sans-serif`.
- Échelle : 12 / 13 / 15 / 20 / 28 / 44 px. Le score utilise 44 px, graisse 300, interlettrage −2 px.
- Les polices choisies par l'utilisateur dans le document (extension FontFamily) ne changent pas ; la police par défaut de la feuille reste celle d'aujourd'hui.

### 3.4 Formes et accessibilité

- Rayons : 8 px (contrôles), 12 px (cartes, barre d'outils), 18 px (conteneurs principaux).
- Ombres : `sm` `0 2px 6px rgb(0 0 0 / .06)` ; `md` `0 8px 24px rgb(0 0 0 / .10)` (sombre : opacités ×3).
- Bordures 1 px `line`.
- Anneau de focus clavier : 2 px `accent`, décalage 2 px, sur tout élément interactif (`:focus-visible`).
- Contraste : texte `ink`/`muted` sur `surface`/`raised` ≥ 4.5:1 dans les deux thèmes ; texte blanc sur `accent` vérifié (taille ≥ 13 px graisse 600 pour les boutons). Toute paire qui échoue est corrigée sur le jeton, pas au cas par cas.

### 3.5 Primitives partagées — `src/ui/`

Composants React sans dépendance, utilisés par l'éditeur et le popup :

- `Button` (variantes `primary` / `secondary` / `ghost`, état désactivé)
- `IconButton` (avec `aria-label` obligatoire, état actif)
- `Chip` (variantes `accent` / `neutral` / `outline`)
- `Card`
- `Collapsible` (en-tête + compteur + contenu, `aria-expanded`)
- `Menu` (déclencheur + liste, fermeture Échap / clic extérieur, navigation flèches)
- `ScoreGauge` (chiffre, puce de bande, jauge 4 segments)
- `icons.tsx` : icônes SVG en ligne, trait 1.5 px, `currentColor`

## 4. Disposition de l'éditeur

### 4.1 Zones

| Zone | Largeur | Contenu |
|---|---|---|
| Rail | 56 px | logo ; Documents (ouvre/épingle la colonne) ; Analyse (affiche/masque le panneau) ; Nouveau document ; en bas : emplacement réglages (vide en v1, non affiché) |
| Colonne Documents | 260 px | recherche ; « Récents » (5 derniers modifiés) ; « Tous les documents » ; bouton « + » dans l'en-tête |
| Zone document | flexible | barre du haut ; barre d'outils en carte ; feuille + bande d'étiquettes |
| Panneau Analyse | 320 px | carte score ; sections repliables |

### 4.2 Comportement par largeur

| Largeur fenêtre | Documents | Étiquettes | Analyse |
|---|---|---|---|
| ≥ 1440 px | épinglée | gouttière hors feuille, à gauche | colonne |
| 1200–1439 px | tiroir | gouttière hors feuille | colonne |
| 960–1199 px | tiroir | dans la marge gauche de la feuille | tiroir à droite |
| < 960 px | tiroir | dans la marge gauche de la feuille | tiroir à droite ; la feuille se réduit à la largeur disponible |

Budget : rail 56 + gouttière ~110 + feuille 794 + panneau 320 ≈ 1 280 px.

- Fonction pure `layoutFor(width, prefs) → { docs: "pinned" | "drawer", analysis: "column" | "drawer", labels: "gutter" | "inset" }`.
- `prefs` (`docsPinned?`, `analysisShown?`) est persisté dans `localStorage` (lecture/écriture protégées par try/catch, valeurs par défaut si indisponible). Tant que l'utilisateur n'a pas fait de choix explicite, seule la largeur décide. Un choix explicite d'épinglage est ignoré sous 1200 px (pas la place) mais conservé pour les largeurs supérieures.
- Les tiroirs se ferment avec Échap, clic sur le voile ou à l'ouverture d'un document ; le focus revient sur le bouton du rail.

### 4.3 Impression / PDF

Rail, colonnes, tiroirs, barre du haut, barre d'outils, étiquettes et barres de bloc portent `no-print`. Seule la feuille est imprimée, comme aujourd'hui.

## 5. Composants restylés

Le comportement et la logique de chaque composant restent identiques ; seuls le balisage de présentation et les classes changent.

| Composant | Fichier | Changements |
|---|---|---|
| Structure | `EditorApp.tsx` (+ `Shell.tsx` nouveau) | rail, colonne/tiroir, zone document, panneau/tiroir selon `layoutFor` |
| Barre du haut | `EditorApp.tsx` | fil d'Ariane « Documents › Titre » ; titre 20 px éditable ; menu « … » (Renommer, Supprimer) ; statut d'enregistrement en puce (« Enregistré » / « Enregistrement… » / « Non enregistré · Réessayer » en accent) ; bouton `primary` « Exporter » |
| Menu d'export | `ExportMenu.tsx` | basé sur `Menu` : « Word (.docx) », « PDF » |
| Barre d'outils | `Toolbar.tsx` | carte flottante `raised`, `IconButton` groupés et séparés, état actif, sélecteurs police/taille/couleur en `Menu` ; mêmes commandes |
| Documents | `DocumentList.tsx` | colonne/tiroir ; recherche (filtre local sur le titre) ; « Récents » ; ligne : titre, date relative, nombre de mots ; ligne active `raised` + barre accent |
| Panneau d'analyse | `AnalysisPanel.tsx` | `ScoreGauge` + nombre de mots ; sections `Collapsible` (Familles, Signaux globaux, Caractères invisibles) avec compteur ; détections en petites cartes ; suggestions en `Chip` cliquables ; avertissement en alerte discrète ; état ouvert/fermé des sections mémorisé (`localStorage`) |
| Infobulle | `MarkerTooltip.tsx` | carte claire (jetons `sheet`) dans les deux thèmes : catégorie, explication, suggestions en `Chip` |
| Toasts | `Toast.tsx` | cartes d'alerte : neutre, avertissement (halo accent), erreur |
| Popup | `popup/index.tsx` | même parcours ; cadre `surface`, `ScoreGauge`, résumé des familles ; classes `dark:` remplacées par les jetons |

Le nombre de mots par document dans la liste est calculé côté interface par une fonction pure `wordCountOf(content: JSONContent)` sur le contenu que `list()` renvoie déjà (pas de changement du stockage).

## 6. Étiquettes en marge

### 6.1 Règles

- **Bloc** : nœud textuel de niveau paragraphe — paragraphe, titre, citation (son paragraphe), **chaque élément de liste** (son paragraphe), **chaque cellule de tableau** (son paragraphe). Concrètement : tout nœud `textblock` du document.
- Un bloc reçoit une étiquette s'il contient au moins un marqueur, ou une phrase d'un signal global de statut `alert`. Sinon : **rien**.
- Contenu (une étiquette par bloc) :
  - marqueurs présents → « **N MARQUEUR(S)** », fond accent dont l'intensité suit le niveau le plus fort du bloc (faible/moyen/fort, mêmes intensités qu'en 3.2) ;
  - seulement des signaux → libellé court du signal en noir (`rail`) : « CONNECTEURS », « RYTHME », « PARAGRAPHES », « PHRASES D'ATTAQUE » ; si plusieurs signaux, le premier dans l'ordre de `result.signals` + « +N » ;
  - les deux → étiquette marqueurs + pastille noire indiquant un signal.
- Barre verticale 3 px à gauche du bloc, couleur de l'étiquette.
- Un marqueur à cheval sur deux blocs compte dans le bloc où il commence.
- Le bouton existant « masquer les marqueurs » masque aussi étiquettes et barres.

### 6.2 Interactions

- Survol d'une étiquette : surlignage temporaire des marqueurs (classe focus existante) ou des phrases du signal (`setSignalHighlight`) du bloc ; retiré à la sortie.
- Clic : ouvre le panneau (ou le tiroir) d'analyse, déplie la section concernée, fait défiler jusqu'aux détections du bloc et sélectionne la première dans le texte (`reveal` existant).
- Étiquettes atteignables au clavier (bouton, `aria-label` « 3 marqueurs dans ce paragraphe »).

### 6.3 Implémentation

- `src/editor/marginLabels.ts` — fonction pure `blockAnnotations(doc, result, index): BlockAnnotation[]` avec `BlockAnnotation = { pos: number; markerCount: number; maxLevel: "low" | "medium" | "high" | null; detectionIds: string[]; signals: GlobalSignal["id"][] }`. Réutilise `buildTextIndex` / `mapRange` / `markerLevel` existants ; aucune nouvelle logique de correspondance.
- `src/editor/marginLabels.ts` — fonction pure `stackLabels(items: { top: number; height: number }[], gap: number): number[]` qui décale vers le bas les étiquettes qui se chevaucheraient.
- `src/editor/MarginLabels.tsx` — calque React **hors du DOM de ProseMirror**, en position absolue dans le conteneur de la feuille. Position de chaque étiquette = haut du bloc (`view.nodeDOM(pos).getBoundingClientRect()` relatif au conteneur). Recalcul groupé dans un `requestAnimationFrame` après : nouvelle analyse, mise à jour du document, redimensionnement (`ResizeObserver` sur la feuille), chargement d'image. Seuls les blocs étiquetés sont mesurés.
- Aucune décoration ni nœud ajouté au document : ni curseur, ni sélection, ni historique, ni sauvegarde, ni export affectés. Calque `no-print`.
- Pendant la frappe, les étiquettes suivent le délai d'analyse existant (500 ms, 1 500 ms au-delà de 20 000 caractères) ; entre deux analyses, elles restent ancrées à leur bloc (positions recalculées à chaque mise à jour).

## 7. Tests

### Automatisés (Vitest)

- `blockAnnotations` : regroupement par paragraphe ; éléments de liste et cellules de tableau comptés séparément ; signaux `alert` inclus, `ok`/`insufficient` exclus ; bloc sans rien absent du résultat ; niveau maximal conservé ; marqueur à cheval compté une fois, dans le bloc de départ ; document vide.
- `stackLabels` : aucune superposition ; ordre conservé ; étiquettes déjà espacées non déplacées.
- `wordCountOf` : document vide, paragraphes, listes et tableaux, images ignorées.
- `layoutFor` : les quatre plages de largeur ; préférences explicites ; épinglage ignoré sous 1200 px ; valeurs par défaut si `localStorage` indisponible.
- La suite existante (160+ tests) reste verte ; `npm run build` passe (`tsc` + Vite).

### Manuels

Ajouts à `extension/e2e-manual-test.md` : quatre largeurs de fenêtre ; clair et sombre ; étiquettes pendant la frappe, le défilement, avec images et tableaux ; impression/PDF sans interface ni étiquettes ; export .docx identique à avant ; popup dans les deux thèmes ; navigation clavier (anneau de focus, tiroirs, menus, Échap).

## 8. Livraison

Trois phases, chacune commitable, testable et livrable seule :

1. **Fondations** — jetons, Tailwind relié aux variables, Inter, `src/ui/`, icônes, nouvelle structure et `layoutFor`, restyle de tous les composants de l'éditeur (thème clair), nouvelles couleurs des marqueurs. Suppression des anciennes couleurs Tailwind (toute classe restante casse le build et est corrigée).
2. **Mode sombre + popup** — jetons sombres, vérification des contrastes, épinglage clair de la feuille / infobulle / impression, restyle du popup.
3. **Étiquettes en marge** — `blockAnnotations`, `stackLabels`, `MarginLabels`, interactions.

`.superpowers/` est ajouté à `.gitignore`.

## 9. Risques

| Risque | Parade |
|---|---|
| Performance des étiquettes sur long document | mesures groupées par frame, uniquement les blocs étiquetés |
| Classes Tailwind de l'ancienne palette oubliées | palette supprimée de la config : le build échoue au lieu de passer en silence |
| Valeurs sombres qui fuient dans la feuille / l'impression | jetons `sheet*` dédiés ; vérification manuelle impression en mode sombre |
| Chevauchement des étiquettes sur paragraphes courts | `stackLabels` ; barre de bloc toujours alignée sur son bloc |
| Rebase sur `master` après la PR #2 | branche partie de `feat/caracteres-invisibles` ; rebase avant ouverture de la PR |
