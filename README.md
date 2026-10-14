# TextOrigin AI

Extension Chrome qui repère dans un texte les marqueurs stylistiques fréquents des textes générés par IA, explique chacun, propose des reformulations et révèle le texte caché dans les caractères invisibles.

> **Indices stylistiques, pas une preuve.** Un score élevé signale des tics d'écriture, il ne démontre pas qu'un texte a été écrit par une IA.

L'analyse est **100 % locale** : aucun texte ne quitte le navigateur, aucun serveur, aucune clé d'API.

## Ce que fait l'extension

- **Popup, sur n'importe quelle page.** Sélectionnez du texte, cliquez sur l'icône, puis sur « Analyser la sélection » : score sur 100, nombre de marqueurs, niveau de confiance. « Ouvrir dans l'éditeur » transfère la sélection dans l'éditeur.
- **Éditeur intégré** (TipTap). Analyse en direct pendant la frappe :
  - marqueurs surlignés, avec infobulle d'explication et reformulations en un clic ;
  - score par famille (vocabulaire, connecteurs, formulations, régularité) et signaux globaux ;
  - étiquettes de marge par paragraphe ;
  - mode sombre et disposition adaptative.
- **Caractères invisibles.** Détecte les espaces de largeur nulle, les contrôles bidirectionnels et les caractères « tag » qui peuvent cacher une consigne. Le texte caché est affiché, et « Nettoyer le texte » le retire.
- **Documents.** Ils sont enregistrés automatiquement dans le navigateur (IndexedDB), avec une copie de secours. On peut les rechercher, les renommer et les exporter en Word (.docx) ou en PDF (via l'impression).
- Les textes français et anglais sont pris en charge.

## Installer en local

Il faut Node.js 22.12 ou plus récent (exigé par Vitest) et Google Chrome (version 102 ou plus récente).

```bash
git clone https://github.com/spaceofclaudemalot/Origin.git
cd Origin/extension
npm install
npm run build
```

Ensuite, dans Chrome :

1. Ouvrez `chrome://extensions`.
2. Activez le **Mode développeur** (en haut à droite).
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier `extension/dist`.
4. Épinglez l'icône TextOrigin AI dans la barre d'outils.

Après une modification du code, relancez `npm run build`, puis cliquez sur « Recharger » sur la fiche de l'extension.

## Développement

Toutes les commandes se lancent depuis `extension/`.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur Vite pour travailler sur l'éditeur hors extension |
| `npm run build` | Vérification TypeScript, build dans `dist/`, contrôle de la taille du bundle du popup |
| `npm test` | Tests unitaires (Vitest + happy-dom) |
| `npm run test:perf` | Test de performance de l'analyse, séparé car sensible à la machine |

Le guide de recette manuelle se trouve dans [`extension/e2e-manual-test.md`](extension/e2e-manual-test.md).

### Organisation du code (`extension/src`)

| Dossier | Contenu |
|---|---|
| `detectors/` | Détecteurs : lexique, connecteurs, formulations stéréotypées, rythme, paragraphes, caractères invisibles |
| `analysis/` | Score global, segmentation, seuils, analyse en direct, assemblage des détecteurs (`createDetectorService`) |
| `services/` | Registre des détecteurs (`DetectorService`) |
| `editor/` | Éditeur TipTap, panneau d'analyse, étiquettes de marge, liste des documents |
| `popup/` | Popup de l'extension |
| `background/` | Service worker qui exécute l'analyse demandée par le popup |
| `storage/` | Persistance IndexedDB et copie de secours |
| `export/` | Export Word (.docx) |
| `ui/` | Jetons de design, composants partagés, jauge de score |
| `types/` | Types partagés |

### Permissions

`storage`, `activeTab` et `scripting` servent uniquement à lire la sélection de l'onglet actif au moment du clic. Il n'y a ni content script permanent ni accès à tous les sites, et la politique de sécurité interdit toute connexion réseau externe.

## Documentation

- [`cahier_des_charges.md`](cahier_des_charges.md) : cahier des charges d'origine.
- [`docs/superpowers/specs/`](docs/superpowers/specs) : spécifications de conception, une par évolution.
- [`docs/superpowers/plans/`](docs/superpowers/plans) : plans d'implémentation correspondants.
