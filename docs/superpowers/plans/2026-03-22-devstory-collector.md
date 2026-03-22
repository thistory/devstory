# DevStory Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code 스킬/에이전트 시스템을 만들어 최신 개발/AI 뉴스를 병렬 수집하고 JSON + 마크다운으로 저장한다.

**Architecture:** 오케스트레이터 스킬(`/collect-news`)이 5개 카테고리별 서브에이전트를 병렬 디스패치. 각 에이전트는 WebFetch로 소스에서 데이터를 수집하고 통일된 JSON으로 반환. 오케스트레이터가 병합, 중복 제거, 품질 필터링 후 파일로 저장.

**Tech Stack:** Claude Code Skills (Markdown), Agent tool, WebFetch, JSON, Bash (cron)

**Spec:** `docs/superpowers/specs/2026-03-22-devstory-collector-design.md`

---

## File Structure

```
devstory/
├── config/
│   └── sources.json                  # (Task 1) 소스 설정
├── skills/
│   ├── collect-news.md               # (Task 7) 오케스트레이터 스킬
│   └── agents/
│       ├── news-blogs.md             # (Task 2) 뉴스/블로그 에이전트
│       ├── ai-research.md            # (Task 3) AI 리서치 에이전트
│       ├── github-oss.md             # (Task 4) GitHub/오픈소스 에이전트
│       ├── community.md              # (Task 5) 커뮤니티 에이전트
│       └── eng-blogs.md              # (Task 6) 기업 블로그 에이전트
├── scripts/
│   └── cron-collect.sh               # (Task 9) cron 실행 스크립트
└── data/                             # (Task 8) 수집 데이터 저장소
    └── .gitkeep
```

---

### Task 0: Git 초기화 및 프로젝트 셋업

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Git 저장소 초기화**

```bash
cd /Users/ree/product/thistory/devstory
git init
```

- [ ] **Step 2: .gitignore 작성**

```
# OS
.DS_Store

# Logs
logs/

# Node (향후 웹앱 추가 시)
node_modules/
```

- [ ] **Step 3: 초기 커밋**

```bash
git add .gitignore
git commit -m "chore: initialize devstory project"
```

---

### Task 1: sources.json 설정 파일 생성

**Files:**
- Create: `config/sources.json`

- [ ] **Step 1: config 디렉토리 생성**

```bash
mkdir -p config
```

- [ ] **Step 2: sources.json 작성**

`config/sources.json` 생성 — 스펙의 sources.json 스키마를 그대로 사용. 5개 카테고리, 소스별 name/url/type 필드 포함:

