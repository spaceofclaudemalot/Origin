Je veux que tu crées une **extension Chrome** appelée **TextOrigin AI**, conçue pour détecter, analyser, mettre en évidence et aider à supprimer ou reformuler les marqueurs stylistiques et linguistiques associés aux textes générés par des LLM.

L'application doit fonctionner principalement comme une extension Chrome capable d'analyser le texte présent sur une page web, dans des champs de saisie, des éditeurs en ligne et des documents entiers lorsque cela est techniquement possible.

Voici la description courte de l'application :

**TextOrigin AI est une extension Chrome d'analyse et d'édition de texte qui identifie les marqueurs stylistiques et linguistiques fréquemment associés aux textes générés par les modèles d'IA, les met en évidence directement dans le document, explique pourquoi ils sont signalés, propose des reformulations plus naturelles et permet de supprimer ou modifier les marqueurs individuellement ou en masse. L'utilisateur peut également analyser un document entier et obtenir un rapport global.**

Et voici le cahier des charges à exécuter :

# 1. BRAND

## Nom de l'application

**TextOrigin AI**

Le nom doit évoquer l'analyse de l'origine stylistique d'un texte sans affirmer de manière absolue qu'un texte est écrit par une IA.

## Positionnement

TextOrigin AI est un outil de détection et d'édition assistée destiné aux utilisateurs qui souhaitent identifier les formulations artificielles, répétitives, stéréotypées ou statistiquement atypiques dans leurs textes.

L'application doit adopter un positionnement transparent :

- Ne jamais présenter la détection comme une preuve absolue qu'un texte a été généré par une IA.
- Afficher des niveaux de confiance.
- Expliquer les raisons pour lesquelles une portion de texte est signalée.
- Distinguer clairement :
  - marqueur stylistique ;
  - marqueur lexical ;
  - marqueur syntaxique ;
  - marqueur statistique ;
  - watermark/provenance lorsque détectable ;
  - simple anomalie ou formulation inhabituelle.

- Informer l'utilisateur qu'un texte humain peut également contenir certains marqueurs.

## Identité visuelle

Créer une identité visuelle moderne, premium et orientée productivité.

Style :

- minimaliste ;
- professionnel ;
- technologique mais pas futuriste excessif ;
- lisible ;
- inspirant confiance ;
- adapté à une extension Chrome SaaS.

Couleurs recommandées :

- couleur principale : bleu profond / indigo ;
- couleur secondaire : violet ;
- vert pour les éléments considérés comme naturels/faible risque ;
- orange pour les éléments nécessitant une vérification ;
- rouge uniquement pour les alertes fortes ;
- arrière-plan clair avec possibilité de mode sombre.

Créer un logo simple représentant éventuellement :

- un document ;
- une loupe ;
- un signal ;
- ou une combinaison document + détection.

---

# 2. OBJECTIFS

Créer une extension Chrome d'analyse de texte pour :

- identifier les formulations fréquemment associées aux textes générés par des LLM ;
- détecter des marqueurs lexicaux et stylistiques ;
- détecter certaines régularités syntaxiques et discursives ;
- calculer des indicateurs statistiques lorsque le moteur d'analyse utilisé le permet ;
- analyser des documents complets ;
- mettre en évidence les passages suspects ;
- expliquer chaque détection ;
- proposer des alternatives rédactionnelles ;
- permettre la modification d'un marqueur individuellement ;
- permettre la modification de plusieurs marqueurs en une seule action ;
- permettre la réécriture de l'ensemble du document ;
- générer un rapport d'analyse ;
- fonctionner directement depuis le navigateur.

La cible principale est composée de :

- rédacteurs ;
- étudiants ;
- chercheurs ;
- journalistes ;
- créateurs de contenu ;
- professionnels du marketing ;
- copywriters ;
- enseignants ;
- éditeurs ;
- utilisateurs professionnels de ChatGPT, Claude, Gemini et autres LLM ;
- personnes souhaitant rendre un texte moins stéréotypé ou moins artificiel.

## Principales préoccupations de la cible

