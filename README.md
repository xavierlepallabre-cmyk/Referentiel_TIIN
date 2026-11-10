# Référentiel Bac Pro TIIN — outil de consultation

Application web (fonctionne hors ligne, sur tablette, téléphone ou ordinateur) pour exploiter le
référentiel du **Bac Pro Techniques d'Interventions sur Installations Nucléaires**.

## Ce que fait l'application

| Onglet | Usage |
|---|---|
| **Séance atelier** | Cocher les tâches réalisées pendant une activité → compétences mobilisées classées de la plus liée à la moins liée (indicateurs de performance, données), puis savoirs associés classés, dépliables jusqu'au détail avec niveaux taxonomiques. Copier le résumé, imprimer / PDF, enregistrer la séance. Le lien de la page contient les tâches cochées (`#t=T2.3,T6.3`) : on peut le partager. |
| **Savoirs** | S1 à S8 en entier, chaque sous-savoir avec son niveau (N1 à N4), filtre par niveau, recherche sans accents, définition des niveaux. |
| **Tâches & compétences** | Fiches détaillées : tâches (données / compétences / indicateurs), compétences (tâches et savoirs liés), activités (conditions de réalisation, résultats attendus). |
| **Matrices** | Tâches × compétences et compétences × savoirs, cliquables. |
| **Suivi des séances** | Séances enregistrées et couverture du référentiel (compétences et tâches jamais travaillées). Export / import JSON. |

### Calcul du classement

* **Compétence** : score = nombre de tâches cochées qui la mobilisent (ex. 3/4).
* **Savoir (S1-S8)** : score = somme, sur les compétences mobilisées, de leur score, pour chaque
  compétence reliée à ce savoir dans la matrice compétences × savoirs.

## Données

* `data/activites_competences.json` : 6 activités, 38 tâches, 15 compétences, liens et indicateurs.
* `data/savoirs.json` : définitions des niveaux, savoirs S1-S7 en arbre (niveau par élément), S8 en
  tableau capacités / connaissances / exemples (le référentiel n'y donne pas de colonne de niveaux).
* `data/referentiel.js` : **généré** à partir des deux JSON — après toute correction :

```bash
python3 tools/genere_bundle.py
```

Contrôles effectués lors de l'extraction : la matrice tâches × compétences (p. 20) concorde à 100 %
avec les fiches détaillées des tâches ; la matrice compétences × savoirs (p. 47) a été lue
graphiquement et vérifiée ; les niveaux des savoirs ont été lus d'après la position des barres
dans les colonnes 1 à 4 et contrôlés visuellement par sondage.

Particularités reprises telles quelles du référentiel : S3 ne comporte pas de § 3.3 ; la
compétence CP4.5 a un descriptif commun à 7 tâches (T2.5, T2.6, T4.1, T4.2, T6.3, T6.4, T6.5).

## Utilisation

* **En ligne** : activer GitHub Pages (Settings → Pages → branche `main`, dossier `/`), puis ouvrir
  l'adresse sur la tablette et « Ajouter à l'écran d'accueil » : l'application reste disponible
  hors connexion.
* **En local** : ouvrir `index.html` dans un navigateur (aucun serveur nécessaire).

Les séances enregistrées restent dans le navigateur de l'appareil utilisé (pensez à « Exporter »).
