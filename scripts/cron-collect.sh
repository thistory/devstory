#!/bin/bash
# DevStory Daily Collector
# Triggered by: claude-devstory.timer (daily 18:30 UTC = 03:30 KST)
# Flow: pre-fetch → Claude collect → Python merge → pre-fetch articles → Claude enrich → bash deploy
set -uo pipefail

export HOME="/home/openclaw"
export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Seoul"

DEVSTORY_DIR="$HOME/devstory"
LOG_DIR="$DEVSTORY_DIR/logs"
TODAY=$(date +%Y-%m-%d)
TODAY_PATH=$(date +%Y/%m/%d)
LOG_FILE="${LOG_DIR}/collect-${TODAY}.log"

mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S KST')] $1" | tee -a "$LOG_FILE"; }

# Log rotation: keep last 14 days
find "$LOG_DIR" -name "collect-*.log" -mtime +14 -delete 2>/dev/null

log "========================================="
log "DevStory Daily Collection — $TODAY"
log "========================================="

cd "$DEVSTORY_DIR"

# Check if already collected today
if [ -f "$DEVSTORY_DIR/data/${TODAY_PATH}/raw.json" ]; then
  EXISTING=$(python3 -c "import json; print(len(json.load(open('$DEVSTORY_DIR/data/${TODAY_PATH}/raw.json')).get('items',[])))" 2>/dev/null || echo "0")
  if [ "$EXISTING" -gt 1 ]; then
    log "Today's data already exists ($EXISTING items). Running deploy only."
    "$DEVSTORY_DIR/scripts/post-process.sh" 2>&1 | tee -a "$LOG_FILE"
    exit 0
  fi
  log "Existing data has only $EXISTING items. Re-collecting."
fi

# Step 1: Pre-fetch all source feeds/pages (~5 sec)
log "[Step 1/6] Pre-fetching sources..."
"$DEVSTORY_DIR/scripts/fetch-sources.sh" 2>&1 | tee -a "$LOG_FILE"
log "[Step 1/6] Done."

# Step 2: Collect via Claude haiku (agents save to tmp/collect/*.json)
log "[Step 2/6] Collecting news (haiku)..."
claude --dangerously-skip-permissions --model haiku -p \
  "Read skills/collect-news.md and follow its instructions exactly. Today is ${TODAY}." \
  --allowedTools "Bash,Write,Read,Glob,Grep,Agent" \
  --max-turns 40 \
  2>&1 | tee -a "$LOG_FILE"
log "[Step 2/6] Done."

# Step 3: Merge, dedup, score, rank via Python → raw.json
log "[Step 3/6] Merging and scoring (Python)..."
python3 "$DEVSTORY_DIR/scripts/merge-results.py" 2>&1 | tee -a "$LOG_FILE"
log "[Step 3/6] Done."

# Verify raw.json
TODAY_RAW="$DEVSTORY_DIR/data/${TODAY_PATH}/raw.json"
if [ ! -f "$TODAY_RAW" ]; then
  log "FATAL: raw.json not created. Aborting."
  exit 1
fi
ITEM_COUNT=$(python3 -c "import json; print(len(json.load(open('$TODAY_RAW')).get('items',[])))" 2>/dev/null || echo "0")
log "raw.json: $ITEM_COUNT items."
if [ "$ITEM_COUNT" -lt 5 ]; then
  log "WARNING: Very few items ($ITEM_COUNT). Check agent results in tmp/collect/."
fi

# Step 4: Pre-fetch article URLs for enrichment (~10 sec)
log "[Step 4/6] Pre-fetching article URLs..."
"$DEVSTORY_DIR/scripts/fetch-enrichment.sh" 2>&1 | tee -a "$LOG_FILE"
log "[Step 4/6] Done."

# Step 5: Enrich with translations (Claude haiku)
log "[Step 5/6] Enriching news (haiku)..."
claude --dangerously-skip-permissions --model haiku -p \
  "Read skills/enrich-news.md and follow its instructions. Today is ${TODAY}. Article content is pre-fetched in tmp/enrichment/{id}.html — use Read tool instead of WebFetch. If a file doesn't exist, set detail_ko and detail_en to empty string." \
  --allowedTools "Bash,Write,Read,Glob,Grep,Agent" \
  --max-turns 30 \
  2>&1 | tee -a "$LOG_FILE"
log "[Step 5/6] Done."

# Step 6: Post-process + deploy
log "[Step 6/6] Post-processing and deploying..."
"$DEVSTORY_DIR/scripts/post-process.sh" 2>&1 | tee -a "$LOG_FILE"
log "[Step 6/6] Done."

log "========================================="
log "DevStory Daily Collection — COMPLETE"
log "========================================="
