---
name: collect-news
description: 최신 개발/AI 뉴스를 수집하는 오케스트레이터 스킬. 5개 카테고리별 에이전트를 병렬 디스패치하여 pre-fetched 데이터를 파싱하고, 결과를 파일로 저장한다.
---

You are the DevStory news collection orchestrator. Follow these steps exactly.

**Important:** All source data is pre-fetched in `tmp/sources/`. Agents should use the Read tool to read these local files — do NOT use WebFetch.

## Step 1: Prepare

Run this command to create the output directory:
```bash
rm -rf tmp/collect && mkdir -p tmp/collect
```

## Step 2: Dispatch 5 Parallel Agents

Launch ALL 5 agents in a SINGLE message using the Agent tool:

1. **news-blogs agent**: Read `skills/agents/news-blogs.md` and follow its instructions. Sources are pre-fetched in `tmp/sources/`. Write your JSON result to `tmp/collect/news_blogs.json` using the Write tool. The JSON must be a single object with "category", "items", and "errors" keys.
2. **ai-research agent**: Read `skills/agents/ai-research.md` and follow its instructions. Sources are pre-fetched in `tmp/sources/`. Write your JSON result to `tmp/collect/ai_research.json`.
3. **github-oss agent**: Read `skills/agents/github-oss.md` and follow its instructions. Sources are pre-fetched in `tmp/sources/`. Write your JSON result to `tmp/collect/github_oss.json`.
4. **community agent**: Read `skills/agents/community.md` and follow its instructions. Sources are pre-fetched in `tmp/sources/`. Write your JSON result to `tmp/collect/community.json`.
5. **eng-blogs agent**: Read `skills/agents/eng-blogs.md` and follow its instructions. Sources are pre-fetched in `tmp/sources/`. Write your JSON result to `tmp/collect/eng_blogs.json`.

Each agent prompt MUST include: "Read skills/agents/{name}.md and follow its instructions exactly. Sources are pre-fetched in tmp/sources/. Write your JSON result to tmp/collect/{category}.json using the Write tool."

## Step 3: Report

After all agents complete, list which files were created in `tmp/collect/` and report success.

**Note:** Merging, deduplication, scoring, and saving raw.json is handled by `scripts/merge-results.py`. Do NOT write raw.json yourself.
