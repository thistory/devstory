# DevStory Collector — Design Spec

## Overview

Claude Code 스킬/에이전트 기반의 소프트웨어 엔지니어링, 개발, AI 관련 최신 데이터 수집 시스템.
오케스트레이터 스킬이 카테고리별 서브에이전트를 병렬 디스패치하여 데이터를 수집하고, 품질 필터링 후 JSON + 마크다운으로 저장한다.

### 소비자

- 본인: 매일 최신 트렌드 요약
- 웹 서비스: devstory 웹앱에 퍼블리싱

### 핵심 요구사항

- 하루 1회 수집 (향후 5시간 주기로 확장)
- 자동(cron) + 수동(`/collect-news`) 트리거
- 원문 보존 + 한국어 요약 함께 제공
- JSON 파일로 구조화 저장, 마크다운 요약 리포트 생성

---

## 신뢰할 수 있는 소스 목록

### 카테고리 1 — 뉴스 & 블로그

| 소스 | URL | 수집 방법 | 비고 |
|------|-----|----------|------|
| Hacker News | news.ycombinator.com | HN API (`/v0/topstories`) | 포인트/댓글 수로 필터링 |
| GeekNews | news.hada.io | WebFetch (피드) | 한국어 테크 커뮤니티 |
| TechCrunch | techcrunch.com | WebFetch (RSS) | 스타트업/산업 뉴스 |
| The Verge | theverge.com | WebFetch (RSS) | 일반 테크 |
| Ars Technica | arstechnica.com | WebFetch (RSS) | 심층 기술 기사 |
| dev.to | dev.to | WebFetch (피드) | 개발자 커뮤니티 블로그 |

### 카테고리 2 — AI & ML 리서치

| 소스 | URL | 수집 방법 | 비고 |
|------|-----|----------|------|
| arXiv | arxiv.org (cs.AI, cs.LG, cs.CL) | API/RSS | 최신 논문 |
| OpenAI Blog | openai.com/blog | WebFetch | 모델 릴리스, 연구 |
| Anthropic Blog | anthropic.com/news | WebFetch | Claude 관련 |
| Google AI Blog | blog.google/technology/ai | WebFetch | Gemini, DeepMind |
| Hugging Face Blog | huggingface.co/blog | WebFetch | 오픈소스 AI |
| Papers With Code | paperswithcode.com | WebFetch | 트렌딩 논문+코드 |

### 카테고리 3 — GitHub & 오픈소스

| 소스 | URL | 수집 방법 | 비고 |
|------|-----|----------|------|
| GitHub Trending | github.com/trending | WebFetch | 일간 트렌딩 레포 |
| GitHub Releases | github.com (주요 프로젝트) | API | React, Next.js, Node, Rust 등 |
| Changelog | changelog.com | WebFetch (RSS) | 오픈소스 뉴스 |

### 카테고리 4 — 커뮤니티 & 토론

| 소스 | URL | 수집 방법 | 비고 |
|------|-----|----------|------|
| Reddit r/programming | reddit.com/r/programming | WebFetch (JSON API) | top/day |
| Reddit r/MachineLearning | reddit.com/r/MachineLearning | WebFetch (JSON API) | AI 커뮤니티 |
| Reddit r/ExperiencedDevs | reddit.com/r/ExperiencedDevs | WebFetch (JSON API) | 시니어 개발자 |
| Lobsters | lobste.rs | WebFetch (RSS) | 고품질 HN 대안 |
| TLDR Newsletter | tldr.tech | WebFetch | 일간 테크 요약 |

### 카테고리 5 — 기업 엔지니어링 블로그

| 소스 | URL | 수집 방법 | 비고 |
|------|-----|----------|------|
| Netflix Tech Blog | netflixtechblog.com | WebFetch | 대규모 시스템 |
| Uber Engineering | eng.uber.com | WebFetch | 인프라/ML |
| Stripe Blog | stripe.com/blog | WebFetch | 결제/API 설계 |
| Vercel Blog | vercel.com/blog | WebFetch | 프론트엔드/Next.js |
| Cloudflare Blog | blog.cloudflare.com | WebFetch | 네트워크/엣지 |
| Meta Engineering | engineering.fb.com | WebFetch | React, 인프라 |

---

## 아키텍처

### 전체 흐름

```
사용자: /collect-news (또는 cron 자동 트리거)
         │
         ▼
┌─────────────────────────────────┐
│  오케스트레이터 스킬             │
│  (collect-news)                 │
│                                 │
│  1. 오늘 날짜 확인              │
│  2. 병렬 에이전트 5개 디스패치   │
│  3. 결과 병합 & 중복 제거        │
│  4. 품질 필터링 & 랭킹          │
│  5. JSON 저장                   │
│  6. 마크다운 요약 생성           │
└──────┬──┬──┬──┬──┬──────────────┘
       │  │  │  │  │
       ▼  ▼  ▼  ▼  ▼  (병렬)
    ┌────┐┌────┐┌────┐┌────┐┌────┐
    │뉴스││ AI ││ GH ││커뮤││블로│
    │블로││리서││오픈││니티││그  │
    │그  ││치  ││소스││토론││기업│
    └────┘└────┘└────┘└────┘└────┘
```

### 디렉토리 구조

