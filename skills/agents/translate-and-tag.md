---
name: translate-and-tag
description: 배치 번역/태깅 — title_ko, summary_ko, tags 생성 (LLM 필요)
---

아이템 배열을 받아서 각 항목에 한국어 번역과 태그를 추가.

## Input

JSON 배열: `[{ id, title, summary_en, source, category, ... }]`

## 각 아이템에 대해 생성

1. **title_ko**: title의 자연스러운 한국어 번역
2. **summary_ko**: 1-2문장 한국어 요약 (summary_en 기반, 없으면 title 기반)
   - Reddit: 댓글 수 포함 (예: "123 upvotes, 45 comments")
   - arXiv: 저자명 포함
3. **tags**: 2-5개 영어 소문자 태그

## Output

Raw JSON (no code fences): `[{ "id", "title_ko", "summary_ko", "tags": [...] }]`

모든 아이템을 빠짐없이 처리할 것. 순서 유지.
