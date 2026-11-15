#!/usr/bin/env bash
# Assemble les dossiers prêts à charger / packager pour Chrome et Firefox.
# Volontairement : AUCUN zip n'est créé ici, le packaging reste manuel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf dist
mkdir -p dist/chrome dist/firefox

for target in chrome firefox; do
  out="dist/$target"

  # Code commun
  cp -r src/common   "$out/common"
  cp -r src/background "$out/background"
  cp -r src/popup    "$out/popup"
  cp -r src/options  "$out/options"

  # Icônes réellement référencées par le manifeste
  mkdir -p "$out/icons"
  for size in 16 32 48 128; do
    cp "icons/icon-$size.png" "$out/icons/"
  done
  cp icons/doomname-logo.svg "$out/icons/"

  # Manifeste spécifique
  cp "src/manifest.$target.json" "$out/manifest.json"

  echo "✔ dist/$target prêt"
done

echo
echo "Chrome  : chrome://extensions → Mode développeur → Charger l'extension non empaquetée → dist/chrome"
echo "Firefox : about:debugging#/runtime/this-firefox → Charger un module temporaire → dist/firefox/manifest.json"