```
devstory/
├── skills/
│   ├── collect-news.md          # 오케스트레이터 스킬 정의
│   └── agents/
│       ├── news-blogs.md        # 뉴스/블로그 에이전트 프롬프트
│       ├── ai-research.md       # AI 리서치 에이전트 프롬프트
│       ├── github-oss.md        # GitHub/오픈소스 에이전트 프롬프트
│       ├── community.md         # 커뮤니티 에이전트 프롬프트
│       └── eng-blogs.md         # 기업 엔지니어링 블로그 에이전트 프롬프트
├── data/
│   └── YYYY/
│       └── MM/
│           └── DD/
│               ├── raw.json     # 전체 수집 데이터 (구조화)
│               └── summary.md   # 마크다운 요약 리포트
├── config/
│   └── sources.json             # 소스 URL, 카테고리, 우선순위 설정
└── scripts/
    └── cron-collect.sh          # cron 자동 실행 래퍼 스크립트
```

---

## JSON 데이터 스키마

### raw.json

```json
{
  "date": "2026-03-22",
  "collected_at": "2026-03-22T09:00:00Z",
  "items": [
    {
      "id": "hn-42345678",
      "title": "Rust 2026 Edition Released",
      "title_ko": "Rust 2026 에디션 출시",
      "summary_ko": "Rust 2026 에디션이 공식 출시되었습니다. 주요 변경사항은...",
      "url": "https://blog.rust-lang.org/2026/...",
      "source": "hacker_news",
      "category": "news_blogs",
      "tags": ["rust", "programming-language", "release"],
      "score": 85,
      "published_at": "2026-03-22T06:30:00Z"
    }
  ],
  "meta": {
    "total_collected": 150,
    "after_dedup": 120,
    "after_filter": 30,
    "sources_succeeded": ["hacker_news", "github_trending"],
    "sources_failed": []
  }
}
```

### sources.json

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
        { "name": "changelog", "url": "https://changelog.com/feed", "type": "rss" }
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

---

## 스킬 & 에이전트 동작 방식

### 오케스트레이터 스킬 (`/collect-news`)

Claude Code 스킬 파일(`skills/collect-news.md`)로 정의. 실행 시:

1. `config/sources.json` 읽기
2. 오늘 날짜로 데이터 디렉토리 확인 (중복 수집 방지)
3. 5개 카테고리별 `Agent` 도구를 **단일 메시지에서 병렬 호출**
4. 각 에이전트 결과 수신 후 병합
5. 중복 제거 (URL 기반 + 제목 유사도)
6. 품질 점수 산정 & 상위 20-30개 선별
7. `data/YYYY/MM/DD/raw.json` 저장
8. 한국어 요약 마크다운 리포트 생성 → `data/YYYY/MM/DD/summary.md`
9. 사용자에게 결과 요약 출력

### 에이전트 프롬프트 구조

각 에이전트(`agents/*.md`)는 동일한 패턴:

1. `sources.json`에서 자기 카테고리의 소스 목록을 받음
2. 소스별로 `WebFetch`로 데이터 가져오기
3. 가져온 데이터에서 항목 추출 (제목, URL, 요약, 날짜)
4. 한국어 제목(`title_ko`) + 한국어 요약(`summary_ko`) 생성
5. 통일된 JSON 배열로 결과 반환

에이전트 반환 형식:
```json
{
  "category": "news_blogs",
  "items": [...],
  "errors": [
    { "source": "techcrunch", "error": "timeout" }
  ]
}
```

### 품질 필터링 & 랭킹

오케스트레이터가 병합 후 각 항목에 점수 부여:

- **소스 신뢰도** (HN, arXiv 등 고신뢰 소스 가중치 높음)
- **커뮤니티 반응** (업보트, 스타, 댓글 수)
- **최신성** (24시간 이내 가중치)
- **카테고리 다양성** (특정 카테고리 편중 방지)

최종 `score` (0-100)로 정렬, 상위 20-30개 선별.

---

## cron 자동 실행

```bash
#!/bin/bash
# scripts/cron-collect.sh
cd /Users/ree/product/thistory/devstory
claude -p "Execute /collect-news skill" \
  --allowedTools "WebFetch,WebSearch,Write,Read,Glob,Grep,Agent"
```

Claude Code의 `CronCreate` 도구 또는 시스템 crontab으로 등록:

```
# 매일 오전 9시 실행
0 9 * * * /Users/ree/product/thistory/devstory/scripts/cron-collect.sh

# 향후 5시간 주기로 변경 시
0 */5 * * * /Users/ree/product/thistory/devstory/scripts/cron-collect.sh
```

---

## 확장 고려사항

- **주기 변경**: `sources.json`의 `interval_hours` 수정으로 전환
- **소스 추가**: `sources.json`에 항목 추가, 해당 카테고리 에이전트가 자동 포함
- **새 카테고리**: `sources.json`에 카테고리 추가 + 에이전트 프롬프트 파일 생성
- **웹 서비스 연동**: `data/` 디렉토리의 JSON을 웹앱에서 직접 읽거나 API로 서빙
- **히스토리**: 날짜별 디렉토리 구조로 자연스럽게 아카이브
- **검색**: 축적된 JSON 데이터에 대해 `Grep`/전문검색 가능
