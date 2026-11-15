# Assemble dist\chrome et dist\firefox. Aucun zip n'est créé : le packaging reste manuel.
# Usage, depuis la racine du projet :  .\build\build.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

foreach ($t in 'chrome', 'firefox') {
  $out = "dist\$t"
  New-Item -ItemType Directory -Force -Path "$out\icons" | Out-Null
  Copy-Item src\common, src\background, src\popup, src\options -Destination $out -Recurse
  16, 32, 48, 128 | ForEach-Object { Copy-Item "icons\icon-$_.png" "$out\icons\" }
  Copy-Item icons\doomname-logo.svg "$out\icons\"
  Copy-Item "src\manifest.$t.json" "$out\manifest.json"
  Write-Host "OK $out"
}

Write-Host ""
Write-Host "Chrome  : chrome://extensions -> Mode developpeur -> Charger l'extension non empaquetee -> dist\chrome"
Write-Host "Firefox : about:debugging#/runtime/this-firefox -> Charger un module temporaire -> dist\firefox\manifest.json"
