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
    "github_trending_go": 70, "github_trending_rust": 70,
    "stripe_blog": 70, "cloudflare_blog": 70, "meta_eng": 70, "vercel_blog": 65,
    # FAANG / scale-up engineering blogs
    "netflix_tech": 85, "slack_eng": 75, "spotify_eng": 75, "linkedin_eng": 75,
    "airbnb_eng": 75, "pinterest_eng": 70, "discord_eng": 70,
    "uber_eng": 80, "shopify_eng": 75, "atlassian_eng": 65,
    "bytebytego": 80, "github_eng": 80, "aws_arch": 75, "high_scalability": 70,
    # 권위자 / 뉴스레터
    "pragmatic_engineer": 90, "martin_fowler": 90, "marc_brooker": 90,
    "werner_vogels": 85, "stackoverflow_blog": 75, "infoq_arch": 75,
    "hashicorp_blog": 70, "morning_paper": 80, "dan_slimmon": 75,
    # community
    "hn_best": 90, "reddit_programming": 70, "reddit_experienced_devs": 80,
    "techcrunch": 65, "lobsters": 60, "changelog": 60, "tldr": 55, "devto": 50,
}

# Backend-relevance heuristic (mirrors frontend backendScore in index.html).
# Used as a fallback when an agent didn't supply backend_score.
BACKEND_TAGS = {
    'backend':3,'server':3,'distributed':3,'distributed-systems':4,'microservices':3,'microservice':3,
    'database':3,'db':3,'sql':2,'nosql':2,'postgres':3,'postgresql':3,'mysql':3,'sqlite':2,
    'redis':3,'mongodb':3,'cassandra':3,'dynamodb':3,'cockroachdb':3,'spanner':3,
    'cache':2,'caching':2,'queue':2,'kafka':3,'rabbitmq':3,'nats':3,'pubsub':2,
    'scale':2,'scaling':3,'performance':2,'latency':3,'throughput':2,'concurrency':3,
    'infrastructure':3,'devops':2,'platform':2,'kubernetes':3,'k8s':3,'docker':2,'container':2,
    'cloud':1,'aws':2,'gcp':2,'azure':2,'terraform':2,'serverless':2,'lambda':2,'edge':2,
    'api':2,'rest':2,'grpc':3,'graphql':2,'http':2,'http2':2,'http3':2,'tcp':2,'networking':3,
    'system-design':4,'architecture':3,'observability':3,'monitoring':2,'tracing':3,'logging':2,
    'reliability':3,'sre':4,'incident':2,'fault-tolerance':3,'resilience':2,
    'golang':3,'go':2,'rust':2,'java':1,'jvm':2,
    'spring':2,'fastapi':2,'django':2,'flask':1,'express':1,'nodejs':1,'node':1,
    'consistency':3,'transaction':3,'replication':3,'sharding':3,'partitioning':3,
    'load-balancer':3,'message-queue':3,'streaming':2,
    'authentication':2,'authorization':2,'oauth':2,'jwt':2,
    'compiler':2,'runtime':2,'kernel':2,'linux':2,
    'cryptography':2,'tls':2,
    'data-engineering':3,'etl':3,'data-pipeline':3,'spark':2,'flink':2,'duckdb':2,
}
BACKEND_NEG_TAGS = {
    'react':-2,'vue':-2,'svelte':-2,'angular':-2,'css':-2,'tailwind':-2,
    'frontend':-3,'ui':-2,'ux':-2,'design':-1,
    'mobile':-1,'ios':-1,'android':-1,'swift':-1,
    'transformer':-1,'attention':-1,'neural-networks':-2,'gpt':-1,'prompt':-1,'reasoning':-1,
}
BACKEND_SOURCE_BOOST = {
    'stripe_blog':5,'cloudflare_blog':5,'meta_eng':5,'netflix_tech':6,
    'slack_eng':5,'spotify_eng':4,'linkedin_eng':4,'airbnb_eng':4,
    'pinterest_eng':4,'discord_eng':4,'uber_eng':5,'shopify_eng':5,
    'atlassian_eng':3,'bytebytego':6,'github_eng':4,
    'aws_arch':6,'high_scalability':6,'vercel_blog':3,
    'pragmatic_engineer':7,'martin_fowler':7,'marc_brooker':7,
    'werner_vogels':6,'stackoverflow_blog':4,'infoq_arch':5,
    'hashicorp_blog':4,'morning_paper':5,'dan_slimmon':5,
    'hn_best':3,'reddit_experienced_devs':3,'reddit_programming':2,
    'lobsters':1,
}
BACKEND_KEYWORDS = [
    'backend','distributed','microservice','scaling','latency','throughput',
    'database','postgres','mysql','redis','kafka','queue','cache','sharding','replication',
    'kubernetes','docker','system design','architecture','observability','tracing',
    'sre ','reliab','incident','outage','postmortem',
    ' api','rest ','grpc','graphql','rpc',
    'server','serverless','consistency','transaction','eventual',
    'load balanc','message queue','pub/sub','stream',
    '백엔드','분산','마이크로서비스','데이터베이스','확장','인프라','아키텍처','지연','처리량',
    '캐시','큐','복제','샤딩','일관성','트랜잭션','관측','장애','신뢰성','파이프라인',
]

def compute_backend_score(item):
    """Backend engineering 관련성. agent가 이미 backend_score를 줬으면 그대로 사용."""
    existing = item.get("backend_score")
    if isinstance(existing, (int, float)) and existing > 0:
        return float(existing)
    score = 0
    tags = [str(t).lower() for t in (item.get("tags") or [])]
    for t in tags:
        if t in BACKEND_TAGS: score += BACKEND_TAGS[t]
        if t in BACKEND_NEG_TAGS: score += BACKEND_NEG_TAGS[t]
    text = ' '.join(str(item.get(k) or '') for k in ('title','title_ko','summary_ko','detail_ko','detail_en')).lower()
    for kw in BACKEND_KEYWORDS:
        if kw in text: score += 2
    src = item.get('source') or ''
    if src in BACKEND_SOURCE_BOOST: score += BACKEND_SOURCE_BOOST[src]
    if item.get('category') == 'ai_research': score -= 4
    if item.get('category') == 'eng_blogs': score += 2
    score += min(5, int((item.get('final_score') or 0) // 25))
    return float(score)

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

def diversity_rebalance(items, total=40):
    """카테고리별 상한. eng_blogs는 백엔드 메인 섹션 재료라 cap을 크게 잡는다."""
    cat_caps = {
        'eng_blogs': 18,  # backend hero 재료
        'news_blogs': 10,
        'github_oss': 8,
        'community': 8,
        'ai_research': 6,
    }
    default_cap = 8
    by_cat = {}
    for item in items:
        cat = item.get("category", "other")
        by_cat.setdefault(cat, []).append(item)

    result = []
    overflow = []
    for cat, cat_items in by_cat.items():
        cat_items.sort(key=lambda x: x.get("score", 0), reverse=True)
        cap = cat_caps.get(cat, default_cap)
        result.extend(cat_items[:cap])
        overflow.extend(cat_items[cap:])

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
        item["backend_score"] = compute_backend_score(item)
    items.sort(key=lambda x: x["score"], reverse=True)

    # Diversity rebalance and select top N
    items = diversity_rebalance(items)
    backend_count = sum(1 for i in items if (i.get("backend_score") or 0) >= 4)
    print(f"  After filter: {len(items)} (backend-relevant: {backend_count})")
    
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
