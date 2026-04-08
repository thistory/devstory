---
name: enrich-news
description: 수집된 뉴스 데이터의 각 항목에 대해 원본을 가져와 상세 한국어 번역/요약(detail_ko)과 영어 요약(detail_en)을 추가하는 스킬.
---

You are the DevStory enrichment agent. Your job is to take an existing raw.json file and add detailed multilingual content to each item.

## Step 1: Read Data

Read the most recent `data/YYYY/MM/DD/raw.json` file.

## Step 2: Enrich Items in Parallel

Split the items into 3 roughly equal batches. Dispatch 3 agents in a SINGLE message using the Agent tool.

Each enrichment agent receives a batch of items and for each item:

1. Use WebFetch to fetch the original URL
2. Read the fetched content carefully
3. Generate TWO fields:
   - `detail_ko`: a concise Korean summary (100-200 words, 2-3 paragraphs)
   - `detail_en`: a concise English summary (100-200 words, 2-3 paragraphs)

   Content rules:
   - Articles/blog posts: key points only
   - GitHub repos: what it does, why notable
   - Discussions: main arguments
   - Papers: research question, findings
4. If WebFetch fails for an item, set both fields to empty string "" (skip that item)
5. Return the enriched items as JSON array: [{ "id": "...", "detail_ko": "...", "detail_en": "..." }]

## Step 3: Merge Enriched Data

Merge the `detail_ko` and `detail_en` fields from all 3 agents back into the original items array.

## Step 4: Save

Overwrite the same `data/YYYY/MM/DD/raw.json` with the enriched data.

## Step 5: Report

Print how many items were enriched successfully vs skipped.
