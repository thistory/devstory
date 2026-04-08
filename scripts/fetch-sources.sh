#!/bin/bash
# Pre-fetch all news sources in parallel using curl
export TZ="Asia/Seoul"
# Saves to tmp/sources/{source_name}.{xml|json|html}
set -euo pipefail

export HOME="/home/openclaw"
DEVSTORY_DIR="$HOME/devstory"
OUT_DIR="$DEVSTORY_DIR/tmp/sources"
UA="Mozilla/5.0 (compatible; DevStory/1.0)"
TIMEOUT=15

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

fetch() {
  local name="$1" url="$2" ext="$3"
  if curl -sS -f -L --max-time $TIMEOUT -A "$UA" -o "$OUT_DIR/${name}.${ext}" "$url" 2>/dev/null; then
    echo "  OK: $name"
  else
    echo "  FAIL: $name ($url)"
    rm -f "$OUT_DIR/${name}.${ext}"
  fi
}

echo "[$(date)] Pre-fetching sources..."

# --- Launch all fetches in parallel ---

# news_blogs
fetch hacker_news_top "https://hacker-news.firebaseio.com/v0/topstories.json" json &
fetch techcrunch "https://techcrunch.com/feed/" xml &
fetch devto "https://dev.to/feed" xml &

# ai_research
fetch arxiv_ai "https://rss.arxiv.org/rss/cs.AI" xml &
fetch arxiv_lg "https://rss.arxiv.org/rss/cs.LG" xml &
fetch arxiv_cl "https://rss.arxiv.org/rss/cs.CL" xml &
fetch anthropic_news "https://www.anthropic.com/news" html &
fetch huggingface_blog "https://huggingface.co/blog" html &
fetch papers_with_code "https://paperswithcode.com" html &

# github_oss
fetch github_trending "https://github.com/trending" html &
fetch github_trending_python "https://github.com/trending/python" html &
fetch github_trending_typescript "https://github.com/trending/typescript" html &
fetch changelog "https://changelog.com/feed" xml &

# community
fetch lobsters "https://lobste.rs/rss" xml &
fetch tldr "https://tldr.tech" html &

# eng_blogs
fetch stripe_blog "https://stripe.com/blog/feed.rss" xml &
fetch vercel_blog "https://vercel.com/atom" xml &
fetch cloudflare_blog "https://blog.cloudflare.com/rss/" xml &
fetch meta_eng "https://engineering.fb.com/feed/" xml &

wait

# --- Phase 2: Hacker News individual items ---
if [ -f "$OUT_DIR/hacker_news_top.json" ]; then
  echo "  Fetching HN top 20 items..."
  mkdir -p "$OUT_DIR/hn_items"
  # Get first 20 IDs
  IDS=$(python3 -c "import json; ids=json.load(open('$OUT_DIR/hacker_news_top.json'))[:20]; print(' '.join(str(i) for i in ids))" 2>/dev/null || echo "")
  if [ -n "$IDS" ]; then
    for id in $IDS; do
      curl -sS -f --max-time 5 -o "$OUT_DIR/hn_items/${id}.json" \
        "https://hacker-news.firebaseio.com/v0/item/${id}.json" 2>/dev/null &
    done
    wait
    # Merge into single file
    python3 -c "
import json, glob, os
items = []
for f in sorted(glob.glob('$OUT_DIR/hn_items/*.json')):
    try:
        items.append(json.load(open(f)))
    except: pass
json.dump(items, open('$OUT_DIR/hacker_news_items.json','w'))
print(f'  HN: {len(items)} items fetched')
" 2>/dev/null || echo "  HN item merge failed"
  fi
fi

# Report
TOTAL=$(ls "$OUT_DIR"/*.{xml,json,html} 2>/dev/null | wc -l)
echo "[$(date)] Pre-fetch complete: $TOTAL source files in $OUT_DIR"