```json
{
  "interval_hours": 24,
  "max_items_per_source": 20,
  "final_item_count": 30,
  "categories": {
    "news_blogs": {
      "agent": "news-blogs.md",
      "sources": [
        { "name": "hacker_news", "url": "https://hacker-news.firebaseio.com/v0/topstories.json", "type": "api" },
        { "name": "geeknews", "url": "https://news.hada.io/rss", "type": "rss" },
        { "name": "techcrunch", "url": "https://techcrunch.com/feed/", "type": "rss" },
        { "name": "the_verge", "url": "https://www.theverge.com/rss/index.xml", "type": "rss" },
        { "name": "ars_technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "type": "rss" },
        { "name": "devto", "url": "https://dev.to/feed", "type": "rss" }
      ]
    },
    "ai_research": {
      "agent": "ai-research.md",
      "sources": [
        { "name": "arxiv_ai", "url": "https://rss.arxiv.org/rss/cs.AI", "type": "rss" },
        { "name": "arxiv_lg", "url": "https://rss.arxiv.org/rss/cs.LG", "type": "rss" },
        { "name": "arxiv_cl", "url": "https://rss.arxiv.org/rss/cs.CL", "type": "rss" },
        { "name": "openai_blog", "url": "https://openai.com/blog", "type": "web" },
        { "name": "anthropic_news", "url": "https://www.anthropic.com/news", "type": "web" },
        { "name": "google_ai", "url": "https://blog.google/technology/ai/", "type": "web" },
        { "name": "huggingface_blog", "url": "https://huggingface.co/blog", "type": "web" },
        { "name": "papers_with_code", "url": "https://paperswithcode.com", "type": "web" }
      ]
    },
    "github_oss": {
      "agent": "github-oss.md",
      "sources": [
        { "name": "github_trending", "url": "https://github.com/trending", "type": "web" },
        { "name": "github_trending_python", "url": "https://github.com/trending/python", "type": "web" },
        { "name": "github_trending_typescript", "url": "https://github.com/trending/typescript", "type": "web" },
        { "name": "changelog", "url": "https://changelog.com/feed", "type": "rss" },
        { "name": "github_releases", "url": "https://github.com/trending", "type": "web", "note": "Track major project releases via WebSearch for: React, Next.js, Node.js, Rust, Python, TypeScript new releases" }
      ]
    },
    "community": {
      "agent": "community.md",
      "sources": [
        { "name": "reddit_programming", "url": "https://www.reddit.com/r/programming/top.json?t=day", "type": "api" },
        { "name": "reddit_ml", "url": "https://www.reddit.com/r/MachineLearning/top.json?t=day", "type": "api" },
        { "name": "reddit_experienceddevs", "url": "https://www.reddit.com/r/ExperiencedDevs/top.json?t=day", "type": "api" },
        { "name": "lobsters", "url": "https://lobste.rs/rss", "type": "rss" },
        { "name": "tldr", "url": "https://tldr.tech", "type": "web" }
      ]
    },
    "eng_blogs": {
      "agent": "eng-blogs.md",
      "sources": [
        { "name": "netflix_tech", "url": "https://netflixtechblog.com/feed", "type": "rss" },
        { "name": "uber_eng", "url": "https://eng.uber.com/feed/", "type": "rss" },
        { "name": "stripe_blog", "url": "https://stripe.com/blog/feed.rss", "type": "rss" },
        { "name": "vercel_blog", "url": "https://vercel.com/atom", "type": "rss" },
        { "name": "cloudflare_blog", "url": "https://blog.cloudflare.com/rss/", "type": "rss" },
        { "name": "meta_eng", "url": "https://engineering.fb.com/feed/", "type": "rss" }
      ]
    }
  }
}
```

- [ ] **Step 3: JSON 유효성 검증**

```bash
python3 -c "import json; json.load(open('config/sources.json')); print('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 4: Commit**

```bash
git add config/sources.json
git commit -m "feat: add sources.json configuration for news collection"
```

---

### Task 2: 뉴스/블로그 에이전트 프롬프트 작성

**Files:**
- Create: `skills/agents/news-blogs.md`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p skills/agents
```

- [ ] **Step 2: news-blogs.md 작성**

이 에이전트는 `WebFetch`로 각 소스를 가져오고 항목을 추출한다. 프롬프트에 포함할 내용:

```markdown
---
name: news-blogs-collector
description: 뉴스 & 블로그 소스에서 최신 기사를 수집하는 서브에이전트
---

You are a news collection agent. Your job is to fetch the latest articles from news and blog sources, extract structured data, and return it as JSON.

## Sources to Fetch

Use WebFetch to retrieve content from each of these sources:

1. **Hacker News** — `https://hacker-news.firebaseio.com/v0/topstories.json`
   - Fetch top story IDs, then fetch details for top 20: `https://hacker-news.firebaseio.com/v0/item/{id}.json`
   - Extract: title, url, score, descendants (comments), time
2. **GeekNews** — `https://news.hada.io/rss`
   - Parse RSS XML. Extract: title, link, description, pubDate
3. **TechCrunch** — `https://techcrunch.com/feed/`
   - Parse RSS XML. Extract: title, link, description, pubDate
4. **The Verge** — `https://www.theverge.com/rss/index.xml`
   - Parse RSS/Atom XML. Extract: title, link, summary, published
