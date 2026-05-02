---
name: enrich-news
description: 수집된 뉴스 데이터의 각 항목에 대해 pre-fetched 원본 콘텐츠를 읽어 상세 한국어 번역/요약(detail_ko)과 영어 요약(detail_en)을 추가하는 스킬.
---

**Important:** Article content is pre-fetched by `scripts/fetch-enrichment.sh` and saved in `tmp/enrichment/{id}.html`. Use the Read tool to read these local files — do NOT use WebFetch.

## Step 1: Read Data

Read today's `data/YYYY/MM/DD/raw.json`.

## Step 2: Dispatch 3 Parallel Agents

Split the items into 3 roughly equal batches. Dispatch 3 agents in a SINGLE message using the Agent tool.

For each item, each agent must:

1. Use the Read tool to read `tmp/enrichment/{id}.html`
2. Read the content carefully
3. Generate TWO fields:
   - `detail_ko`: a concise Korean summary (100-200 words, 2-3 paragraphs)
   - `detail_en`: a concise English summary (100-200 words, 2-3 paragraphs)

   Content rules:
   - Articles/blog posts: key points only
   - GitHub repos: what it does, why notable
   - Discussions: main arguments
   - Papers: research question, findings
4. If the file doesn't exist for an item, set both fields to empty string "" (skip that item)
5. Return the enriched items as JSON array: [{ "id": "...", "detail_ko": "...", "detail_en": "..." }]

## Step 3: Merge & Save

Merge the `detail_ko` and `detail_en` fields from all 3 agents back into the original items array. Overwrite the same `data/YYYY/MM/DD/raw.json` with the enriched data.

## Step 4: Report

Print how many items were enriched successfully vs skipped.

---

## Alternative Pipeline (Draft — Node.js script/LLM hybrid)

> **Status:** Experimental, paired with the alternative pipeline in `collect-news.md`. Not currently wired into `cron-collect.sh`.
>
> 설계 요약: raw.json 각 항목에 detail_ko/detail_en 추가. pre-fetched 콘텐츠 사용, WebFetch 불필요.

### 1. Read Data

`data/YYYY/MM/DD/raw.json`과 `data/YYYY/MM/DD/prefetched-content.json`을 읽는다.

### 2. Dispatch 2-3 Parallel Agents

아이템을 2-3 배치로 분할 (10-15개씩). ALL agents in a SINGLE message.

각 Agent에게 전달할 내용:
- 아이템 배열: `[{ id, title, title_ko, summary_ko }]`
- 해당 아이템의 prefetched text_content (id로 매칭)

각 Agent가 생성:
- `detail_ko`: 한국어 상세 요약 (300-500 words, 3-5 paragraphs)
- `detail_en`: 영어 상세 요약 (300-500 words, 3-5 paragraphs)
- 콘텐츠 유형: article→핵심요약, repo→기능/스택/의의, discussion→논쟁/반응, paper→질문/방법/결과
- text_content가 null이면 title/summary 기반 생성

반환: `[{ "id", "detail_ko", "detail_en" }]`

### 3. Save & Merge

모든 Agent 결과를 합쳐서 `data/YYYY/MM/DD/enrichment-output.json`으로 저장.

```bash
node scripts/merge-enrichment.mjs data/YYYY/MM/DD
```

### 4. Report

enriched 성공/실패 수 출력.
