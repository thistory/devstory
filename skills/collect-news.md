---
name: collect-news
description: 최신 개발/AI 뉴스를 수집하는 오케스트레이터 스킬. 5개 카테고리별 에이전트를 병렬 디스패치하여 pre-fetched 데이터를 파싱하고, 품질 필터링 후 JSON + 마크다운으로 저장한다.
---

You are the DevStory news collection orchestrator. Follow these steps exactly.

**Important:** All source data is pre-fetched by `scripts/fetch-sources.sh` and saved in `tmp/sources/`. Agents should use the Read tool to read these local files — do NOT use WebFetch for source collection.

## Step 1: Read Configuration

Read `config/sources.json` to load source definitions.

## Step 2: Check for Existing Data

Determine today's date. Check if `data/YYYY/MM/DD/raw.json` already exists.
- If it exists, skip collection entirely and report "Already collected today."
- If it doesn't exist, proceed.

## Step 3: Dispatch 5 Parallel Agents

Launch ALL 5 agents in a SINGLE message using the Agent tool (this enables parallel execution):

1. **news-blogs agent**: Read `skills/agents/news-blogs.md` and follow its instructions to collect news/blog data from pre-fetched files in `tmp/sources/`. Return result as JSON.
2. **ai-research agent**: Read `skills/agents/ai-research.md` and follow its instructions to collect AI research data from pre-fetched files in `tmp/sources/`. Return result as JSON.
3. **github-oss agent**: Read `skills/agents/github-oss.md` and follow its instructions to collect GitHub/OSS data from pre-fetched files in `tmp/sources/`. Return result as JSON.
4. **community agent**: Read `skills/agents/community.md` and follow its instructions to collect community discussion data from pre-fetched files in `tmp/sources/`. Return result as JSON.
5. **eng-blogs agent**: Read `skills/agents/eng-blogs.md` and follow its instructions to collect engineering blog data from pre-fetched files in `tmp/sources/`. Return result as JSON.

Each agent prompt MUST include: "Read skills/agents/{name}.md and follow its instructions exactly. Sources are pre-fetched in tmp/sources/. Return your result as raw JSON."

## Step 4: Merge Results

Combine all items from the 5 agent results into a single array. Collect all errors.

## Step 5: Deduplicate

Remove duplicate items:
- Primary: exact URL match
- Secondary: titles with >80% similarity (same article posted on multiple sources)
Keep the version with the higher score.

## Step 6: Quality Score & Rank

Assign a score (0-100) to each item based on:
- **Source reliability** (weight 40%): HN, arXiv, major eng blogs = high; dev.to = medium
- **Community signal** (weight 35%): upvotes, stars, comments (normalize across sources)
- **Recency** (weight 25%): prefer items from last 12 hours over 12-24 hours

Sort by score descending. Then apply **category diversity rebalancing**: no single category may exceed 40% of final items (max 12 of 30). If a category exceeds the cap, drop its lowest-scored items and backfill from underrepresented categories.

Select top 30 items.

## Step 7: Save JSON

Create directory `data/YYYY/MM/DD/` and write `raw.json`.
Also write `data/latest.json` pointing to the new file: `{ "path": "data/YYYY/MM/DD/raw.json" }`

Format for `raw.json`:

{
  "date": "YYYY-MM-DD",
  "collected_at": "ISO 8601 timestamp",
  "items": [ top 30 items sorted by score ],
  "meta": {
    "total_collected": N,
    "after_dedup": N,
    "after_filter": 30,
    "sources_succeeded": [...],
    "sources_failed": [...]
  }
}

## Step 8: Generate Summary

Write `data/YYYY/MM/DD/summary.md` in this format:

# DevStory Daily — YYYY-MM-DD

> 수집 시각: HH:MM KST | 총 수집: N개 | 최종 선별: 30개

## 🔥 Top 10

1. **[title_ko](url)** — summary_ko `[source]` ⭐ score
2. ...

## 📰 뉴스 & 블로그
- items with category "news_blogs"

## 🤖 AI & ML 리서치
- items with category "ai_research"

## 🐙 GitHub & 오픈소스
- items with category "github_oss"

## 💬 커뮤니티 토론
- items with category "community"

## 🏗️ 엔지니어링 블로그
- items with category "eng_blogs"

---

*Collected by DevStory Collector*

## Step 9: Report

Print a brief summary:
- Total items collected / filtered / saved
- Any source errors
- Path to saved files
- Top 5 items as a preview

**Note:** Enrichment (detail_ko/detail_en) is handled separately by `scripts/cron-collect.sh` Step 4.
