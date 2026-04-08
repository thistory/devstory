#!/bin/bash
# Post-process: merge today's raw.json into processed_data.json + deploy
set -euo pipefail

export HOME="/home/openclaw"
DEVSTORY_DIR="$HOME/devstory"
TODAY_DIR="$DEVSTORY_DIR/data/$(date +%Y/%m/%d)"
RAW_JSON="$TODAY_DIR/raw.json"
PROCESSED="$DEVSTORY_DIR/processed_data.json"
SSH_KEY="$HOME/.ssh/devstory_deploy"

# Check raw.json exists
if [ ! -f "$RAW_JSON" ]; then
  echo "ERROR: $RAW_JSON not found. Collection may have failed."
  exit 1
fi

echo "[$(date)] Merging today's data into processed_data.json..."

# Initialize processed_data.json if missing
if [ ! -f "$PROCESSED" ]; then
  echo '{"date":"","items":[]}' > "$PROCESSED"
fi

# Merge using jq: append today's items, map score->final_score, drop detail fields, update date
TODAY_DATE=$(date +%Y-%m-%d)
jq --arg date "$TODAY_DATE" --slurpfile new "$RAW_JSON" '
  .date = $date |
  .items += [
    $new[0].items[] |
    {
      id, title, title_ko, summary_ko, url, source, category, tags,
      final_score: .score,
      published_at
    }
  ]
' "$PROCESSED" > "${PROCESSED}.tmp" && mv "${PROCESSED}.tmp" "$PROCESSED"

TOTAL=$(jq '.items | length' "$PROCESSED")
echo "[$(date)] processed_data.json updated. Total items: $TOTAL"

# Deploy via rsync
echo "[$(date)] Deploying to devstory server..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$DEVSTORY_DIR/index.html" \
  "$DEVSTORY_DIR/processed_data.json" \
  "$DEVSTORY_DIR/data/" \
  devstory:/home/opc/devstory/

echo "[$(date)] Deploy complete."
