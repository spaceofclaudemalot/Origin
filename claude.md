# Projet

\

# Règles tokens (priorité max)

- Ne jamais lire un dossier ou fichier entier "pour voir". D'abord Graphify, puis lecture ciblée (lignes utiles).
- Ne pas relire un fichier déjà lu dans la session.
- Sorties longues (logs, tests, diffs): filtrer (`| tail -30`, `grep`) avant de les lire.
- Pas de réécriture complète de fichier: éditer uniquement les lignes concernées.
- `/compact` à ~60% de contexte; `/clear` entre deux tâches sans lien.

# Navigation (Graphify)

- Avant toute tâche non triviale: interroger le graphe Graphify (structure, dépendances, fichiers concernés).
- Régénérer le graphe seulement après un gros changement de structure.
- Le graphe remplace l'exploration à l'aveugle (Glob/Grep large).

# Workflow (Superpowers)

- Tâche floue ou nouvelle feature: `/brainstorming` puis plan écrit (`/write-plan`).
- Exécution: `/execute-plan` par lots, avec points de contrôle.
- Bug: debugging systématique (cause racine avant correctif).
- Code métier: TDD (test qui échoue d'abord).
- Tâche triviale (1 fichier, <20 lignes): faire directement, sans skill ni sous-agent.

# Routage des modèles (toujours passer `model` sur chaque appel Agent)

- fable: architecture, bugs difficiles, revue finale
- opus: refactors multi-fichiers complexes
- sonnet (défaut): edits, tests, docs, refactors standards
- haiku: recherches, lookups, résumés, exploration
- Escalade d'un cran après 2 échecs.

# Sous-agents (ECC)

- Utiliser les agents ECC spécialisés (planner, code-reviewer, security-reviewer, build-error-resolver) plutôt que d'en créer.
- Un sous-agent = une tâche, un périmètre de fichiers, un critère d'acceptation.
- Tâches indépendantes: en parallèle.
- Rapport de sous-agent: 10 lignes max (fichiers modifiés, résultat des tests, risques).
- Le principal lit le rapport, pas les fichiers. Exception: revue et bug, où l'on lit le diff.
- Revue de sécurité (ECC) avant tout merge touchant auth, paiement ou données.

# Base de données (MCP Neon)

- Schéma: passer par le MCP Neon (ou le graphe) au lieu de deviner ou lire les migrations.
- Toute migration ou changement de schéma: tester d'abord sur une branche Neon, jamais directement sur main/prod.
- Requêtes exploratoires: `LIMIT` obligatoire, colonnes explicites (pas de `SELECT *`).
- Jamais de DROP/DELETE/UPDATE sans WHERE sans confirmation explicite.
- Ne jamais afficher de secrets ni de chaînes de connexion.

# Définition de "terminé"

Tests verts + lint OK + résumé de 3 lignes max.
Never consult the advisor tool.
