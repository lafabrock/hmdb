# Mise à jour automatique de la vidéothèque

`hmdb-scan.ps1` parcourt les dossiers de films et de séries, puis envoie la liste au Google Sheet
de la famille (onglet « Vidéothèque »). Le site lit cet onglet à chaque visite.

1. Copier `hmdb-scan.ps1` dans `Documents\HMDB\` et remplacer `CODE_ADMIN` par le code admin.
2. Tester : clic droit sur le fichier > « Exécuter avec PowerShell ». Le résultat est écrit dans `hmdb-scan.log`.
3. Planifier (invite de commandes) :

```
schtasks /Create /TN "HMDB scan" /SC DAILY /ST 21:00 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%USERPROFILE%\Documents\HMDB\hmdb-scan.ps1\""
```

Pour corriger un titre mal reconnu : onglet « Corrections » du Sheet
(Titre détecté | Titre corrigé | Année | Catégorie | Saga | Ignorer = oui), puis relancer le scan.