5. **Ars Technica** — `https://feeds.arstechnica.com/arstechnica/index`
   - Parse RSS XML. Extract: title, link, description, pubDate
6. **dev.to** — `https://dev.to/feed`
   - Parse RSS XML. Extract: title, link, description, pubDate

## Processing Rules

- For each item, generate:
  - `id`: `{source_name}-{hash of url}` (e.g., `hacker_news-a1b2c3`)
  - `title`: original title (English)
  - `title_ko`: Korean translation of the title
  - `summary_ko`: 1-2 sentence Korean summary of the article
  - `url`: link to the article
  - `source`: source name (e.g., `hacker_news`, `geeknews`)
  - `category`: `"news_blogs"`
  - `tags`: 2-5 relevant tags in English lowercase
  - `score`: community score if available (HN points, etc.), otherwise 0
  - `published_at`: ISO 8601 date string

- Only include items published within the last 24 hours
- Maximum 20 items per source
- If a source fails to fetch, record it in errors and continue with other sources

## Output Format

Return your result as a single JSON object (no markdown code fences, just raw JSON):

{
  "category": "news_blogs",
  "items": [ ... ],
  "errors": [
    { "source": "source_name", "error": "error description" }
  ]
}
```

- [ ] **Step 3: 단일 소스로 에이전트 테스트**

Claude Code에서 Agent 도구로 이 프롬프트의 HN 부분만 테스트:

```
Agent: "Read skills/agents/news-blogs.md. Then fetch ONLY Hacker News top 3 stories using WebFetch and return the JSON result."
```

Expected: HN에서 3개 항목이 JSON으로 반환됨

- [ ] **Step 4: Commit**

```bash
git add skills/agents/news-blogs.md
git commit -m "feat: add news-blogs collector agent prompt"
```

---

### Task 3: AI 리서치 에이전트 프롬프트 작성

**Files:**
- Create: `skills/agents/ai-research.md`

- [ ] **Step 1: ai-research.md 작성**

뉴스/블로그 에이전트와 동일한 패턴. 차이점:
- 소스: arXiv (3개 피드), OpenAI Blog, Anthropic News, Google AI, HuggingFace Blog, Papers With Code
- `category`: `"ai_research"`
- arXiv의 경우 논문 제목, 저자, abstract에서 요약 생성
- 웹 페이지(type: web)의 경우 WebFetch로 페이지를 가져온 후 최신 글 목록 추출

```markdown
---
name: ai-research-collector
description: AI & ML 리서치 소스에서 최신 논문과 블로그 포스트를 수집하는 서브에이전트
---

You are an AI research collection agent. Fetch the latest AI/ML papers and blog posts.

## Sources to Fetch

Use WebFetch for each source:

1. **arXiv cs.AI** — `https://rss.arxiv.org/rss/cs.AI`
2. **arXiv cs.LG** — `https://rss.arxiv.org/rss/cs.LG`
3. **arXiv cs.CL** — `https://rss.arxiv.org/rss/cs.CL`
   - Parse RSS. Extract: title, link, description (abstract snippet), dc:creator
   - For arXiv, prioritize papers with practical applications or major breakthroughs
4. **OpenAI Blog** — `https://openai.com/blog`
   - WebFetch the page, extract recent blog post titles and URLs
5. **Anthropic News** — `https://www.anthropic.com/news`
   - WebFetch the page, extract recent news titles and URLs
6. **Google AI Blog** — `https://blog.google/technology/ai/`
   - WebFetch the page, extract recent blog post titles and URLs
7. **Hugging Face Blog** — `https://huggingface.co/blog`
   - WebFetch the page, extract recent blog post titles and URLs
8. **Papers With Code** — `https://paperswithcode.com`
   - WebFetch the page, extract trending papers with code

## Processing Rules

Same as standard agent rules:
- Generate: id, title, title_ko, summary_ko, url, source, category ("ai_research"), tags, score, published_at
- Only items from last 24 hours
- Max 20 items per source
- For arXiv papers: include author names in summary_ko
- If a source fails, record in errors and continue

