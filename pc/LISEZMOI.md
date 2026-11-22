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

## Lire les films depuis le navigateur d'un PC Windows

Le navigateur ne peut pas ouvrir VLC tout seul : on apprend une fois à Windows à le faire.

1. Copie `hmdb-play.ps1` et `hmdb-play-install.ps1` dans `Documents\HMDB` (clic droit → Propriétés → Débloquer, pour chacun).
2. Dans `cmd` :
   `powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\Documents\HMDB\hmdb-play-install.ps1"`
3. Sur le site, ouvre un film → **▶ Lire dans VLC**. Le navigateur demande « Ouvrir … ? » la première fois : coche « Toujours autoriser » puis Ouvrir.

Le lecteur n'ouvre que des vidéos du partage Public du WD (\\192.168.1.125\Public). Sans VLC installé, c'est le lecteur vidéo par défaut de Windows qui s'ouvre.
