# HMDB - a lancer UNE fois : apprend a Windows a ouvrir les boutons "Lire dans VLC" du site.
# Ne demande pas de droits administrateur (enregistrement pour ton compte Windows uniquement).
$script = Join-Path $PSScriptRoot 'hmdb-play.ps1'
if (-not (Test-Path $script)) { Write-Host "hmdb-play.ps1 introuvable a cote de ce fichier." -ForegroundColor Red; exit 1 }
$key = 'HKCU:\Software\Classes\hmdbplay'
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name '(Default)' -Value 'URL:HMDB lecture'
Set-ItemProperty -Path $key -Name 'URL Protocol' -Value ''
New-Item -Path "$key\shell\open\command" -Force | Out-Null
$cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '" "%1"'
Set-ItemProperty -Path "$key\shell\open\command" -Name '(Default)' -Value $cmd
Write-Host "OK : les boutons 'Lire dans VLC' du site ouvriront les films sur ce PC." -ForegroundColor Green
