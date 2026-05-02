#!/usr/bin/env node
/**
 * dedup-score-save.mjs
 * Deduplicates, scores, ranks, applies diversity cap, and saves final files.
 * Zero LLM tokens.
 *
 * Input:  data/YYYY/MM/DD/fetched-all.json (merged structured + scraped + translated)
 * Output: data/YYYY/MM/DD/raw.json, data/YYYY/MM/DD/summary.md, data/latest.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FINAL_COUNT = 30;
const DIVERSITY_CAP = 12; // max per category out of 30

// ── Source reliability weights (0-100) ──
const SOURCE_WEIGHT = {
  hacker_news: 85,
  arxiv_ai: 80, arxiv_lg: 80, arxiv_cl: 80,
  cloudflare_blog: 75, netflix_tech: 75, meta_eng: 75, stripe_blog: 75,
  uber_eng: 70, vercel_blog: 70,
  geeknews: 70, techcrunch: 70, the_verge: 65, ars_technica: 65,
  openai_blog: 80, anthropic_news: 80, google_ai: 75, huggingface_blog: 70,
  papers_with_code: 75,
  github_trending: 70, github_trending_python: 70, github_trending_typescript: 70,
  github_releases: 65, changelog: 60,
  reddit_programming: 60, reddit_ml: 60, reddit_experienceddevs: 60,
  lobsters: 65, tldr: 55, devto: 55,
};

// ── Levenshtein distance ──
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

function titleSimilarity(a, b) {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ── Deduplication ──
function deduplicate(items) {
  const seen = new Map(); // url → item
  const result = [];

  for (const item of items) {
    const normUrl = item.url.replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');

    // Exact URL match
    if (seen.has(normUrl)) {
      const existing = seen.get(normUrl);
      if (item.score > existing.score) {
        result[result.indexOf(existing)] = item;
        seen.set(normUrl, item);
      }
      continue;
    }

    // Title similarity check
    let isDup = false;
    for (const existing of result) {
      if (titleSimilarity(item.title, existing.title) > 0.8) {
        if (item.score > existing.score) {
          result[result.indexOf(existing)] = item;
          seen.delete(existing.url.replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, ''));
          seen.set(normUrl, item);
        }
        isDup = true;
        break;
      }
    }

    if (!isDup) {
      result.push(item);
      seen.set(normUrl, item);
    }
  }

  return result;
}

// ── Scoring ──
function scoreItems(items) {
  // Find min/max community signal for normalization
  const signals = items.map(i => i.score || 0);
  const minSig = Math.min(...signals);
  const maxSig = Math.max(...signals);
  const sigRange = maxSig - minSig || 1;

  const now = Date.now();

  return items.map(item => {
    const sourceW = (SOURCE_WEIGHT[item.source] || 50) / 100;
    const normSignal = ((item.score || 0) - minSig) / sigRange;

    let recency = 0.4;
    if (item.published_at) {
      const age = now - new Date(item.published_at).getTime();
      const hours = age / (60 * 60 * 1000);
      recency = hours <= 12 ? 1.0 : hours <= 24 ? 0.7 : 0.4;
    }

    const finalScore = Math.round(
      (0.4 * sourceW + 0.35 * normSignal + 0.25 * recency) * 100
    );

    return { ...item, score: finalScore };
  });
}

// ── Diversity cap ──
function applyDiversityCap(items) {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const catCount = {};
  const selected = [];
  const overflow = [];

  for (const item of sorted) {
    const cat = item.category;
    catCount[cat] = (catCount[cat] || 0);
    if (catCount[cat] < DIVERSITY_CAP && selected.length < FINAL_COUNT) {
      selected.push(item);
      catCount[cat]++;
    } else {
      overflow.push(item);
    }
  }

  // Backfill from overflow if we haven't reached FINAL_COUNT
  for (const item of overflow) {
    if (selected.length >= FINAL_COUNT) break;
    selected.push(item);
  }

  return selected.sort((a, b) => b.score - a.score);
}

// ── Summary markdown ──
function generateSummary(date, items) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const top10 = items.slice(0, 10).map((item, i) => {
    const title = item.title_ko || item.title;
    return `${i + 1}. **[${title}](${item.url})** — ${item.summary_ko || item.summary_en || ''} \`[${item.source}]\` ⭐ ${item.score}`;
  }).join('\n');

  const categories = {
    news_blogs: { emoji: '📰', label: '뉴스 & 블로그' },
    ai_research: { emoji: '🤖', label: 'AI & ML 리서치' },
    github_oss: { emoji: '🐙', label: 'GitHub & 오픈소스' },
    community: { emoji: '💬', label: '커뮤니티 토론' },
    eng_blogs: { emoji: '🏗️', label: '엔지니어링 블로그' },
  };

  let sections = '';
  for (const [cat, meta] of Object.entries(categories)) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) continue;
    sections += `\n## ${meta.emoji} ${meta.label}\n`;
    for (const item of catItems) {
      const title = item.title_ko || item.title;
      sections += `- **[${title}](${item.url})** — ${item.summary_ko || item.summary_en || ''} \`[${item.source}]\` ⭐ ${item.score}\n`;
    }
  }

  return `# DevStory Daily — ${date}

> 수집 시각: ${hhmm} KST | 총 선별: ${items.length}개

## 🔥 Top 10

${top10}
${sections}
---

*Collected by DevStory Collector*
`;
}

// ── Main ──
function main() {
  const rootDir = resolve(import.meta.dirname, '..');
  const args = process.argv.slice(2);

  // Accept data dir as argument, or auto-detect from today's date
  let dataDir;
  if (args[0]) {
    dataDir = resolve(args[0]);
  } else {
    const d = new Date();
    const dir = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    dataDir = join(rootDir, 'data', dir);
  }

  const inputPath = join(dataDir, 'fetched-all.json');
  const input = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const items = input.items || input;

  console.log(`[dedup-score-save] Input: ${items.length} items`);

  // 1. Deduplicate
  const deduped = deduplicate(items);
  console.log(`[dedup-score-save] After dedup: ${deduped.length} items`);

  // 2. Score
  const scored = scoreItems(deduped);

  // 3. Diversity cap & select top N
  const final = applyDiversityCap(scored);
  console.log(`[dedup-score-save] Final: ${final.length} items`);

  // 4. Save raw.json
  const date = input.date || new Date().toISOString().slice(0, 10);
  const rawJson = {
    date,
    collected_at: new Date().toISOString(),
    items: final,
    meta: {
      total_collected: items.length,
      after_dedup: deduped.length,
      after_filter: final.length,
      sources_succeeded: [...new Set(final.map(i => i.source))],
      sources_failed: input.meta?.errors || [],
    },
  };

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'raw.json'), JSON.stringify(rawJson, null, 2));
  console.log(`[dedup-score-save] Saved raw.json`);

  // 5. Save latest.json
  const relPath = `data/${dataDir.split('/data/')[1]}/raw.json`;
  writeFileSync(join(rootDir, 'data', 'latest.json'), JSON.stringify({ path: relPath }));
  console.log(`[dedup-score-save] Saved latest.json`);

  // 6. Save summary.md
  const summary = generateSummary(date, final);
  writeFileSync(join(dataDir, 'summary.md'), summary);
  console.log(`[dedup-score-save] Saved summary.md`);
}

main();
