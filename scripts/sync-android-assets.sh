#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/android/app/src/main/assets"

if [ ! -d "$DEST/fonts" ]; then
  echo "ERROR: no se encuentra $DEST/fonts — aborta" >&2
  exit 1
fi

echo "Limpiando bundle (conservando fonts/)..."
find "$DEST" -mindepth 1 -maxdepth 1 ! -name 'fonts' -exec rm -rf {} +

echo "Copiando src/herramientas/vanilla/..."
mkdir -p "$DEST/src/herramientas"
cp -R "$ROOT/src/herramientas/vanilla" "$DEST/src/herramientas/vanilla"

echo "Copiando paginas legales al root del bundle..."
[ -f "$ROOT/legal.html" ]   && cp "$ROOT/legal.html"   "$DEST/legal.html"
[ -f "$ROOT/privacy.html" ] && cp "$ROOT/privacy.html" "$DEST/privacy.html"

echo "Aplicando transformaciones Android (fonts locales + sin sw-updater)..."
mapfile -t HTML_FILES < <(find "$DEST/src/herramientas/vanilla" -name '*.html' -type f 2>/dev/null; for p in legal.html privacy.html; do [ -f "$DEST/$p" ] && echo "$DEST/$p"; done)

for file in "${HTML_FILES[@]}"; do
  sed -i \
    -e '\|<link[^>]*fonts\.googleapis\.com[^>]*>|d' \
    -e '\|<script[^>]*sw-updater\.js[^>]*></script>|d' \
    -e '\|<link[^>]*rel="manifest"[^>]*>|d' \
    -e '\|<link[^>]*rel="icon"[^>]*>|d' \
    -e '\|<link[^>]*rel="apple-touch-icon"[^>]*>|d' \
    "$file"
  if ! grep -q "local-fonts.css" "$file"; then
    sed -i 's|<head>|<head>\n  <link rel="stylesheet" href="/fonts/local-fonts.css">|' "$file"
  fi
  if ! grep -q 'rel="icon" href="data:' "$file"; then
    sed -i 's|<head>|<head>\n  <link rel="icon" href="data:,">|' "$file"
  fi
  # El "volver" de las paginas legales apunta a la landing publica, que dentro
  # de la app solo ofrece el enlace de la Play Store. En la app se vuelve al
  # dashboard, que es la pantalla de inicio.
  case "$(basename "$file")" in
    legal.html|privacy.html)
      sed -i \
        -e 's|href="index\.html"|href="src/herramientas/vanilla/dashboard.html"|' \
        -e 's|href="\./index\.html"|href="src/herramientas/vanilla/dashboard.html"|' \
        "$file"
      ;;
  esac
done

echo "Copiando los recursos locales que referencia el bundle..."
# Se copia exactamente lo que el bundle referencia, en vez de una lista a
# mano. La lista fija dejo fuera session-stats.js, session-stats-ui.js y
# design-tokens.css, y el APK salio sin estadisticas, sin ranking y con las
# paginas legales sin estilos.
fallos=0
copiados=0
for file in "${HTML_FILES[@]}"; do
  dir="$(dirname "$file")"
  while IFS= read -r ref; do
    case "$ref" in
      http*|https*|data:*|mailto:*|tel:*|javascript:*|//*) continue ;;
    esac
    ref="${ref%%#*}"
    ref="${ref%%\?*}"
    [ -z "$ref" ] && continue
    case "$ref" in
      /*) rel="${ref#/}" ;;
      *)  rel="$(realpath -m --relative-to="$DEST" "$dir/$ref")" ;;
    esac
    [ -z "$rel" ] && continue
    if [ -e "$DEST/$rel" ]; then
      continue                       # ya esta en el bundle
    fi
    if [ -f "$ROOT/$rel" ]; then
      mkdir -p "$DEST/$(dirname "$rel")"
      cp "$ROOT/$rel" "$DEST/$rel"
      copiados=$((copiados + 1))
    else
      echo "  FALLO: ${file#$DEST/} -> $ref (no existe en la fuente)" >&2
      fallos=$((fallos + 1))
    fi
  done < <(grep -oE '(src|href)="[^"]+"' "$file" | sed -E 's/^(src|href)="//; s/"$//' || true)
done

if [ "$fallos" -gt 0 ]; then
  echo "ERROR: $fallos referencias rotas en el bundle. Aborta." >&2
  exit 1
fi
echo "  $copiados recursos copiados desde la fuente."

echo "Sync completado. ${#HTML_FILES[@]} HTML procesados."