L'utilisateur veut pouvoir :

1. savoir quelles parties de son texte présentent des marqueurs associés à l'IA ;
2. comprendre pourquoi elles sont détectées ;
3. décider lui-même de les modifier ou non ;
4. conserver le sens original ;
5. améliorer naturellement le style ;
6. éviter une réécriture artificielle supplémentaire ;
7. analyser rapidement un texte court ou un document complet ;
8. travailler directement dans son navigateur ;
9. ne pas perdre son texte ;
10. obtenir des résultats compréhensibles plutôt qu'un simple pourcentage.

## Principe fondamental

Le produit ne doit jamais afficher uniquement :

> "Ce texte est généré par l'IA."

Il doit plutôt afficher :

> "Ce passage présente plusieurs marqueurs stylistiques fréquemment observés dans des textes générés par des LLM."

Afficher ensuite les éléments ayant conduit à cette conclusion.

---

# 3. BACK-OFFICE

Créer un véritable système d'administration permettant de gérer l'ensemble du produit.

## Dashboard administrateur

Créer un tableau de bord avec :

- nombre total d'utilisateurs ;
- utilisateurs actifs ;
- analyses réalisées ;
- textes analysés ;
- nombre moyen de marqueurs détectés ;
- nombre de reformulations effectuées ;
- statistiques quotidiennes ;
- statistiques hebdomadaires ;
- statistiques mensuelles ;
- taux d'utilisation des fonctionnalités ;
- erreurs système ;
- consommation API ;
- coûts API si disponibles.

Présenter les données sous forme de :

- KPI cards ;
- graphiques ;
- tableaux ;
- courbes temporelles.

---

## Gestion des utilisateurs

L'administrateur doit pouvoir :

- voir les utilisateurs ;
- rechercher un utilisateur ;
- filtrer par abonnement ;
- filtrer par activité ;
- consulter la date d'inscription ;
- consulter le nombre d'analyses ;
- consulter les limites d'utilisation ;
- suspendre un compte ;
- réactiver un compte ;
- supprimer un compte ;
- modifier manuellement une limite.

---

## Gestion des abonnements

Prévoir plusieurs niveaux :

### Free

- nombre limité d'analyses ;
- nombre limité de caractères ;
- analyse basique ;
- suggestions limitées.

### Pro

- analyses plus importantes ;
- documents complets ;
- analyses avancées ;
- suggestions avancées ;
- historique ;
- analyses statistiques.

### Business

- limites élevées ;
- comptes d'équipe ;
- statistiques avancées ;
- API ;
- administration centralisée.

Les limites doivent être configurables depuis le back-office.

---

# MOTEUR DE DÉTECTION

Créer une architecture modulaire afin de pouvoir ajouter plusieurs moteurs de détection.

Le système doit attribuer à chaque détection :

- type ;
- score ;
- niveau de confiance ;
- position dans le texte ;
- explication ;
- recommandation ;
- suggestion éventuelle.

## Moteur 1 : marqueurs lexicaux

Créer une base de données de termes et expressions fréquemment observés dans les textes générés par des LLM.

Exemples en anglais :

- delve
- underscores
- intricate
- pivotal
- crucial
- showcasing
- comprehensive
- meticulous
- tapestry
- certainly
- furthermore
- leverage

Mais ne pas limiter le système à cette liste.

Créer un système configurable permettant à l'administrateur :

- d'ajouter un terme ;
- de supprimer un terme ;
- de modifier son poids ;
- d'ajouter des variantes ;
- d'ajouter des expressions ;
- de définir la langue ;
- de définir des catégories.

Créer également une base française.

Le système doit prendre en compte le contexte afin de réduire les faux positifs.

---

# MOTEUR 2 : structures discursives

Identifier notamment :

- phrases d'introduction très génériques ;
- conclusions répétitives ;
- transitions excessives ;
- énumérations artificiellement régulières ;
- formulations très symétriques ;
- structures répétées ;
- paragraphes très homogènes ;
- phrases thématiques systématiques ;
- formulations de type :

