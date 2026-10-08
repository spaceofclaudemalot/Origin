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
