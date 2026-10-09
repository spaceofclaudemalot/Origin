# TextOrigin AI — Détection en temps réel des signes de l'IA

Date : 2026-10-08
Statut : validé en conversation, en attente de relecture de la spec
Base : branche `feat/signaux-ia`, issue de `feat/editor-integre` (PR #1)

## 1. Intention

Étendre l'analyse en direct de l'éditeur à tous les signes de texte généré par IA détectables **localement et instantanément**. Le référentiel est fourni par l'utilisateur :
- vocabulaire en excès ;
- densité de connecteurs ;
- formulations stéréotypées ;
- régularité du rythme (*burstiness*) ;
- structure des paragraphes.

Le score global est pondéré par famille et explicable. Le panneau rappelle en permanence les limites (faux positifs).

### Décisions prises

| Sujet | Choix |
|---|---|
| Portée | Option A : signes calculables localement, en temps réel |
| Signaux globaux | Section « Signaux globaux » dans le panneau, avec surlignage léger et optionnel des phrases concernées (option B) |
| Score | Moyenne pondérée de 4 familles, transparente, avec familles « insuffisantes » exclues (option A) |
| Langues | Français et anglais |

### Hors périmètre

- Perplexité, Binoculars, DetectGPT : demandent un modèle de langage.
- Tatouage numérique : demande la clé du fournisseur.
- C2PA : ne survit pas au copier-coller.
- Classificateurs entraînés et détection par recherche.

### Contraintes

- 100 % local, aucun appel réseau, CSP MV3 inchangée.
- Analyse complète en moins de 50 ms pour 20 000 caractères. Le délai de 500 ms (1 500 ms au-delà de 20 000 caractères) est inchangé.
- Les nouvelles décorations ne figurent ni dans le JSON, ni dans l'historique, ni dans les exports.
- Chrome 88 minimum : les assertions arrière (lookbehind) et les classes Unicode `\p{L}` sont disponibles.

## 2. Découpage du texte — `src/analysis/segment.ts`

Fonction pure partagée par tous les détecteurs.

```ts
interface Span { start: number; end: number; text: string }
interface Segmented {
  words: Span[];
  sentences: Array<Span & { wordCount: number }>;
  paragraphs: Array<Span & { wordCount: number; sentences: number[] }>; // indices dans sentences
}
segment(text: string): Segmented
```

- **Paragraphes** : les blocs séparés par `\n` (un bloc de l'éditeur, tel que produit par `buildTextIndex`).
- **Phrases** : coupure après `.`, `!`, `?` ou `…`, suivis d'un espace et d'une majuscule, d'une ouverture de guillemet ou de la fin du bloc. Chaque fin de bloc termine aussi une phrase.
  - Ne coupent pas une phrase :
    - les abréviations `e.g.`, `i.e.`, `etc.`, `vs.`, `M.`, `Mme.`, `Dr.`, `p. ex.`, `cf.` ;
    - une lettre majuscule isolée suivie d'un point (initiale) ;
    - un point entre deux chiffres (`3.5`).
- **Mots** : séquences `[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*`.
- Toutes les positions sont des positions dans le texte d'origine (unités UTF-16), compatibles avec `toRanges`.

## 3. Détecteurs

Tous implémentent `Detector` (`detect(text) → Detection[]`). Les détecteurs globaux implémentent en plus `GlobalDetector` (`signals(segmented) → GlobalSignal[]`). Toutes les constantes vivent dans `src/analysis/thresholds.ts`.

### 3.1 Vocabulaire — `LexicalDetector` (existant, modifié)

- **Correspondance** : la frontière de mot devient Unicode, `(?<![\p{L}\p{N}])terme(?![\p{L}\p{N}])` avec les drapeaux `giu`, appliquée au texte d'origine.
- **Retraits** : les connecteurs (`furthermore`, `moreover`, `additionally`, `consequently`, `therefore`, `however`, `en outre`, `par ailleurs`, `de plus`, `notamment`) partent au détecteur Connecteurs. Les formulations (`ce n'est pas simplement X, c'est Y`, `il convient de noter`, `il est important de souligner`, `cette approche permet de`) partent au détecteur Stéréotypes.
- **Ajouts en anglais** : `realm`, `landscape` (sens figuré non détectable, confiance 0,5), `robust`, `seamless`, `multifaceted`, `nuanced`, `foster`, `elevate`, `navigate` (0,5), `paramount`, `holistic`, `commendable`, `noteworthy`, `invaluable`.
- **Ajouts en français** : `crucial`, `essentiel` (0,5), `incontournable`, `primordial`, `méticuleux`, `minutieux`, `exhaustif`, `approfondi`, `pierre angulaire`, `fondamental` (0,5), `indéniable`, `incontestablement`, `en somme`.
- **Score d'une détection** : inchangé (confiance × facteur de fréquence).

### 3.2 Connecteurs — `ConnectorDetector` (nouveau)

- **Listes** :
  - EN : furthermore, moreover, additionally, in addition, consequently, therefore, however, nevertheless, thus, hence, notably, ultimately, overall.
  - FR : en outre, par ailleurs, de plus, notamment, ainsi, toutefois, néanmoins, en effet, par conséquent, dès lors, en définitive, en conclusion, enfin.
  - Correspondance par frontière de mot Unicode, insensible à la casse.
  - Usages non connecteurs exclus (ajout après revue) : « de plus » suivi de « en plus » ou précédé de « fois », « rien », « pas », « jamais », « guère », « personne », d'un article ou d'un nombre ; « ainsi » suivi de « que ».
- **Marqueurs** : un `Detection` par connecteur (catégorie `transition`, type `connector`). Score de la détection = score de la famille. Suggestions : supprimer, ou reformuler sans connecteur.
- **Signal global `connector-density`** :
  - valeur = connecteurs pour 100 mots ÷ base `CONNECTOR_BASELINE = 0.6` ;
  - statut `alert` à partir de `CONNECTOR_ALERT_RATIO = 1.8`, `ok` en dessous ;
  - score = 0 jusqu'à 1×, puis linéaire jusqu'à 100 à `CONNECTOR_MAX_RATIO = 4` ;
  - plages = les phrases qui contiennent un connecteur ;
  - `insufficient` sous 30 mots.

### 3.3 Formulations stéréotypées — `StereotypeDetector` (nouveau)

Motifs (insensibles à la casse, frontière Unicode) :

| Motif | EN | FR | Confiance |
|---|---|---|---|
| Parallélisme négatif | `\b(it'?s|it is|this is|that'?s) not (just|only|merely|simply) [^.!?]{1,80}?[,;—–-]\s*(it'?s|it is|but)\b` | `\bce n'est pas (seulement|simplement|uniquement|qu')[^.!?]{1,80}?[,;—–-]\s*c'est\b` | 0,8 |
| Conclusion enflée | `serves as a testament to`, `stands as a testament to`, `underscor(es|ing) (its|the) importance`, `highlighting the (importance|significance)`, `plays a (crucial|pivotal|vital) role` | `témoigne de`, `souligne l'importance`, `joue un rôle (crucial|essentiel|clé|majeur)`, `il convient de noter`, `il est important de souligner`, `cette approche permet de` | 0,7 |
| Énumération par trois | `\b(\p{L}+(?: \p{L}+){0,2}), (\p{L}+(?: \p{L}+){0,2}),? and (\p{L}+(?: \p{L}+){0,2})\b` | idem avec `et` | 0,4 |

- **Énumérations par trois** : signalées seulement si le texte en contient au moins `TRIAD_MIN_COUNT = 2`. Sinon, aucun marqueur.
- **Faux amis exclus** : « not just because », « not only that » sans reprise, « ce n'est pas seulement pour cela » sans « c'est ».
- **Marqueurs** : un `Detection` par occurrence (catégorie `discourse-structure`, type `structural`), avec l'explication de la tournure.
- **Score de famille** : densité pour 100 mots (énumérations pondérées à 0,5) ; 100 à `STEREOTYPE_MAX_DENSITY = 1.5`.

### 3.4 Rythme — `RhythmDetector` (nouveau, global)

- Longueurs des phrases en mots ; μ moyenne, σ écart-type.
- `B = (σ − μ) / (σ + μ)`.
- Score : 0 si B ≥ `RHYTHM_HUMAN = -0.25` ; 100 si B ≤ `RHYTHM_AI = -0.55` ; linéaire entre les deux.
- Statut : `alert` si score ≥ 50 ; `insufficient` sous `RHYTHM_MIN_SENTENCES = 5` phrases **ou sous `MIN_WORDS_DENSITY = 30` mots** (ajout après revue : une liste courte n'a pas de rythme mesurable et obtenait 100/100).
- Plages : les phrases dont la longueur est à ±15 % de μ.
- Aucun marqueur ponctuel.

### 3.5 Paragraphes — `ParagraphDetector` (nouveau, global)

Paragraphes retenus : au moins `PARAGRAPH_MIN_WORDS = 8` mots. Il faut au moins `PARAGRAPH_MIN_COUNT = 3` paragraphes retenus, sinon `insufficient`.

- **Signal `paragraph-uniformity`** :
  - CV = σ/μ des longueurs de paragraphes (en mots) ;
  - score 100 si CV ≤ 0,15, score 0 si CV ≥ 0,45, linéaire entre les deux ;
  - `alert` si CV < `PARAGRAPH_CV_ALERT = 0.25` ;
  - plages = les paragraphes.
- **Signal `topic-sentences`** :
  - un paragraphe s'ouvre sur une phrase thématique si sa première phrase partage au moins 2 « mots porteurs » avec le reste du paragraphe ;
  - mots porteurs : au moins 4 lettres, hors liste de mots vides FR/EN, comparés en minuscules sans accents, sur les 5 premières lettres (racine grossière) ;
  - taux = paragraphes thématiques ÷ paragraphes retenus ;
  - score 0 si taux ≤ 0,73, score 100 si taux ≥ 0,94, linéaire entre les deux ;
  - `alert` si taux ≥ `TOPIC_ALERT = 0.9` ;
  - plages = les premières phrases concernées ;
  - les paragraphes d'une seule phrase comptent comme non thématiques.
- Aucun marqueur ponctuel.

## 4. Modèle de données — `src/types/types.ts`

```ts
type SignalFamily = "vocabulary" | "connectors" | "stereotypes" | "regularity";
type SignalStatus = "ok" | "alert" | "insufficient";

interface GlobalSignal {
  id: "connector-density" | "rhythm" | "paragraph-uniformity" | "topic-sentences";
  family: SignalFamily;
  label: string;          // ex. « Rythme des phrases »
  value: number;          // valeur mesurée (ratio, B, CV, taux)
  display: string;        // ex. « B = −0,52 (seuil −0,25) »
  score: number;          // 0–100
  status: SignalStatus;
  explanation: string;
  ranges: Array<{ start: number; end: number }>;
}

interface FamilyScore { family: SignalFamily; score: number; weight: number; measurable: boolean }

interface AnalysisResult {
  // champs existants conservés : totalScore, confidence, markerCount, categories, detections, segments?
  families: FamilyScore[];
  signals: GlobalSignal[];
  wordCount: number;
}
```

## 5. Score — `src/analysis/scoring.ts`

Poids : vocabulaire 0,30 ; connecteurs 0,20 ; stéréotypes 0,25 ; régularité 0,25.

| Famille | Score | Mesurable si |
|---|---|---|
| Vocabulaire | densité = Σ confiance des marqueurs ÷ mots × 100 ; score = min(100, densité ÷ 3 × 100) — 100 à 3 marqueurs pleins pour 100 mots | ≥ 30 mots |
| Connecteurs | score du signal `connector-density` | statut ≠ `insufficient` |
| Stéréotypes | score de densité (§3.3) | ≥ 30 mots |
| Régularité | max des scores `rhythm`, `paragraph-uniformity` et `topic-sentences` mesurables | au moins un des trois mesurable |

- **Score global** : Σ(score × poids) ÷ Σ(poids) sur les familles mesurables, arrondi et borné entre 0 et 100 ; 0 si aucune famille n'est mesurable.
- **Confiance** :
  - `low` si moins de 80 mots, ou au plus 1 famille avec un score ≥ 50 ;
  - `medium` si 2 familles avec un score ≥ 50 ;
  - `high` si 3 familles ou plus.
- `DetectorService.detectAll` orchestre l'ensemble : marqueurs, signaux, familles, score. L'ancien calcul (moyenne et bonus) est remplacé. Le popup en bénéficie via le background, sans modification.

## 6. Interface

### Panneau (`AnalysisPanel.tsx`), de haut en bas

1. Score /100, confiance et nombre de mots.
2. **Familles** : 4 lignes, chacune avec libellé, barre 0–100, score et poids. Une famille non mesurable affiche « texte trop court » en grisé.
3. **Signaux globaux** : une carte par signal, avec icône de statut (✓ ok, ⚠ alerte, ⋯ insuffisant), libellé, `display` et explication.
   - Les cartes en alerte ont un bouton **« Surligner les phrases »** ou « Retirer le surlignage ».
   - Une seule carte surlignée à la fois.
   - Le surlignage est retiré à la prochaine analyse si le signal n'est plus en alerte.
4. **Marqueurs ponctuels** : la liste actuelle, groupée par famille (Vocabulaire, Connecteurs, Formulations).
5. **Avertissement permanent** : « Indices stylistiques, pas une preuve. Les textes académiques formels et ceux d'auteurs non natifs produisent des faux positifs. »

### Éditeur

- **Nouvelle couche de décorations** `SignalHighlights`, distincte de `AiMarkers`, et de même nature : métadonnée de transaction, `addToHistory: false`, remappage à chaque modification.
- Classe `to-signal` : soulignement pointillé violet, sans fond, masqué à l'impression.
- `setSignalHighlight(state, ranges | null)`.

## 7. Cas limites

- **Texte vide** : état vide actuel, aucun appel.
- **Moins de 80 mots** : tout est calculé, la confiance est forcée à `low`.
- **Connecteur présent dans plusieurs listes** : une seule détection par position (déduplication par `start-end`, comme aujourd'hui).
- **Chevauchements** : une tournure stéréotypée qui contient un mot marqueur donne deux détections distinctes, que l'éditeur superpose.
- **Retours à la ligne** au milieu d'une phrase collée : chaque bloc reste une unité, sans recollage.
- **Titres et éléments de liste courts** : exclus des paragraphes (moins de 8 mots), mais comptés dans les phrases et les mots.

## 8. Tests

- `segment.test.ts` : abréviations EN/FR, décimales, initiales, `…`, guillemets, accents, apostrophes droites et typographiques, positions exactes.
- **Un test par détecteur** :
  - Connecteurs : densité juste sous et juste au-dessus de 1,8× ; `insufficient` sous 30 mots.
  - Stéréotypes : chaque motif en EN et en FR ; faux amis ; énumérations par trois signalées seulement à partir de 2.
  - Rythme : phrases régulières, alerte ; phrases variées, ok ; 4 phrases, `insufficient`.
  - Paragraphes : homogènes contre hétérogènes ; phrases thématiques ; titres exclus.
  - Vocabulaire : terme accentué en fin de mot ; connecteurs et formulations absents.
- `scoring.test.ts` : poids, exclusion et recalcul des poids, règles de confiance, bornes.
- **Calibration** : deux textes de référence EN et deux FR, un « IA typique » et un « humain varié » par langue. Pour chaque langue, le score IA doit dépasser le score humain d'au moins 25 points.
- **Performance** : `detectAll` sur 20 000 caractères en moins de 50 ms (médiane de 5 exécutions).
- **Non-régression** : les tests existants sont adaptés (connecteurs déplacés, nouveau calcul de score).
- **Navigateur** : cartes de signaux, bouton de surlignage, avertissement, exports toujours sans aucune décoration.
