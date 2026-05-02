---
name: scrape-unstructured
description: 비정형 웹페이지 9개 + WebSearch 1개 소스에서 아이템 추출 (LLM 필요)
---

WebFetch로 아래 10개 소스에서 최신 항목을 추출. 각 소스 max 20개, 24시간 이내만.

## Sources

| Source | URL | Method |
|--------|-----|--------|
| OpenAI Blog | `https://openai.com/blog` | WebFetch → HTML에서 제목+URL 추출 |
| Anthropic News | `https://www.anthropic.com/news` | WebFetch |
| Google AI Blog | `https://blog.google/technology/ai/` | WebFetch |
| HuggingFace Blog | `https://huggingface.co/blog` | WebFetch |
| Papers With Code | `https://paperswithcode.com` | WebFetch → trending papers |
| GitHub Trending (all) | `https://github.com/trending` | WebFetch → repo name, desc, stars today |
| GitHub Trending (Python) | `https://github.com/trending/python` | WebFetch, dedup with above |
| GitHub Trending (TS) | `https://github.com/trending/typescript` | WebFetch, dedup with above |
| TLDR | `https://tldr.tech` | WebFetch → newsletter items |
| GitHub Releases | — | WebSearch "React/Next.js/Node.js/Rust/Python/TypeScript release" last 24h |

## Item Schema

`{ id: "{source}-{url_hash}", title, url, source, category, score, published_at: ISO8601, summary_en }`

- title_ko, summary_ko, tags → null (translate-and-tag가 나중에 채움)
- GitHub Trending: score = stars today, category = "github_oss"
- GitHub Releases: score = 50, category = "github_oss"
- AI blogs: score = 0, category = "ai_research"
- TLDR: score = 0, category = "community"

## Output

Raw JSON (no code fences): `{ "items": [...], "errors": [{ "source", "error" }] }`