## Output Format

{
  "category": "ai_research",
  "items": [ ... ],
  "errors": [ ... ]
}
```

- [ ] **Step 2: arXiv RSS로 에이전트 테스트**

```
Agent: "Read skills/agents/ai-research.md. Fetch ONLY arXiv cs.AI RSS and return top 3 items as JSON."
```

Expected: arXiv 논문 3개가 JSON으로 반환됨

- [ ] **Step 3: Commit**

```bash
git add skills/agents/ai-research.md
git commit -m "feat: add ai-research collector agent prompt"
```

---

### Task 4: GitHub/오픈소스 에이전트 프롬프트 작성

**Files:**
- Create: `skills/agents/github-oss.md`

- [ ] **Step 1: github-oss.md 작성**

```markdown
---
name: github-oss-collector
description: GitHub Trending과 오픈소스 뉴스를 수집하는 서브에이전트
---

You are a GitHub and open-source collection agent. Fetch trending repos and OSS news.

## Sources to Fetch

1. **GitHub Trending (all)** — `https://github.com/trending`
2. **GitHub Trending (Python)** — `https://github.com/trending/python`
3. **GitHub Trending (TypeScript)** — `https://github.com/trending/typescript`
   - WebFetch each page. Extract: repo name, description, language, stars today, total stars, URL
   - Deduplicate across language pages (a repo may appear in both "all" and a language page)
4. **Changelog** — `https://changelog.com/feed`
   - Parse RSS. Extract: title, link, description, pubDate
5. **GitHub Releases** — Use WebSearch to find recent releases of major projects
   - Search for: "React release", "Next.js release", "Node.js release", "Rust release", "Python release", "TypeScript release" (within last 24 hours)
   - Extract: project name, version, release URL, key changes

## Processing Rules

- Generate: id, title, title_ko, summary_ko, url, source, category ("github_oss"), tags, score, published_at
- For GitHub repos: score = stars today, tags include language name
- For Changelog: score = 0
- Deduplicate repos appearing in multiple trending pages
- Max 20 items per source

## Output Format

{
  "category": "github_oss",
  "items": [ ... ],
  "errors": [ ... ]
}
```

- [ ] **Step 2: GitHub Trending 테스트**

```
Agent: "Read skills/agents/github-oss.md. Fetch ONLY https://github.com/trending and return top 3 repos as JSON."
```

- [ ] **Step 3: Commit**

```bash
git add skills/agents/github-oss.md
git commit -m "feat: add github-oss collector agent prompt"
```

---

### Task 5: 커뮤니티 에이전트 프롬프트 작성

**Files:**
- Create: `skills/agents/community.md`

- [ ] **Step 1: community.md 작성**

```markdown
---
name: community-collector
description: Reddit, Lobsters, TLDR 등 커뮤니티 소스에서 인기 토론을 수집하는 서브에이전트
---

You are a community discussion collection agent. Fetch top discussions from developer communities.

## Sources to Fetch

1. **Reddit r/programming** — `https://www.reddit.com/r/programming/top.json?t=day`
2. **Reddit r/MachineLearning** — `https://www.reddit.com/r/MachineLearning/top.json?t=day`
3. **Reddit r/ExperiencedDevs** — `https://www.reddit.com/r/ExperiencedDevs/top.json?t=day`
   - WebFetch the JSON API. Extract from `data.children[].data`: title, url, permalink, score, num_comments, created_utc
   - Use the post's `url` as the item URL (external link). If it's a self-post, use `https://www.reddit.com{permalink}`
4. **Lobsters** — `https://lobste.rs/rss`
   - Parse RSS. Extract: title, link, description, pubDate
5. **TLDR** — `https://tldr.tech`
   - WebFetch the page. Extract the latest newsletter items (title, URL, summary)

## Processing Rules

- Generate: id, title, title_ko, summary_ko, url, source, category ("community"), tags, score, published_at
- For Reddit: score = upvote score. Include num_comments in summary_ko
- For Lobsters: score = 0
- For TLDR: score = 0
- Max 20 items per source