"Ce n'est pas simplement X, c'est Y."

"Il convient de noter que..."

"En conclusion..."

"Il est important de souligner..."

"Cette approche permet de..."

"En définitive..."

Identifier également les structures équivalentes dans différentes langues.

---

# MOTEUR 3 : connecteurs excessifs

Analyser la fréquence des :

- moreover ;
- furthermore ;
- additionally ;
- consequently ;
- therefore ;
- however ;
- in conclusion ;
- notamment ;
- de plus ;
- en outre ;
- par ailleurs ;
- en conclusion ;
- ainsi ;
- en définitive.

Ne pas considérer automatiquement ces mots comme des marqueurs d'IA.

Analyser leur :

- fréquence ;
- répétition ;
- position ;
- densité ;
- contexte.

---

# MOTEUR 4 : régularité stylistique

Analyser :

- longueur des phrases ;
- variation des longueurs ;
- longueur des paragraphes ;
- répétition des structures ;
- diversité lexicale ;
- répétition des constructions ;
- fréquence des connecteurs ;
- équilibre entre phrases courtes et longues.

Créer des indicateurs inspirés de :

- perplexité ;
- burstiness ;
- diversité lexicale ;
- régularité syntaxique.

Important :

Ne pas prétendre calculer une véritable perplexité si aucun modèle de langage approprié n'est disponible.

Si nécessaire, créer une architecture permettant de brancher ultérieurement un modèle spécialisé.

---

# MOTEUR 5 : analyse statistique avancée

Prévoir une architecture compatible avec des méthodes telles que :

- PPL ;
- burstiness ;
- Binoculars ;
- DetectGPT ;
- classificateurs supervisés ;
- modèles Transformer ;
- analyse comparative entre modèles.

Ces méthodes doivent être encapsulées dans des modules indépendants.

Le système doit pouvoir afficher :

**Analyse statistique**

- Perplexité : disponible / non disponible
- Burstiness : score
- Régularité : score
- Diversité lexicale : score
- Score global : score

Ne jamais afficher une précision scientifique qui n'est pas réellement calculée.

---

# MOTEUR 6 : watermark et provenance

Prévoir une architecture permettant d'intégrer ultérieurement des détecteurs de :

- watermark ;
- SynthID-like signatures ;
- signaux statistiques ;
- métadonnées ;
- C2PA ;
- signatures de provenance.

Si une méthode fiable est disponible, afficher :

**Provenance détectée**

ou

**Aucun signal de provenance détecté**

mais ne jamais transformer "aucun signal détecté" en "texte humain".

---

# MOTEUR 7 : analyse par modèle

Prévoir la possibilité d'utiliser différents fournisseurs de modèles via une abstraction commune.

Architecture :

DetectorProvider

avec par exemple :

- LocalDetector ;
- OpenAICompatibleDetector ;
- AnthropicCompatibleDetector ;
- GoogleCompatibleDetector ;
- CustomDetector.

Le fournisseur doit pouvoir être changé sans modifier toute l'application.

---

# SYSTÈME DE SCORE

Créer un score global appelé :

**AI Marker Score**

Exemple :

0–20 : très peu de marqueurs détectés

21–40 : quelques marqueurs

41–60 : niveau intermédiaire

61–80 : nombreux marqueurs

81–100 : forte concentration de marqueurs

Mais présenter clairement ce score comme un **score de présence de marqueurs**, et non comme une probabilité certaine d'origine IA.

Créer également :

**Confidence Score**

qui mesure la confiance du moteur dans son analyse.

---

# DÉTECTION DANS LE NAVIGATEUR

L'extension doit pouvoir analyser :

- texte sélectionné ;
- champ textarea ;
- champ contenteditable ;
- éditeurs web ;
- pages web ;
- articles ;
- emails ;
- documents compatibles ;
- interfaces de rédaction.

Ajouter un bouton flottant :

**Analyze**

lorsqu'un utilisateur sélectionne du texte.

---

# ANALYSE D'UN DOCUMENT ENTIER

Créer une fonctionnalité :

