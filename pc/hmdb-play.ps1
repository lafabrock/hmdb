# HMDB - lecture sur PC : ouvre dans VLC un film du WD demande par le site.
# Appele par Windows pour les liens hmdbplay:///<racine>/<chemin> (voir hmdb-play-install.ps1).
# Par securite, n'ouvre que des fichiers video du partage Public du WD.
param([string]$Url)

$Nas = '\\192.168.1.125\Public'
$Roots = @{ 'Z' = 'Shared Videos'; 'S' = ('Shared S' + [char]0x00E9 + 'ries') }

try {
  $rest = $Url -replace '^hmdbplay:/*', ''
  $parts = $rest.Split('/') | Where-Object { $_ -ne '' } | ForEach-Object { [Uri]::UnescapeDataString($_) }
  if ($parts.Count -lt 2) { throw 'lien incomplet' }
  $root = $Roots[$parts[0]]
  if (-not $root) { throw 'racine inconnue' }
  $rel = $parts[1..($parts.Count - 1)]
  foreach ($p in $rel) { if ($p -eq '..' -or $p -eq '.' -or $p -match '[\\:*?"<>|]') { throw 'chemin refuse' } }
  if ($rel[-1] -notmatch '\.(mkv|mp4|avi|m4v)$') { throw 'pas une video' }
  $file = Join-Path (Join-Path $Nas $root) ($rel -join '\')

  $vlc = @("$env:ProgramFiles\VideoLAN\VLC\vlc.exe", "${env:ProgramFiles(x86)}\VideoLAN\VLC\vlc.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($vlc) { Start-Process -FilePath $vlc -ArgumentList ('"' + $file + '"') }
  else { Start-Process -FilePath $file }   # lecteur video par defaut de Windows
} catch {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("HMDB : impossible d'ouvrir ce film ($($_.Exception.Message)).", 'HMDB') | Out-Null
}
