# Intégration du catalogue Humanizer

Source : [blader/humanizer](https://github.com/blader/humanizer) v3.1.0 (MIT), fondé sur la page Wikipédia « Signs of AI writing ». Le skill est aussi installé dans `~/.claude/skills/humanizer/` pour réécrire un texte détecté.

## Principe

L'extension n'appelle aucun LLM : `SKILL.md` ne peut donc pas s'exécuter dedans. Son catalogue de motifs alimente les détecteurs existants, sans nouvelle famille de signaux (les poids de `FAMILY_WEIGHTS` ne changent pas).

## Correspondance

| § Humanizer | Où | Famille |
|---|---|---|
| 1 contraste « pas X mais Y » (deux phrases, « not only », « non pas ») | `humanizer-patterns.ts` | Formulations |
| 2 clôtures, 3 formules « profondes », 4 préambules, 5 objections fictives | `humanizer-patterns.ts` | Formulations |
| 13 signification gonflée, 22 résidus de chatbot, 23 limites de connaissance | `humanizer-patterns.ts` | Formulations |
| 12 mots IA, 15 participes, 16 langage commercial, 18 copules | `lexical-data.ts` | Vocabulaire |

Les explications reprennent le conseil de réécriture du catalogue. Une suggestion « Supprimer » n'est proposée que pour les résidus, préambules et clôtures, où retirer le segment laisse une phrase correcte.

## Écartés

- §21 guillemets courbes : `« »` et `’` sont la typographie française.
- §10 traits d'union : règle propre à l'anglais.
- §19-20 gras et titres décoratifs : dépendent de la mise en forme, pas du texte brut.
- §7-8 ouvertures répétées et tirets : signaux faibles, à traiter comme signal global plus tard.

## Garde-fous

- Les motifs ambigus (`To be clear`, `Great question`) ne comptent qu'en début de phrase.
- Les suggestions de remplacement n'utilisent pas de mots que le catalogue signale lui-même (`key`, `highlights`, `vital`).
- Contrôle : aucune détection sur `HUMAN_EN` et `HUMAN_FR`, scores des textes IA inchangés.
