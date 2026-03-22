#!/bin/bash
# DevStory Collector — cron wrapper
# Usage: crontab -e → 0 9 * * * /Users/ree/product/thistory/devstory/scripts/cron-collect.sh

set -euo pipefail

DEVSTORY_DIR="/Users/ree/product/thistory/devstory"
LOG_DIR="${DEVSTORY_DIR}/logs"
LOG_FILE="${LOG_DIR}/collect-$(date +%Y-%m-%d_%H%M).log"

mkdir -p "$LOG_DIR"

echo "[$(date)] Starting DevStory collection..." | tee "$LOG_FILE"

cd "$DEVSTORY_DIR"
claude -p "Execute /collect-news skill. Collect today's news data." \
  --allowedTools "Bash,WebFetch,WebSearch,Write,Read,Glob,Grep,Agent" \
  2>&1 | tee -a "$LOG_FILE"

echo "[$(date)] Collection complete." | tee -a "$LOG_FILE"
