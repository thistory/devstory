#!/bin/bash
# Post-process: merge today's raw.json into processed_data.json + deploy
set -euo pipefail

export HOME="/home/openclaw"
export TZ="Asia/Seoul"

DEVSTORY_DIR="$HOME/devstory"
TODAY_DIR="$DEVSTORY_DIR/data/$(date +%Y/%m/%d)"
RAW_JSON="$TODAY_DIR/raw.json"
PROCESSED="$DEVSTORY_DIR/processed_data.json"
SSH_KEY="$HOME/.ssh/devstory_deploy"
TODAY_DATE=$(date +%Y-%m-%d)

# Check raw.json exists
if [ ! -f "$RAW_JSON" ]; then
  echo "ERROR: $RAW_JSON not found. Collection may have failed."
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] Merging today's data into processed_data.json..."

# Initialize processed_data.json if missing
if [ ! -f "$PROCESSED" ]; then
  echo '{"date":"","items":[]}' > "$PROCESSED"
fi

# Check if today's data is already merged (idempotency by item ID)
FIRST_ID=$(python3 -c "import json; items=json.load(open('$RAW_JSON')).get('items',[]); print(items[0]['id'] if items else '')" 2>/dev/null || echo "")
if [ -n "$FIRST_ID" ]; then
  ALREADY=$(python3 -c "import json; items=json.load(open('$PROCESSED')).get('items',[]); print('yes' if any(i['id']=='$FIRST_ID' for i in items) else 'no')" 2>/dev/null || echo "no")
  if [ "$ALREADY" = "yes" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] Today's data already merged. Skipping."
  else
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
    echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] processed_data.json updated. Total items: $TOTAL"
  fi
fi

# Deploy via rsync
echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] Deploying to devstory server..."
rsync -avz \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$DEVSTORY_DIR/index.html" \
  "$DEVSTORY_DIR/processed_data.json" \
  "$DEVSTORY_DIR/data" \
  devstory:/home/opc/devstory/

echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] Deploy complete."
