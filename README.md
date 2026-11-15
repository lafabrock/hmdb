# HMDB — films à voir de 9 à 12 ans

Liste de suivi des films de l'index par âge du livre « Les 200 films à voir avant d'être grand » (Philippe Besnier).

- Vue liste et vue galerie, recherche, filtres par âge et par statut
- Statuts : Vu / À voir / Pas intéressé (enregistrés dans le navigateur)
- Film au hasard
- Affiches via l'API [TMDB](https://www.themoviedb.org/). Ce site utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.

## Synchro et demandes

Les statuts et les demandes sont stockés dans un Google Sheet privé, via le script `apps-script/Code.gs`
déployé en application Web. L'adresse du déploiement se renseigne dans `index.html` (`var API='...'`).
Chaque membre de la famille se connecte avec un code personnel (onglet « Utilisateurs » du Sheet).
