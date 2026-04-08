#!/bin/bash
# DevStory Collector — cron wrapper for Claude Code on server
# Architecture: single Claude call (haiku) for collection → bash for post-process + deploy

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

# Step 1: Collect + enrich using Claude (haiku for cost efficiency)
log "Step 1: Collecting and enriching news (haiku)..."
claude --dangerously-skip-permissions --model haiku -p \
  "Read skills/collect-news.md and follow its instructions exactly. Today is ${TODAY}." \
  --allowedTools "Bash,WebFetch,WebSearch,Write,Read,Glob,Grep,Agent" \
  --max-turns 50 \
  2>&1 | tee -a "$LOG_FILE"

COLLECT_EXIT=$?
if [ $COLLECT_EXIT -ne 0 ]; then
  log "WARNING: Collection exited with code $COLLECT_EXIT"
fi

# Step 2: Post-process + deploy (pure bash, no Claude needed)
TODAY_RAW="$DEVSTORY_DIR/data/$(date +%Y/%m/%d)/raw.json"
if [ -f "$TODAY_RAW" ]; then
  log "Step 2: Post-processing and deploying (bash)..."
  "$DEVSTORY_DIR/scripts/post-process.sh" 2>&1 | tee -a "$LOG_FILE"
else
  log "ERROR: No raw.json found for today ($TODAY_RAW). Skipping post-process + deploy."
  exit 1
fi

log "Collection and deploy complete."
