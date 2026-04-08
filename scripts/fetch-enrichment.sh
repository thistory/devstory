#!/bin/bash
# Pre-fetch article URLs from raw.json for enrichment
export TZ="Asia/Seoul"
# Saves to tmp/enrichment/{id}.html
set -euo pipefail

export HOME="/home/openclaw"
DEVSTORY_DIR="$HOME/devstory"
TODAY_DIR="$DEVSTORY_DIR/data/$(date +%Y/%m/%d)"
RAW_JSON="$TODAY_DIR/raw.json"
OUT_DIR="$DEVSTORY_DIR/tmp/enrichment"
UA="Mozilla/5.0 (compatible; DevStory/1.0)"
TIMEOUT=15

if [ ! -f "$RAW_JSON" ]; then
  echo "ERROR: $RAW_JSON not found"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "[$(date)] Pre-fetching article URLs for enrichment..."

# Extract id and url pairs from raw.json
python3 -c "
import json
data = json.load(open('$RAW_JSON'))
for item in data.get('items', []):
    print(item['id'] + '\t' + item['url'])
" | while IFS=$'\t' read -r id url; do
  (
    if curl -sS -f -L --max-time $TIMEOUT -A "$UA" -o "$OUT_DIR/${id}.html" "$url" 2>/dev/null; then
      # Truncate large files to ~50KB to save tokens
      if [ "$(stat -c%s "$OUT_DIR/${id}.html" 2>/dev/null || stat -f%z "$OUT_DIR/${id}.html" 2>/dev/null)" -gt 51200 ]; then
        head -c 51200 "$OUT_DIR/${id}.html" > "$OUT_DIR/${id}.html.tmp"
        mv "$OUT_DIR/${id}.html.tmp" "$OUT_DIR/${id}.html"
      fi
    else
      rm -f "$OUT_DIR/${id}.html"
    fi
  ) &
done

wait

TOTAL=$(ls "$OUT_DIR"/*.html 2>/dev/null | wc -l)
echo "[$(date)] Pre-fetch complete: $TOTAL article files in $OUT_DIR"
