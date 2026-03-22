# DevStory

[English](./README.md)

30개 이상의 신뢰할 수 있는 소스에서 최신 소프트웨어 엔지니어링, AI, 오픈소스 뉴스를 자동으로 수집하고, 번역/요약하여 깔끔한 웹 페이지로 보여주는 Claude Code 스킬입니다.

## 작동 방식

```
/collect-news
     |
     v
5개 병렬 에이전트 (30+ 소스에서 WebFetch)
     |
     v
중복 제거 → 품질 점수 → 랭킹 → 상위 30개
     |
     v
상세 번역/요약 (한국어 + 영어)
     |
     v
data/YYYY/MM/DD/raw.json + summary.md
```

**소스:** Hacker News, GitHub Trending, Reddit, arXiv, TechCrunch, Lobsters, TLDR, Vercel Blog, Cloudflare Blog 등

## 빠른 시작

### 사전 요구사항

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI 설치
- Node.js 18+ (로컬 미리보기 서버)

### 수집 실행

```bash
cd devstory
claude "Read skills/collect-news.md and follow its instructions."
```

### 결과 보기

```bash
python3 -m http.server 8899
open http://localhost:8899
```

## 주요 기능

- **병렬 수집** — 5개 카테고리 에이전트 동시 실행
- **이중 언어** — 모든 기사에 한국어 번역 + 영어 요약
- **품질 랭킹** — 소스 신뢰도, 커뮤니티 반응, 최신성 기반 점수
- **다크 모드** — 라이트/다크 테마 전환
- **카드 확장** — 클릭하면 상세 요약, 원본 링크 제공
- **키보드 접근성** — 완전한 키보드 네비게이션
- **자동화** — `scripts/cron-collect.sh`로 cron 설정 가능

## 프로젝트 구조

```
devstory/
├── skills/
│   ├── collect-news.md        # 오케스트레이터 스킬
│   ├── enrich-news.md         # 번역/요약 스킬
│   └── agents/                # 5개 카테고리 수집 에이전트
├── config/
│   └── sources.json           # 소스 URL 및 카테고리
├── data/
│   ├── latest.json            # 최신 수집 데이터 포인터
│   └── YYYY/MM/DD/raw.json    # 일별 수집 데이터
├── scripts/
│   └── cron-collect.sh        # cron 자동화 스크립트
└── index.html                 # 웹 뷰어 (빌드 불필요)
```

## 소스 카테고리

| 카테고리 | 소스 수 | 예시 |
|---------|--------|------|
| 뉴스 & 블로그 | 6 | Hacker News, GeekNews, TechCrunch, dev.to |
| AI & ML 리서치 | 8 | arXiv, OpenAI, Anthropic, HuggingFace |
| GitHub & 오픈소스 | 5 | GitHub Trending, Releases, Changelog |
| 커뮤니티 | 5 | Reddit, Lobsters, TLDR |
| 엔지니어링 블로그 | 6 | Netflix, Cloudflare, Vercel, Meta |

## 자동화

```bash
# 매일 오전 9시
crontab -e
0 9 * * * /path/to/devstory/scripts/cron-collect.sh

# 5시간마다
0 */5 * * * /path/to/devstory/scripts/cron-collect.sh
```

## 소스 추가 방법

1. `config/sources.json`의 해당 카테고리에 소스 추가
2. `skills/agents/`의 해당 에이전트 파일에 수집 지침 추가

## 라이선스

MIT