**Analyze entire document**

Elle doit :

1. récupérer tout le texte compatible ;
2. découper le document en segments ;
3. analyser chaque segment ;
4. calculer les marqueurs ;
5. agréger les résultats ;
6. générer un score global ;
7. mettre en évidence les passages concernés ;
8. afficher un rapport détaillé.

Le système doit supporter les documents longs.

Utiliser un système de segmentation/chunking afin d'éviter les limites des modèles.

---

# MISE EN ÉVIDENCE

Chaque marqueur doit être visuellement identifiable.

Utiliser plusieurs couleurs selon le niveau :

- jaune : faible ;
- orange : moyen ;
- rouge : élevé ;
- violet : structure stylistique ;
- bleu : information statistique.

Au survol d'un marqueur, afficher une tooltip :

**Marqueur détecté**

Type : Connecteur excessif

Pourquoi :
"Cette expression est fréquemment observée dans les textes générés par des LLM et apparaît ici avec une fréquence élevée."

Suggestion :

"En revanche"

Actions :

- Remplacer
- Ignorer
- Ajouter au dictionnaire
- Voir les détails

---

# MODIFICATION INDIVIDUELLE

Chaque marqueur doit pouvoir être modifié individuellement.

Actions :

- Remplacer ;
- Reformuler ;
- Supprimer ;
- Ignorer ;
- Ajouter à la liste blanche.

Exemple :

Texte :

"Cette approche permet notamment d'améliorer..."

Suggestion :

"Cette approche améliore..."

L'utilisateur doit pouvoir accepter ou refuser la modification.

---

# MODIFICATION EN MASSE

Créer un bouton :

**Fix all**

permettant d'appliquer automatiquement les modifications recommandées.

Avant application :

Afficher :

**17 modifications seront appliquées.**

Permettre :

- Tout appliquer ;
- Tout refuser ;
- Sélectionner les modifications.

---

# MODE RÉÉCRITURE

Créer une fonctionnalité :

**Rewrite naturally**

L'utilisateur choisit :

- Minimal changes ;
- Natural ;
- Professional ;
- Academic ;
- Conversational ;
- Concise ;
- Custom.

Conserver impérativement :

- le sens ;
- les informations ;
- les chiffres ;
- les citations ;
- les URLs ;
- les noms propres.

Ne modifier que ce qui est nécessaire.

---

# HISTORIQUE

Créer un historique permettant de consulter :

- documents analysés ;
- date ;
- score ;
- nombre de marqueurs ;
- modifications ;
- version originale ;
- version modifiée.

Ajouter :

**Restore original**

pour restaurer la version initiale.

---

# RAPPORT D'ANALYSE

Créer un rapport avec :

### Résumé

- AI Marker Score ;
- Confidence ;
- nombre de marqueurs ;
- nombre de passages concernés ;
- principales catégories.

### Analyse

- vocabulaire ;
- syntaxe ;
- structure ;
- connecteurs ;
- régularité ;
- statistiques.

### Recommandations

Afficher les principales actions à effectuer.

Ajouter un bouton :

**Export report**

Formats :

- PDF ;
- JSON ;
- CSV.

---

# DICTIONNAIRE PERSONNEL

Créer une fonctionnalité permettant à l'utilisateur de gérer une liste blanche.

Exemple :

Si un terme est légitime dans son domaine, l'utilisateur peut sélectionner :

**Ignore this term**

Le terme ne sera plus signalé pour cet utilisateur.

---

# 4. MENU

Créer une navigation claire.

## Extension Popup

Menu :

- **Dashboard**
- **Analyze Selection**
- **Analyze Page**
- **Analyze Document**
- **Issues**
- **Rewrite**
- **History**
- **Dictionary**
- **Settings**
- **Upgrade**

## Dashboard

Afficher :

- score de la dernière analyse ;
- derniers documents ;
- nombre de marqueurs détectés ;
- bouton Analyze.

---

# 5. FRONT-OFFICE

L'interface utilisateur doit être extrêmement simple.

## Popup Chrome

Créer un popup moderne avec :

