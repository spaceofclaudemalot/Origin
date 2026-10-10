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
Texte : coller un paragraphe d'IA typique (4 paragraphes réguliers, connecteurs, « serves as a testament to »).
- [ ] Surlignage ~0,5 s après la frappe ; panneau à jour (score, confiance, nombre de mots).
- [ ] 4 familles avec barres et poids ; famille non mesurable → « texte trop court ».
- [ ] 4 signaux globaux (connecteurs, rythme, homogénéité, phrases d'ouverture) avec valeur et seuil.
- [ ] « Surligner les phrases » : pointillé violet ; second clic retire ; un seul signal à la fois.
- [ ] Marqueurs groupés Vocabulaire / Connecteurs / Formulations ; survol → infobulle.
- [ ] « → Moreover » sur « Furthermore » garde la majuscule ; Ctrl+Z rétablit.
- [ ] Masquer / afficher les marqueurs ; le score reste.
- [ ] Avertissement « Indices stylistiques, pas une preuve… » visible en permanence.
- [ ] Texte humain varié → score nettement plus bas, rythme « ok ».
- [ ] Document vide → « Écrivez ou collez du texte pour l'analyser. »


## D bis. Caractères invisibles
Texte piégé : une phrase anglaise avec espace insécable (« The model »), un ZWSP au milieu d'un mot, et du texte caché en caractères tag (outil en ligne « ASCII smuggler »).
- [ ] Badges violets (ZWSP, NBSP) et rouge (⚠ TAG) dans le texte, sans le modifier.
- [ ] Section « Caractères invisibles » : décompte par type, bandeau rouge avec le texte caché décodé.
- [ ] Texte français bien composé (« Oui », « dit-il ! », espace fine avant « : ») et émojis composés → rien de signalé.
- [ ] Clic sur un type → sélection de la première occurrence.
- [ ] « Nettoyer le texte » → caractères retirés, typographie française conservée ; Ctrl+Z rétablit tout d'un coup.
- [ ] Score IA identique avant et après nettoyage.
- [ ] Popup : « Caractères invisibles N (dont X suspects) » sous le score, en rouge si suspect.
- [ ] Impression : aucun badge.
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

## G. Refonte de l'interface (0.3)
Document de test : 4 paragraphes dont un « humain » sans marqueur, une liste, un tableau avec un marqueur dans une cellule, une image.

Disposition (redimensionner la fenêtre) :
- [ ] 1600 px : rail noir, colonne Documents épinglée, feuille, colonne Analyse.
- [ ] 1300 px : Documents en tiroir (bouton du rail), Analyse en colonne.
- [ ] 1000 px puis 800 px : Documents et Analyse en tiroirs ; la feuille se resserre, aucun défilement horizontal.
- [ ] Désépingler Documents à 1600 px, recharger : la préférence est conservée. Sous 1200 px, l'épinglage est ignoré.
- [ ] Échap ferme un tiroir et rend le focus au bouton du rail ; clic sur le voile ferme aussi.

Thème :
- [ ] Système en clair : cadre gris mat, accent orange, aucune couleur rouge/violette/bleue d'interface.
- [ ] Système en sombre : cadre anthracite, rail noir, **feuille toujours claire**, infobulle des marqueurs claire.
- [ ] Popup en clair et en sombre : boutons « Analyser la sélection » / « Ouvrir dans l'éditeur », jauge de score.

Étiquettes en marge :
- [ ] Une étiquette « N MARQUEUR(S) » à côté de chaque paragraphe, élément de liste ou cellule qui contient des marqueurs ; rien sur le paragraphe humain.
- [ ] Un paragraphe avec seulement une phrase de signal en alerte : étiquette noire (« CONNECTEURS », « RYTHME »…).
- [ ] Grand écran : étiquettes à gauche, hors de la feuille ; écran plus étroit : dans la marge gauche de la feuille.
- [ ] Paragraphes courts consécutifs : étiquettes empilées sans se chevaucher.
- [ ] Pendant la frappe et le défilement, les étiquettes restent alignées sur leur paragraphe ; elles se mettent à jour après l'analyse.
- [ ] Survol d'une étiquette : contour sur les marqueurs du bloc (et phrases du signal soulignées) ; le contour disparaît à la sortie.
- [ ] Clic sur une étiquette : le panneau (ou le tiroir) d'analyse s'ouvre sur la bonne section, la détection est dépliée et sélectionnée dans le texte.
- [ ] « Masquer les marqueurs » (œil) masque aussi les étiquettes et les barres.

Impression et export :
- [ ] PDF en clair **et** en sombre : fond blanc, ni rail, ni colonnes, ni étiquettes, ni barres, ni marqueurs.
- [ ] Word (.docx) : identique à la version précédente.

Clavier :
- [ ] Tab : anneau de focus orange visible sur tous les contrôles (rail, menus, étiquettes, sections repliables).
- [ ] Menus « Exporter » et « … » : flèches haut/bas, Échap ferme et rend le focus.
