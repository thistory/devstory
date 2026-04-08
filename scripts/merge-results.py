#!/usr/bin/env python3
"""Merge agent results, deduplicate, score, rank, and save raw.json + summary.md"""
import json
import re
import os
import glob
import hashlib
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher

KST = timezone(timedelta(hours=9))
DEVSTORY_DIR = os.environ.get("HOME", "/home/openclaw") + "/devstory"
COLLECT_DIR = f"{DEVSTORY_DIR}/tmp/collect"
TODAY = datetime.now(KST).strftime("%Y-%m-%d")
TODAY_PATH = datetime.now(KST).strftime("%Y/%m/%d")
DATA_DIR = f"{DEVSTORY_DIR}/data/{TODAY_PATH}"

# Weight config
SOURCE_RELIABILITY = {
    "hacker_news": 90, "arxiv_ai": 85, "arxiv_lg": 85, "arxiv_cl": 85,
    "anthropic_news": 80, "papers_with_code": 75, "huggingface_blog": 75,
    "github_trending": 70, "github_trending_python": 70, "github_trending_typescript": 70,
    "stripe_blog": 70, "cloudflare_blog": 70, "meta_eng": 70, "vercel_blog": 65,
    "techcrunch": 65, "lobsters": 60, "changelog": 60, "tldr": 55, "devto": 50,
}

def load_agent_results():
    """Load all JSON files from tmp/collect/"""
    all_items = []
    errors = []
    succeeded = []
    failed = []
    
    for f in sorted(glob.glob(f"{COLLECT_DIR}/*.json")):
        try:
            raw = open(f).read().strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-z]*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw.strip())
            data = json.loads(raw)
            # Handle case where data is a string (double-encoded JSON)
            if isinstance(data, str):
                data = json.loads(data)
            if not isinstance(data, dict):
                print(f"  WARNING: {f} is not a JSON object, skipping")
                failed.append(os.path.basename(f))
                continue
            items = data.get("items", [])
            # Validate items are dicts
            items = [i for i in items if isinstance(i, dict)]
            errs = data.get("errors", [])
            if isinstance(errs, list):
                errs = [e for e in errs if isinstance(e, dict)]
            else:
                errs = []
            category = data.get("category", os.path.basename(f).replace(".json", ""))
            all_items.extend(items)
            errors.extend(errs)
            if items:
                succeeded.append(category)
            for e in errs:
                failed.append(e.get("source", "unknown"))
            print(f"  {category}: {len(items)} items, {len(errs)} errors")
        except Exception as e:
            print(f"  ERROR loading {f}: {e}")
            failed.append(os.path.basename(f))
    
    return all_items, errors, succeeded, failed

def deduplicate(items):
    """Remove duplicates by URL and similar titles"""
    seen_urls = {}
    result = []
    
    for item in items:
        url = item.get("url", "")
        if url in seen_urls:
            # Keep higher score version
            if item.get("score", 0) > seen_urls[url].get("score", 0):
                result = [i for i in result if i.get("url") != url]
                result.append(item)
                seen_urls[url] = item
            continue
        
        # Check title similarity
        title = item.get("title", "").lower()
        duplicate = False
        for existing in result:
            existing_title = existing.get("title", "").lower()
            if SequenceMatcher(None, title, existing_title).ratio() > 0.8:
                if item.get("score", 0) > existing.get("score", 0):
                    result.remove(existing)
                    result.append(item)
                    seen_urls[url] = item
                duplicate = True
                break
        
        if not duplicate:
            result.append(item)
            seen_urls[url] = item
    
    return result

def score_item(item):
    """Calculate quality score (0-100)"""
    source = item.get("source", "")
    reliability = SOURCE_RELIABILITY.get(source, 40) / 100  # 0-1
    
    # Community signal (normalize)
    raw_score = item.get("score", 0)
    if raw_score > 500:
        community = 1.0
    elif raw_score > 100:
        community = 0.7
    elif raw_score > 10:
        community = 0.4
    else:
        community = 0.1
    
    # Recency
    pub = item.get("published_at", "")
    try:
        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        hours_ago = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
        recency = max(0, 1.0 - hours_ago / 24)
    except:
        recency = 0.5
    
    score = reliability * 40 + community * 35 + recency * 25
    return round(score, 1)