- logo ;
- nom TextOrigin AI ;
- bouton principal "Analyze";
- bouton "Analyze page";
- bouton "Analyze document";
- score actuel ;
- résumé rapide.

Exemple :

**AI Marker Score**

42 / 100

**12 markers detected**

---

# ÉCRAN D'ANALYSE

Créer une interface en deux colonnes.

### Colonne gauche

Texte original avec les marqueurs surlignés.

### Colonne droite

Panneau d'analyse :

- score ;
- catégories ;
- détails ;
- suggestions.

Lorsqu'un marqueur est sélectionné à gauche, son explication s'affiche automatiquement à droite.

---

# DESIGN

Le design doit respecter :

- interface moderne ;
- responsive ;
- accessible ;
- excellent contraste ;
- typographie lisible ;
- animations discrètes ;
- feedback immédiat ;
- états loading ;
- états success ;
- états error ;
- empty states.

Prévoir Dark Mode.

---

# UX

Chaque action importante doit avoir un feedback.

Exemples :

**Analyse en cours...**

**Analyse terminée**

**12 marqueurs détectés**

Après une modification :

**Modification appliquée**

Après une modification globale :

**17 modifications appliquées**

---

# 6. AUTHENTIFICATION

Créer :

- inscription ;
- connexion ;
- déconnexion ;
- récupération du mot de passe ;
- connexion Google si disponible ;
- gestion du profil.

L'utilisateur doit pouvoir voir :

- son abonnement ;
- sa consommation ;
- sa limite restante.

---

# 7. CONFIDENTIALITÉ

La confidentialité doit être une priorité.

Afficher clairement :

- quand le texte quitte le navigateur ;
- quel service analyse le texte ;
- quelles données sont conservées ;
- possibilité de supprimer l'historique ;
- politique de confidentialité.

Ne jamais envoyer automatiquement une page entière à un serveur externe sans action explicite de l'utilisateur.

Prévoir une architecture permettant autant que possible :

- traitement local pour les détections simples ;
- traitement serveur uniquement pour les analyses avancées.

---

# 8. ARCHITECTURE TECHNIQUE

Créer une architecture Chrome Extension moderne basée sur :

- **React**
- **TypeScript**
- **Vite**
- **Manifest V3**
- **Tailwind CSS**
- composants UI réutilisables ;
- architecture modulaire.

Structure recommandée :

/extension
/popup
/content
/background
/options
/components
/services
/detectors
/utils
/types

---

# 9. BACKEND

Créer un backend sécurisé permettant :

- authentification ;
- utilisateurs ;
- abonnements ;
- historique ;
- analyses ;
- dictionnaires personnels ;
- configuration des détecteurs ;
- statistiques.

Technologies recommandées :

- Node.js ;
- TypeScript ;
- API REST ou tRPC ;
- PostgreSQL ;
- Prisma ou Drizzle ORM.

---

# 10. IA / ANALYSE

Créer une couche d'abstraction :

AnalysisEngine

avec plusieurs modules :

LexicalDetector

StructuralDetector

StatisticalDetector

StyleDetector

WatermarkDetector

ClassifierDetector

Chaque module doit retourner un format standardisé :

{
type,
category,
text,
start,
end,
score,
confidence,
explanation,
suggestions
}

Cela permettra d'ajouter de nouveaux détecteurs sans réécrire l'application.

---

# 11. API

Créer des endpoints permettant notamment :

POST /api/analyze

POST /api/analyze/document

POST /api/rewrite

GET /api/history

GET /api/history/:id

DELETE /api/history/:id

GET /api/dictionary

POST /api/dictionary

DELETE /api/dictionary/:id

GET /api/profile

GET /api/usage

---

# 12. PERFORMANCE

L'extension doit être rapide.

Pour les analyses simples :

- traitement local lorsque possible ;
- éviter les requêtes réseau inutiles ;
- debounce ;
- cache ;
- analyse par segments.

Pour les gros documents :

- chunking ;
- traitement asynchrone ;
- barre de progression ;
- possibilité d'annuler l'analyse.

