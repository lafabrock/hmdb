# HMDB – envoie la liste des films et séries au Google Sheet de la famille.
# Lancé automatiquement par le Planificateur de tâches Windows (voir LISEZMOI).
# Seuls les titres nettoyés sont publiés sur le site ; les noms de fichiers restent dans le Sheet privé.

$Api  = 'https://script.google.com/macros/s/AKfycbweBnYtZOBvW1vszKQgli5UUdwyPMecMkSCiPwRKJQVIpombUxYVFf3Y0XsSlBkGk3C/exec'
$Code = 'CODE_ADMIN'   # ton code admin (onglet Utilisateurs du Sheet)

# Dossiers surveillés : Z = films du disque réseau, S = séries du disque réseau, W = films de Whale, T = séries de Whale
$Roots = @(
  @{ r = 'Z'; path = '\\192.168.1.125\Public\Shared Videos' },
  @{ r = 'S'; path = '\\192.168.1.125\Public\Shared Séries' },
  @{ r = 'W'; path = 'G:\Videothèque' },
  @{ r = 'T'; path = 'G:\Séries' }
)

$Log  = Join-Path $PSScriptRoot 'hmdb-scan.log'
$Exts = '.mkv', '.mp4', '.avi', '.m4v'
$files = New-Object System.Collections.Generic.List[object]

foreach ($root in $Roots) {
  if (-not (Test-Path -LiteralPath $root.path)) {
    Add-Content -Path $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm') Dossier introuvable : $($root.path)"
    continue
  }
  $base = (Get-Item -LiteralPath $root.path).FullName.TrimEnd('\')
  Get-ChildItem -LiteralPath $base -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $Exts -contains $_.Extension.ToLower() } |
    ForEach-Object {
      $rel = $_.FullName.Substring($base.Length + 1) -replace '\\', '/'
      $mt  = ([DateTimeOffset]$_.LastWriteTimeUtc).ToUnixTimeMilliseconds()
      $files.Add([ordered]@{ r = $root.r; p = $rel; s = $_.Length; m = $mt })
    }
}

if ($files.Count -eq 0) {
  Add-Content -Path $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm') Aucun fichier trouvé, envoi annulé."
  exit 1
}

$body  = @{ action = 'scan'; code = $Code; files = $files } | ConvertTo-Json -Depth 4 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
try {
  $res = Invoke-RestMethod -Uri $Api -Method Post -Body $bytes -ContentType 'text/plain; charset=utf-8' -TimeoutSec 300
  if ($res.ok) { $msg = "OK : $($res.titres) titres à partir de $($res.fichiers) fichiers." }
  else { $msg = "Refusé : $($res.error)" }
} catch {
  $msg = "Erreur : $($_.Exception.Message)"
}
Add-Content -Path $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm') $msg"
Write-Output $msg
