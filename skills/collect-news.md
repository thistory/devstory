---
name: collect-news
description: 최신 개발/AI 뉴스를 수집하는 오케스트레이터 스킬. 5개 카테고리별 에이전트를 병렬 디스패치하여 데이터를 수집하고, 품질 필터링 후 JSON + 마크다운으로 저장한다.
---

You are the DevStory news collection orchestrator. Follow these steps exactly.

## Step 1: Read Configuration

Read `config/sources.json` to load source definitions.

## Step 2: Check for Existing Data

Determine today's date. Check if `data/YYYY/MM/DD/raw.json` already exists.
- If it exists and already has items with non-empty `detail_ko`, skip collection entirely and report "Already collected today."
- If it exists but has no enrichment, proceed from Step 9.
- If it doesn't exist, proceed.

## Step 3: Dispatch 5 Parallel Agents

Launch ALL 5 agents in a SINGLE message using the Agent tool (this enables parallel execution):

1. **news-blogs agent**: Read `skills/agents/news-blogs.md` and follow its instructions to collect news/blog data. Return result as JSON.
2. **ai-research agent**: Read `skills/agents/ai-research.md` and follow its instructions to collect AI research data. Return result as JSON.
3. **github-oss agent**: Read `skills/agents/github-oss.md` and follow its instructions to collect GitHub/OSS data. Return result as JSON.
4. **community agent**: Read `skills/agents/community.md` and follow its instructions to collect community discussion data. Return result as JSON.
5. **eng-blogs agent**: Read `skills/agents/eng-blogs.md` and follow its instructions to collect engineering blog data. Return result as JSON.

Each agent prompt MUST include: "Read skills/agents/{name}.md and follow its instructions exactly. Return your result as raw JSON."

**Note:** Agent prompts have source URLs hardcoded for reliability (LLM prompts cannot dynamically read JSON configs). When adding a new source, update BOTH `config/sources.json` and the corresponding agent prompt file.

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

## Step 9: Enrich with Translations

After saving raw.json, enrich items with detailed content:

1. Split the saved items into 3 batches (10 items each)
2. Dispatch 3 parallel agents — each receives a batch and for each item:
   - Use WebFetch to fetch the original URL
   - Generate `detail_ko`: Korean summary (100-200 words, 2-3 paragraphs, concise)
   - Generate `detail_en`: English summary (100-200 words, 2-3 paragraphs, concise)
   - If WebFetch fails, set both to empty string "" (skip enrichment for that item)
   - Return JSON array: [{ "id": "...", "detail_ko": "...", "detail_en": "..." }]
3. Merge detail_ko and detail_en into each item in raw.json
4. Overwrite the same raw.json with enriched data

Content rules for detail_ko / detail_en:
- Articles/blog posts: key points only
- GitHub repos: what it does, why notable
- Discussions: main arguments
- Papers: research question, findings

## Step 10: Report to User

Print a brief summary:
- Total items collected / filtered / saved / enriched
- Any source errors
- Path to saved files
- Top 5 items as a preview