Exemple :

**Analyse : 63 %**

**Segment 12 / 19**

---

# 13. GESTION DES ERREURS

Prévoir les cas :

- texte vide ;
- texte trop court ;
- texte trop long ;
- API indisponible ;
- quota dépassé ;
- erreur réseau ;
- document non compatible ;
- page protégée ;
- contenu inaccessible.

Afficher des messages compréhensibles.

Ne jamais afficher une erreur technique brute à l'utilisateur final.

---

# 14. EXTENSION CHROME

Créer véritablement les composants nécessaires à une extension Chrome Manifest V3 :

- manifest.json ;
- background service worker ;
- content scripts ;
- popup ;
- options page ;
- permissions minimales nécessaires.

Permissions à limiter au strict nécessaire.

L'extension doit pouvoir :

1. détecter une sélection ;
2. lancer une analyse ;
3. analyser une page ;
4. surligner les résultats ;
5. proposer des modifications ;
6. modifier le texte lorsque techniquement possible ;
7. analyser un document compatible.

---

# 15. COMPATIBILITÉ

Prévoir une architecture permettant d'intégrer progressivement :

- ChatGPT ;
- Claude ;
- Gemini ;
- Microsoft Copilot ;
- Perplexity ;
- éditeurs web ;
- Google Docs lorsque techniquement possible ;
- Notion lorsque techniquement possible ;
- Word Online lorsque techniquement possible.

Ne pas supposer que toutes les interfaces autorisent la modification automatique du texte.

Si une page empêche techniquement l'édition :

Afficher les résultats et proposer :

**Copy revised text**

---

# 16. MODÈLE DE DONNÉES

Créer les principales entités :

User

Subscription

Analysis

AnalysisSegment

Detection

Suggestion

Document

DocumentVersion

DictionaryEntry

Usage

Detector

DetectorConfiguration

Chaque analyse doit pouvoir être associée à plusieurs détections.

---

# 17. ADMINISTRATION DES RÈGLES

Dans le back-office, créer une interface :

**Detection Rules**

L'administrateur peut :

- créer une règle ;
- modifier une règle ;
- désactiver une règle ;
- supprimer une règle ;
- définir son poids ;
- définir son niveau ;
- définir sa langue ;
- définir son explication ;
- définir ses suggestions.

Exemple :

Rule :

"Furthermore"

Category :

Transition

Weight :

0.65

Language :

English

Suggestion :

"Use a more direct transition or remove it."

---

# 18. SYSTÈME DE SUGGESTIONS

Chaque détection doit pouvoir proposer plusieurs alternatives.

Exemple :

Détection :

"Furthermore"

Suggestions :

- supprimer ;
- "De plus" ;
- reformuler la phrase ;
- transition naturelle personnalisée.

Le moteur doit éviter les remplacements mécaniques.

La suggestion doit tenir compte de la phrase complète.

---

# 19. ANALYSE MULTILINGUE

Support initial :

- Français ;
- Anglais.

Architecture prête pour :

- Espagnol ;
- Allemand ;
- Italien ;
- Portugais ;
- autres langues.

Les règles doivent être spécifiques à chaque langue.

Ne jamais appliquer aveuglément les règles anglaises au français.

---

# 20. ONBOARDING

Lors de la première installation :

Écran 1 :

**Bienvenue sur TextOrigin AI**

Écran 2 :

**Analysez vos textes**

Écran 3 :

**Identifiez les marqueurs**

Écran 4 :

**Corrigez-les en un clic**

Écran 5 :

**Gardez le contrôle de votre texte**

Puis bouton :

**Start analyzing**

---

# 21. EXEMPLE D'EXPÉRIENCE UTILISATEUR

L'utilisateur sélectionne :

"Furthermore, this comprehensive approach underscores the pivotal importance of..."

L'extension détecte :

- Furthermore → connecteur surutilisé ;
- comprehensive → vocabulaire caractéristique ;
- underscores → vocabulaire caractéristique ;
- pivotal → vocabulaire caractéristique.