## Output Format

{
  "category": "community",
  "items": [ ... ],
  "errors": [ ... ]
}
```

- [ ] **Step 2: Reddit API 테스트**

```
Agent: "Read skills/agents/community.md. Fetch ONLY https://www.reddit.com/r/programming/top.json?t=day and return top 3 posts as JSON."
```

- [ ] **Step 3: Commit**

```bash
git add skills/agents/community.md
git commit -m "feat: add community collector agent prompt"
```

---

### Task 6: 기업 엔지니어링 블로그 에이전트 프롬프트 작성

**Files:**
- Create: `skills/agents/eng-blogs.md`

- [ ] **Step 1: eng-blogs.md 작성**

```markdown
---
name: eng-blogs-collector
description: 주요 기업 엔지니어링 블로그에서 최신 포스트를 수집하는 서브에이전트
---

You are an engineering blog collection agent. Fetch latest posts from top tech company engineering blogs.

## Sources to Fetch

All RSS feeds — use WebFetch and parse XML:

1. **Netflix Tech Blog** — `https://netflixtechblog.com/feed`
2. **Uber Engineering** — `https://eng.uber.com/feed/`
3. **Stripe Blog** — `https://stripe.com/blog/feed.rss`
4. **Vercel Blog** — `https://vercel.com/atom`
5. **Cloudflare Blog** — `https://blog.cloudflare.com/rss/`
6. **Meta Engineering** — `https://engineering.fb.com/feed/`

For each: Extract title, link, description/summary, pubDate/published.

## Processing Rules

- Generate: id, title, title_ko, summary_ko, url, source, category ("eng_blogs"), tags, score (always 0), published_at
- Focus on engineering depth: system design, scaling, infrastructure, developer tools
- Skip marketing/product announcement posts — only include technical content
- Max 20 items per source

## Output Format

{
  "category": "eng_blogs",
  "items": [ ... ],
  "errors": [ ... ]
}
```

- [ ] **Step 2: 단일 RSS 피드 테스트**

```
Agent: "Read skills/agents/eng-blogs.md. Fetch ONLY https://blog.cloudflare.com/rss/ and return top 3 posts as JSON."
```

- [ ] **Step 3: Commit**

```bash
git add skills/agents/eng-blogs.md
git commit -m "feat: add eng-blogs collector agent prompt"
```

---

### Task 7: 오케스트레이터 스킬 작성

**Files:**
- Create: `skills/collect-news.md`

이 태스크가 핵심이다. 오케스트레이터는 5개 에이전트를 병렬 디스패치하고 결과를 병합한다.

- [ ] **Step 1: collect-news.md 작성**

```markdown
---
name: collect-news
description: 최신 개발/AI 뉴스를 수집하는 오케스트레이터 스킬. 5개 카테고리별 에이전트를 병렬 디스패치하여 데이터를 수집하고, 품질 필터링 후 JSON + 마크다운으로 저장한다.
---

You are the DevStory news collection orchestrator. Follow these steps exactly.

## Step 1: Read Configuration

Read `config/sources.json` to load source definitions.

## Step 2: Check for Existing Data

Determine today's date. Check if `data/YYYY/MM/DD/raw.json` already exists.
- If it exists, inform the user and ask whether to overwrite or skip.
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
- **Source reliability** (weight 40%): HN, arXiv, major eng blogs = high; Reddit, dev.to = medium
- **Community signal** (weight 35%): upvotes, stars, comments (normalize across sources)
- **Recency** (weight 25%): prefer items from last 12 hours over 12-24 hours

Sort by score descending. Then apply **category diversity rebalancing**: no single category may exceed 40% of final items (max 12 of 30). If a category exceeds the cap, drop its lowest-scored items and backfill from underrepresented categories.

Select top 30 items.

## Step 7: Save JSON

Create directory `data/YYYY/MM/DD/` and write `raw.json`:

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

