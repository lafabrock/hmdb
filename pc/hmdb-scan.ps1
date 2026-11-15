# HMDB - envoie la liste des films et series au Google Sheet de la famille.
# Lance automatiquement par le Planificateur de taches Windows (voir LISEZMOI).
# Fichier volontairement sans accents : les chemins accentues sont trouves avec le joker "?".

$Api  = 'https://script.google.com/macros/s/AKfycbweBnYtZOBvW1vszKQgli5UUdwyPMecMkSCiPwRKJQVIpombUxYVFf3Y0XsSlBkGk3C/exec'
$Code = 'CODE_ADMIN'   # code admin (onglet Utilisateurs du Sheet)

# Z = films du disque reseau, S = series du disque reseau, W = films de Whale, T = series de Whale
$Roots = @(
  @{ r = 'Z'; path = '\\192.168.1.125\Public\Shared Videos' },
  @{ r = 'S'; path = '\\192.168.1.125\Public\Shared S?ries' },
  @{ r = 'W'; path = 'G:\Videoth?que' },
  @{ r = 'T'; path = 'G:\S?ries' }
)

$Log  = Join-Path $PSScriptRoot 'hmdb-scan.log'
$Exts = '.mkv', '.mp4', '.avi', '.m4v'
$files = New-Object System.Collections.Generic.List[object]
$report = @()

foreach ($root in $Roots) {
  $item = Get-Item -Path $root.path -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer } | Select-Object -First 1
  if (-not $item) { $report += "$($root.r): dossier introuvable ($($root.path))"; continue }
  $base = $item.FullName.TrimEnd('\')
  $n = 0
  Get-ChildItem -LiteralPath $base -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $Exts -contains $_.Extension.ToLower() } |
    ForEach-Object {
      $rel = $_.FullName.Substring($base.Length + 1) -replace '\\', '/'
      $mt  = ([DateTimeOffset]$_.LastWriteTimeUtc).ToUnixTimeMilliseconds()
      $files.Add([ordered]@{ r = $root.r; p = $rel; s = $_.Length; m = $mt })
      $n++
    }
  $report += "$($root.r): $n fichiers"
}

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
if ($files.Count -eq 0) {
  Add-Content -Path $Log -Value "$stamp Aucun fichier trouve, envoi annule. $($report -join ' | ')"
  exit 1
}

$body  = @{ action = 'scan'; code = $Code; files = $files } | ConvertTo-Json -Depth 4 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
try {
  $res = Invoke-RestMethod -Uri $Api -Method Post -Body $bytes -ContentType 'text/plain; charset=utf-8' -TimeoutSec 300
  if ($res.ok) { $msg = "OK : $($res.titres) titres a partir de $($res.fichiers) fichiers." }
  else { $msg = "Refuse : $($res.error)" }
} catch {
  $msg = "Erreur : $($_.Exception.Message)"
}
$line = "$stamp $msg  [$($report -join ' | ')]"
Add-Content -Path $Log -Value $line
Write-Output $line