L'interface affiche :

**4 markers detected**

Puis :

**Why?**

"Cette phrase contient plusieurs marqueurs lexicaux et discursifs fréquemment observés dans des textes générés par des LLM."

Suggestions :

"Cette approche met en évidence l'importance de..."

L'utilisateur peut :

- Apply ;
- Ignore ;
- Edit ;
- Rewrite.

---

# 22. SCORE GLOBAL DU DOCUMENT

Pour un document entier, afficher :

**Document Analysis**

AI Marker Score : 67/100

Confidence : Medium

Markers : 24

Sections analyzed : 18

Catégories :

Lexical : 12

Structural : 6

Transitions : 4

Regularity : 2

Afficher également une carte du document avec les zones les plus concernées.

---

# 23. IMPORTANT : LIMITES SCIENTIFIQUES

Intégrer dans l'application une information pédagogique expliquant que :

- les détecteurs d'IA ne sont pas infaillibles ;
- un texte humain peut être détecté à tort ;
- un texte généré par IA peut être modifié et ne plus présenter certains marqueurs ;
- la paraphrase peut modifier les caractéristiques statistiques ;
- les textes académiques peuvent naturellement présenter une forte régularité ;
- les auteurs non natifs peuvent être davantage exposés aux faux positifs ;
- l'absence de marqueurs ne prouve pas une origine humaine ;
- la présence de marqueurs ne prouve pas une origine IA.

Le produit doit donc parler de :

**AI-associated markers**

et non de :

**proof of AI generation**

---

# 24. TECHNOLOGIES

Utiliser de préférence :

- Chrome Extension Manifest V3 ;
- React ;
- TypeScript ;
- Vite ;
- Tailwind CSS ;
- shadcn/ui ou équivalent ;
- Node.js ;
- PostgreSQL ;
- Prisma ou Drizzle ;
- API REST/tRPC ;
- système d'authentification sécurisé ;
- service worker ;
- content scripts ;
- stockage Chrome Storage API ;
- Web Workers si nécessaire pour les analyses lourdes ;
- moteur de recherche/vector database uniquement si la fonctionnalité retrieval est réellement utilisée ;
- modèles NLP/LLM via une abstraction provider ;
- Docker pour le déploiement ;
- tests unitaires ;
- tests d'intégration ;
- tests end-to-end.

---

# 25. SÉCURITÉ

Implémenter :

- validation des entrées ;
- sanitation du HTML ;
- protection XSS ;
- authentification sécurisée ;
- autorisation côté serveur ;
- rate limiting ;
- protection des API keys ;
- chiffrement des données sensibles ;
- logs sans contenu utilisateur sensible ;
- suppression sécurisée des données.

Les clés API des fournisseurs d'IA ne doivent jamais être exposées dans le code de l'extension.

---

# 26. TESTS

Créer des tests pour :

- détection lexicale ;
- détection structurelle ;
- scoring ;
- segmentation ;
- suggestions ;
- remplacement individuel ;
- remplacement global ;
- restauration ;
- historique ;
- authentification ;
- limites utilisateur ;
- API ;
- extension Chrome ;
- content script.

Créer également des tests avec :

1. texte clairement humain ;
2. texte clairement généré par LLM ;
3. texte humain académique ;
4. texte d'un auteur non natif ;
5. texte IA fortement réécrit ;
6. texte hybride humain + IA.

Le système doit mesurer les faux positifs et faux négatifs lorsque des données de référence sont disponibles.

---

# 27. QUALITÉ DU CODE

Le code doit être :

- propre ;
- modulaire ;
- fortement typé ;
- documenté lorsque nécessaire ;
- facilement maintenable ;
- scalable ;
- sans duplication inutile.

Ne pas créer un simple prototype visuel.

Créer une véritable base fonctionnelle permettant de poursuivre le développement en production.

---

# 28. PRIORITÉ MVP

Si certaines fonctionnalités avancées ne peuvent pas être entièrement implémentées immédiatement, prioriser dans cet ordre :

