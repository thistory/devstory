# DevStory

[한국어](./README.ko.md)

A Claude Code skill that automatically collects, translates, and curates the latest software engineering, AI, and open-source news from 30+ trusted sources — delivered as a clean, readable web page.

## How It Works

```
/collect-news
     |
     v
5 parallel agents (WebFetch from 30+ sources)
     |
     v
Deduplicate → Score → Rank → Top 30
     |
     v
Enrich (Korean + English detail summaries)
     |
     v
data/YYYY/MM/DD/raw.json + summary.md
```

**Sources include:** Hacker News, GitHub Trending, Reddit, arXiv, TechCrunch, Lobsters, TLDR, Vercel Blog, Cloudflare Blog, and more.

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js 18+ (for local preview server)

### Run Collection

```bash
cd devstory
claude "Read skills/collect-news.md and follow its instructions."
```

This will:
1. Fetch news from all sources in parallel
2. Deduplicate and rank by quality score
3. Generate detailed Korean and English summaries
4. Save to `data/YYYY/MM/DD/raw.json`

### View Results

```bash
python3 -m http.server 8899
open http://localhost:8899
```

## Features

- **Parallel collection** — 5 category agents run simultaneously
- **Bilingual** — Full Korean translations + English summaries for every article
- **Quality ranking** — Source reliability, community signal, recency scoring
- **Dark mode** — Toggle between light and dark themes
- **Expandable cards** — Click to read detailed summary, link to original
- **Keyboard accessible** — Full keyboard navigation support
- **Cron ready** — Automate with `scripts/cron-collect.sh`

## Project Structure

```
devstory/
├── skills/
│   ├── collect-news.md        # Orchestrator skill
│   ├── enrich-news.md         # Enrichment skill
│   └── agents/                # 5 category-specific collector agents
│       ├── news-blogs.md
│       ├── ai-research.md
│       ├── github-oss.md
│       ├── community.md
│       └── eng-blogs.md
├── config/
│   └── sources.json           # Source URLs and categories
├── data/
│   ├── latest.json            # Points to most recent collection
│   └── YYYY/MM/DD/raw.json    # Daily collected data
├── scripts/
│   └── cron-collect.sh        # Cron automation wrapper
└── index.html                 # Web viewer (single file, no build step)
```

## Source Categories

| Category | Sources | Examples |
|----------|---------|---------|
| News & Blogs | 6 | Hacker News, GeekNews, TechCrunch, dev.to |
| AI & ML Research | 8 | arXiv, OpenAI, Anthropic, HuggingFace |
| GitHub & OSS | 5 | GitHub Trending, Releases, Changelog |
| Community | 5 | Reddit, Lobsters, TLDR |
| Engineering Blogs | 6 | Netflix, Cloudflare, Vercel, Meta |

## Automation

```bash
# Daily at 9 AM
crontab -e
0 9 * * * /path/to/devstory/scripts/cron-collect.sh

# Every 5 hours
0 */5 * * * /path/to/devstory/scripts/cron-collect.sh
```

## Adding Sources

1. Add the source to `config/sources.json` under the appropriate category
2. Add fetch instructions to the corresponding agent file in `skills/agents/`

## Data Schema

Each item in `raw.json`:

```json
{
  "id": "hn-12345",
  "title": "Original English Title",
  "title_ko": "한국어 제목",
  "summary_ko": "1-2 sentence Korean summary",
  "detail_ko": "Detailed Korean translation (3-5 paragraphs)",
  "detail_en": "Detailed English summary (3-5 paragraphs)",
  "url": "https://...",
  "source": "hacker_news",
  "category": "news_blogs",
  "tags": ["ai", "open-source"],
  "score": 85,
  "published_at": "2026-03-22T12:00:00Z"
}
```

## License

MIT
