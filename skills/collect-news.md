---
name: collect-news
description: 최신 개발/AI 뉴스를 수집하는 오케스트레이터 스킬. 5개 카테고리별 에이전트를 병렬 디스패치하여 pre-fetched 데이터를 파싱하고, 결과를 파일로 저장한다.
---

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

---

## Alternative Pipeline (Draft — Node.js script/LLM hybrid)

> **Status:** Experimental, not currently wired into `cron-collect.sh`. Kept here as the design for a future migration. Source scripts live under `scripts/*.mjs`.
>
> 설계 요약: Script로 RSS/API fetch → LLM으로 웹 스크래핑/번역 → Script로 점수/저장 → LLM enrichment.

### 1. Check Existing Data

Determine today's date (YYYY/MM/DD). Check if `data/YYYY/MM/DD/raw.json` exists — if so, ask user to overwrite or skip.

### 2. Fetch Structured Sources (Script — 토큰 0)

```bash
node scripts/fetch-structured.mjs
```

21개 RSS/API 소스를 fetch & parse. 출력: `data/YYYY/MM/DD/fetched-structured.json`

### 3. Scrape Unstructured Sources (LLM — Agent x1)

Launch 1 agent: "Read `skills/agents/scrape-unstructured.md` and follow instructions. Return raw JSON."

9개 웹페이지 + 1 WebSearch 소스를 스크래핑.

### 4. Merge Fetched + Scraped

`fetched-structured.json`의 items와 스크래핑 결과 items를 합쳐서 `data/YYYY/MM/DD/fetched-all.json`으로 저장. 포맷: `{ "date": "YYYY-MM-DD", "items": [...], "meta": { "errors": [...] } }`

### 5. Translate & Tag (LLM — Agent x1-2)

모든 아이템의 title_ko, summary_ko, tags가 null인 것들을 번역/태깅.

- 아이템 40개 이하: Agent 1개에 전체 배치
- 아이템 40개 초과: 2개 Agent로 분할

각 Agent prompt: "아래 아이템 배열을 받아서 `skills/agents/translate-and-tag.md`의 지시를 따라 title_ko, summary_ko, tags를 생성하라. [아이템 JSON 배열]"

번역 결과를 `fetched-all.json`의 각 아이템에 id 매칭으로 병합.

### 6. Dedup, Score, Save (Script — 토큰 0)

```bash
node scripts/dedup-score-save.mjs data/YYYY/MM/DD
```

중복제거 → 점수계산 → top 30 선별 → `raw.json`, `latest.json`, `summary.md` 저장.

### 7. Pre-fetch URLs (Script — 토큰 0)

```bash
node scripts/prefetch-urls.mjs data/YYYY/MM/DD
```

30개 아이템의 원문 HTML을 미리 fetch. 출력: `prefetched-content.json`

### 8. Enrich (LLM — Agent x2-3)

`raw.json`과 `prefetched-content.json`을 읽어서 아이템을 2-3 배치로 분할. 각 Agent에게:
- 아이템 배열 + 해당 prefetched text_content 전달
- detail_ko (한국어 300-500 words, 3-5 paragraphs) 생성
- detail_en (영어 300-500 words, 3-5 paragraphs) 생성
- 콘텐츠 유형별: article→핵심 요약, repo→기능/스택/의의, discussion→논쟁/반응, paper→질문/방법/결과
- text_content가 null이면 title/summary 기반으로 생성
- 반환: `[{ "id", "detail_ko", "detail_en" }]`

결과를 `data/YYYY/MM/DD/enrichment-output.json`으로 저장.

### 9. Merge Enrichment (Script — 토큰 0)

```bash
node scripts/merge-enrichment.mjs data/YYYY/MM/DD
```

### 10. Report

Print: total collected / final 30 / enriched, source errors, file paths, top 5 preview.