def diversity_rebalance(items, max_per_category=12, total=30):
    """No single category may exceed 40% of final items"""
    by_cat = {}
    for item in items:
        cat = item.get("category", "other")
        by_cat.setdefault(cat, []).append(item)
    
    result = []
    overflow = []
    
    for cat, cat_items in by_cat.items():
        cat_items.sort(key=lambda x: x.get("score", 0), reverse=True)
        result.extend(cat_items[:max_per_category])
        overflow.extend(cat_items[max_per_category:])
    
    result.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    if len(result) < total:
        overflow.sort(key=lambda x: x.get("score", 0), reverse=True)
        result.extend(overflow[:total - len(result)])
    
    return result[:total]

def generate_summary(items):
    """Generate summary.md"""
    now = datetime.now(KST)
    total = len(items)
    
    lines = [
        f"# DevStory Daily — {TODAY}\n",
        f"\n> 수집 시각: {now.strftime('%H:%M')} KST | 최종 선별: {total}개\n",
        "\n## 🔥 Top 10\n",
    ]
    
    for i, item in enumerate(items[:10]):
        title = item.get("title_ko", item.get("title", ""))
        url = item.get("url", "")
        summary = item.get("summary_ko", "")
        source = item.get("source", "")
        score = item.get("score", 0)
        lines.append(f"{i+1}. **[{title}]({url})** — {summary} `[{source}]` ⭐ {score}\n")
    
    categories = {
        "news_blogs": "\n## 📰 뉴스 & 블로그\n",
        "ai_research": "\n## 🤖 AI & ML 리서치\n",
        "github_oss": "\n## 🐙 GitHub & 오픈소스\n",
        "community": "\n## 💬 커뮤니티 토론\n",
        "eng_blogs": "\n## 🏗️ 엔지니어링 블로그\n",
    }
    
    for cat, header in categories.items():
        cat_items = [i for i in items if i.get("category") == cat]
        if cat_items:
            lines.append(header)
            for item in cat_items:
                title = item.get("title_ko", item.get("title", ""))
                url = item.get("url", "")
                lines.append(f"- [{title}]({url})\n")
    
    lines.append("\n---\n\n*Collected by DevStory Collector*\n")
    return "".join(lines)

def main():
    print(f"[merge-results] Processing {TODAY}...")
    
    # Load
    items, errors, succeeded, failed = load_agent_results()
    total_collected = len(items)
    print(f"  Total collected: {total_collected}")
    
    if total_collected == 0:
        print("  ERROR: No items collected!")
        return False
    
    # Deduplicate
    items = deduplicate(items)
    after_dedup = len(items)
    print(f"  After dedup: {after_dedup}")
    
    # Score
    for item in items:
        item["score"] = score_item(item)
    items.sort(key=lambda x: x["score"], reverse=True)
    
    # Diversity rebalance and select top 30
    items = diversity_rebalance(items)
    print(f"  After filter: {len(items)}")
    
    # Save raw.json
    os.makedirs(DATA_DIR, exist_ok=True)
    raw_data = {
        "date": TODAY,
        "collected_at": datetime.now(KST).isoformat(),
        "items": items,
        "meta": {
            "total_collected": total_collected,
            "after_dedup": after_dedup,
            "after_filter": len(items),
            "sources_succeeded": succeeded,
            "sources_failed": failed,
        }
    }
    with open(f"{DATA_DIR}/raw.json", "w") as f:
        json.dump(raw_data, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {DATA_DIR}/raw.json")
    
    # Save latest.json
    with open(f"{DEVSTORY_DIR}/data/latest.json", "w") as f:
        json.dump({"path": f"data/{TODAY_PATH}/raw.json"}, f)
    
    # Save summary.md
    summary = generate_summary(items)
    with open(f"{DATA_DIR}/summary.md", "w") as f:
        f.write(summary)
    print(f"  Saved: {DATA_DIR}/summary.md")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
