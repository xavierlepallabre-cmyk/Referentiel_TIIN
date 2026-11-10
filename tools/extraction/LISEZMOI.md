# Scripts d'extraction (traçabilité)

Ces scripts ont servi **une seule fois** à extraire les données du PDF officiel du référentiel
vers `data/activites_competences.json` et `data/savoirs.json`. Ils sont conservés pour mémoire.

**Les fichiers JSON de `data/` font désormais foi** : corrigez-les directement, puis lancez
`python3 tools/genere_bundle.py`.

Ordre d'exécution (dans un dossier contenant `ref.txt` = `pdftotext -layout referentiel.pdf ref.txt`) :

1. `tbl.py <pdf>` : tableaux des fiches tâches (p. 21-45) → `tables_tasks.json`
2. `parse_tasks.py` : compétences, données, indicateurs par tâche → `task_cp.json`
3. `grid2.py <pdf>` : lecture graphique des matrices p. 20 (tâches × compétences, cases grisées)
   et p. 47 (compétences × savoirs, cases hachurées) → `grids.json`
4. `build_tc.py` : assemble activités, tâches, compétences ; **vérifie** que la matrice p. 20
   correspond exactement aux fiches détaillées (0 écart constaté)
5. `sav.py <pdf>` : savoirs S1-S7 (p. 48-58) ; le niveau de chaque ligne de tableau est lu
   d'après la colonne (1 à 4) où se trouve la barre hachurée
6. `build_sav.py` puis `s8.py` (S8 transcrit à la main, format capacités/connaissances) et `assemble.py`
