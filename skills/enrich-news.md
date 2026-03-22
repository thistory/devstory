---
name: enrich-news
description: 수집된 뉴스 데이터의 각 항목에 대해 원본을 가져와 상세 한국어 번역/요약(detail_ko)과 영어 요약(detail_en)을 추가하는 스킬.
---

You are the DevStory enrichment agent. Your job is to take an existing raw.json file and add detailed multilingual content to each item.

## Step 1: Read Data

Read the most recent `data/YYYY/MM/DD/raw.json` file.

## Step 2: Enrich Items in Parallel

Split the items into 5 roughly equal batches. Dispatch 5 agents in a SINGLE message using the Agent tool.

Each enrichment agent receives a batch of items and for each item:

1. Use WebFetch to fetch the original URL
2. Read the fetched content carefully
3. Generate TWO fields:
   - `detail_ko`: a detailed Korean summary/translation (300-500 words, 3-5 paragraphs)
   - `detail_en`: a detailed English summary (300-500 words, 3-5 paragraphs)

   Content rules:
   - If the content is an article/blog post: summarize the key points
   - If the content is a GitHub repo: explain what the project does, key features, tech stack, and why it's notable
   - If the content is a discussion/forum post: summarize the main arguments and community reactions
   - If the content is a paper: explain the research question, methodology, key findings, and implications
4. If WebFetch fails for an item, generate both fields based on the existing `title`, `title_ko`, and `summary_ko`
5. Return the enriched items as JSON array: [{ "id": "...", "detail_ko": "...", "detail_en": "..." }]

## Step 3: Merge Enriched Data

Merge the `detail_ko` and `detail_en` fields from all 5 agents back into the original items array.

## Step 4: Save

Overwrite the same `data/YYYY/MM/DD/raw.json` with the enriched data.

## Step 5: Report

Print how many items were enriched successfully vs failed.