1. Extension Chrome ;
2. sélection de texte ;
3. analyse du texte ;
4. détection lexicale ;
5. détection structurelle ;
6. scoring ;
7. surlignage ;
8. explication des marqueurs ;
9. suggestions ;
10. modification individuelle ;
11. modification globale ;
12. analyse d'une page ;
13. analyse d'un document ;
14. historique ;
15. authentification ;
16. back-office ;
17. moteurs statistiques avancés ;
18. watermark/provenance ;
19. classificateurs avancés.

Ne jamais simuler silencieusement une fonctionnalité avancée.

Si une fonctionnalité nécessite une API ou un modèle externe non disponible, créer l'architecture et une interface clairement identifiée comme "provider à connecter".

---

# 29. DESIGN DU TABLEAU DE BORD

Créer un dashboard premium avec :

### Header

Logo + TextOrigin AI

Navigation

Profil utilisateur

### Hero

"Understand your text."

Sous-titre :

"Detect AI-associated writing patterns and improve your text while keeping your original meaning."

Bouton :

**Analyze text**

### Statistics

- Documents analyzed
- Markers detected
- Average score
- Rewrites performed

### Recent analyses

Liste des derniers documents.

---

# 30. EXTENSION POPUP

Le popup doit être compact mais puissant.

Afficher :

**TextOrigin AI**

"Analyze your current text"

Boutons :

**Analyze selection**

**Analyze page**

**Analyze document**

Puis :

**Latest analysis**

Score circulaire.

Exemple :

67

AI Marker Score

12 markers

Bouton :

**View full analysis**

---

# 31. PRINCIPES UX IMPORTANTS

L'utilisateur doit toujours comprendre :

- ce qui a été détecté ;
- pourquoi ;
- avec quel niveau de confiance ;
- ce qui peut être modifié ;
- ce qui sera modifié ;
- comment annuler.

Ne jamais modifier automatiquement un texte sans action explicite de l'utilisateur.

Avant une modification en masse, demander confirmation.

---

# 32. LIVRABLE FINAL

Créer une application complète avec :

- extension Chrome ;
- interface popup ;
- dashboard ;
- analyseur ;
- moteur de détection ;
- surlignage ;
- suggestions ;
- réécriture ;
- analyse document ;
- historique ;
- dictionnaire ;
- authentification ;
- back-office ;
- architecture backend ;
- base de données ;
- API ;
- système de scoring ;
- architecture de plugins/détecteurs.

Créer également des données de démonstration réalistes afin que l'application soit immédiatement testable.

Prévoir un mode Demo permettant de tester l'application sans configuration externe.

---

# 33. RÈGLE ABSOLUE D'EXÉCUTION

**Ne pas s'arrêter avant que toutes les fonctionnalités et tous les boutons soient cliquables et fonctionnels.**

Aucun bouton ne doit être purement décoratif.

Tous les boutons doivent :

- effectuer l'action prévue ;
- afficher un état de chargement si nécessaire ;
- afficher une confirmation ;
- gérer les erreurs ;
- disposer d'un état désactivé lorsque l'action n'est pas disponible.

Ne pas créer de faux écrans destinés uniquement à donner l'impression que l'application fonctionne.

Si une fonctionnalité nécessite un service externe qui n'est pas configuré, créer une abstraction propre, un mode démo fonctionnel et indiquer clairement où connecter le service réel.

Avant de considérer le projet comme terminé :

1. vérifier tous les parcours utilisateur ;
2. tester tous les boutons ;
3. tester les menus ;
4. tester les formulaires ;
5. tester l'analyse ;
6. tester les modifications ;
7. tester l'annulation ;
8. tester l'analyse d'un document complet ;
9. tester les erreurs ;
10. vérifier la responsivité ;
11. vérifier l'accessibilité ;
12. vérifier l'extension Chrome ;
13. vérifier que le code compile sans erreur ;
14. corriger les erreurs détectées ;
15. vérifier que les fonctionnalités principales fonctionnent réellement de bout en bout.

**Construis l'application de manière production-ready et ne te contente pas d'une maquette UI.**