## Step 9: Report to User

Print a brief summary:
- Total items collected / filtered / saved
- Any source errors
- Path to saved files
- Top 5 items as a preview
```

- [ ] **Step 2: 오케스트레이터 프롬프트 검증 — 구조 확인**

Read the file back and verify:
- All 5 agent paths are correct
- JSON schema matches spec
- Summary markdown format is complete

- [ ] **Step 3: Commit**

```bash
git add skills/collect-news.md
git commit -m "feat: add collect-news orchestrator skill"
```

---

### Task 8: data 디렉토리 및 .gitkeep 설정

**Files:**
- Create: `data/.gitkeep`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add data/.gitkeep
git commit -m "feat: add data directory"
```

---

### Task 9: cron 자동 실행 스크립트

**Files:**
- Create: `scripts/cron-collect.sh`

- [ ] **Step 1: scripts 디렉토리 생성**

```bash
mkdir -p scripts
```

- [ ] **Step 2: cron-collect.sh 작성**

```bash
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
```

- [ ] **Step 3: 실행 권한 부여**

```bash
chmod +x scripts/cron-collect.sh
```

- [ ] **Step 4: Commit**

```bash
git add scripts/cron-collect.sh
git commit -m "feat: add cron wrapper script for automated collection"
```

---

### Task 10: 통합 테스트 — 전체 수집 파이프라인 실행

**Files:**
- Verify: `skills/collect-news.md`, all agent files, `config/sources.json`
- Output: `data/YYYY/MM/DD/raw.json`, `data/YYYY/MM/DD/summary.md`

- [ ] **Step 1: 스킬을 실행하여 전체 파이프라인 테스트**

사용자에게 `/collect-news` 실행을 요청하거나, 직접 오케스트레이터 프롬프트를 실행:

```
"Read skills/collect-news.md and follow its instructions to collect today's news."
```

- [ ] **Step 2: 출력 파일 검증**

```bash
# 오늘 날짜 변수 설정
TODAY=$(date +%Y/%m/%d)

# raw.json 존재 확인
ls -la "data/${TODAY}/raw.json"

# JSON 유효성 검증
python3 -c "import json; d=json.load(open('data/${TODAY}/raw.json')); print(f'Items: {len(d[\"items\"])}, Sources OK: {len(d[\"meta\"][\"sources_succeeded\"])}, Failed: {len(d[\"meta\"][\"sources_failed\"])}')"

# summary.md 존재 확인
ls -la "data/${TODAY}/summary.md"
```

Expected:
- `raw.json` 존재, 유효한 JSON, items 20-30개
- `summary.md` 존재, 카테고리별 섹션 포함

- [ ] **Step 3: 에러 소스 확인 및 수정**

`raw.json`의 `meta.sources_failed`를 확인. 실패한 소스가 있으면:
- URL이 올바른지 확인
- WebFetch가 해당 소스를 가져올 수 있는지 개별 테스트
- 필요시 소스 URL을 `sources.json`에서 수정

- [ ] **Step 4: 결과 데이터 Commit**

```bash
git add data/
git commit -m "feat: first collection run — verify pipeline works"
```

---

### Task 11: 최종 파일 구조 확인

**Files:**
- Verify: all files in repo

- [ ] **Step 1: 최종 파일 구조 확인**

```bash
find . -not -path './.git/*' -not -path './.git' | sort
```

Expected:
```
.
./config/sources.json
./data/.gitkeep
./docs/superpowers/plans/2026-03-22-devstory-collector.md
./docs/superpowers/specs/2026-03-22-devstory-collector-design.md
./scripts/cron-collect.sh
./skills/agents/ai-research.md
./skills/agents/community.md
./skills/agents/eng-blogs.md
./skills/agents/github-oss.md
./skills/agents/news-blogs.md
./skills/collect-news.md
./.gitignore
```

- [ ] **Step 2: Commit (필요시)**

```bash
git status
# 변경사항이 있으면 커밋
```
