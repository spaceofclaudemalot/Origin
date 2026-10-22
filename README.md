# TextOrigin AI

Extension Chrome (Manifest V3) qui repère les marqueurs stylistiques souvent associés aux textes générés par des LLM, les surligne dans un éditeur intégré, explique chaque signalement et propose des reformulations.

> Indices stylistiques, pas une preuve. Un texte académique formel ou celui d'un auteur non natif peut produire des faux positifs. Le score ne dit jamais « écrit par une IA ».

Tout tourne en local : aucun appel réseau, aucun LLM.

## Ce que l'extension détecte

Le score global (0 à 100) combine quatre familles de signaux :

| Famille | Poids | Exemples |
|---|---|---|
| Vocabulaire | 30 % | « crucial », « holistique », « tapisserie », « paysage numérique », `delve`, `tapestry` |
| Connecteurs | 20 % | densité de « de plus », « en outre », `furthermore` |
| Formulations | 25 % | énumérations par trois, « Ce n'est pas seulement X, c'est Y », clôtures et préambules de chatbot |
| Régularité | 25 % | rythme des phrases, homogénéité des paragraphes |

La confiance du score est « haute » quand au moins trois familles sont en alerte, « moyenne » avec deux, « faible » sinon ou si le texte est trop court. Français et anglais sont gérés ; les règles propres à une langue ne s'appliquent pas à l'autre. Les caractères invisibles (espaces de largeur nulle, etc.) sont aussi signalés.

Le catalogue de motifs s'appuie sur [blader/humanizer](https://github.com/blader/humanizer) (MIT). Le détail de l'intégration est dans [`docs/superpowers/specs/2026-10-20-humanizer-design.md`](docs/superpowers/specs/2026-10-20-humanizer-design.md).

## Installation

```bash
cd extension
npm install
npm run build
```

Puis dans Chrome : `chrome://extensions` → mode développeur → « Charger l'extension non empaquetée » → dossier `extension/dist`.

Le popup analyse la sélection ou la page ; l'éditeur (`src/editor`) s'ouvre dans un onglet.

## Développement

```bash
npm run dev        # serveur Vite, éditeur sur http://localhost:5173/src/editor/index.html
npm test           # tests unitaires (Vitest)
npm run test:perf  # tests de performance
npm run lint
```

Le serveur de dev ne fournit pas les API `chrome.*` : seul l'éditeur y fonctionne, pas le popup.

## Structure

- `extension/src/detectors/` : un détecteur par famille (`lexical`, `connectors`, `stereotypes`, `rhythm`, `paragraphs`, `invisibles`) et leurs données.
- `extension/src/analysis/` : scoring, seuils, segmentation, analyse en direct.
- `extension/src/editor/`, `extension/src/popup/` : interfaces.
- `extension/src/background/` : service worker.
- `cahier_des_charges.md` : cahier des charges d'origine.
- `docs/superpowers/` : specs et plans de conception.

## Licence

Aucune licence n'est déclarée pour l'instant.
