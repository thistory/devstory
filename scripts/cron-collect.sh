#!/bin/bash
# DevStory Collector — cron wrapper for Claude Code on server
# Flow: bash pre-fetch → Claude haiku (collect) → bash pre-fetch articles → Claude haiku (enrich) → bash post-process

export HOME="/home/openclaw"
export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"

DEVSTORY_DIR="$HOME/devstory"
LOG_DIR="$DEVSTORY_DIR/logs"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="${LOG_DIR}/collect-${TODAY}.log"

mkdir -p "$LOG_DIR"

log() { echo "[$(date)] $1" | tee -a "$LOG_FILE"; }

log "Starting DevStory collection..."
cd "$DEVSTORY_DIR"

# Step 1: Pre-fetch all source feeds/pages (bash, ~5 sec)
log "Step 1: Pre-fetching sources..."
"$DEVSTORY_DIR/scripts/fetch-sources.sh" 2>&1 | tee -a "$LOG_FILE"

# Step 2: Collect + score + save raw.json (Claude haiku, reads local files)
log "Step 2: Collecting and scoring news (haiku)..."
claude --dangerously-skip-permissions --model haiku -p \
  "Read skills/collect-news.md and follow Steps 1-8 only (stop before Step 9). Today is ${TODAY}. Sources are pre-fetched in tmp/sources/." \
  --allowedTools "Bash,Write,Read,Glob,Grep,Agent" \
  --max-turns 40 \
  2>&1 | tee -a "$LOG_FILE"

# Step 3: Pre-fetch article URLs for enrichment (bash, ~10 sec)
TODAY_RAW="$DEVSTORY_DIR/data/$(date +%Y/%m/%d)/raw.json"
if [ -f "$TODAY_RAW" ]; then
  log "Step 3: Pre-fetching article URLs for enrichment..."
  "$DEVSTORY_DIR/scripts/fetch-enrichment.sh" 2>&1 | tee -a "$LOG_FILE"

  # Step 4: Enrich with translations (Claude haiku, reads local files)
  log "Step 4: Enriching news (haiku)..."
  claude --dangerously-skip-permissions --model haiku -p \
    "Read skills/enrich-news.md and follow its instructions. Today is ${TODAY}. Article content is pre-fetched in tmp/enrichment/{id}.html — use Read tool to read these files instead of WebFetch. If a file doesn't exist for an item, set detail_ko and detail_en to empty string." \
    --allowedTools "Bash,Write,Read,Glob,Grep,Agent" \
    --max-turns 30 \
    2>&1 | tee -a "$LOG_FILE"

  # Step 5: Post-process + deploy (bash)
  log "Step 5: Post-processing and deploying..."
  "$DEVSTORY_DIR/scripts/post-process.sh" 2>&1 | tee -a "$LOG_FILE"
else
  log "ERROR: No raw.json found for today ($TODAY_RAW). Skipping enrichment + deploy."
  exit 1
fi

log "Collection and deploy complete."
