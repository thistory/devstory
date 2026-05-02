#!/usr/bin/env node
/**
 * prefetch-urls.mjs
 * Pre-fetches article HTML for enrichment, so LLM agents don't need WebFetch.
 * Zero LLM tokens.
 *
 * Input:  data/YYYY/MM/DD/raw.json
 * Output: data/YYYY/MM/DD/prefetched-content.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const MAX_CHARS = 3000;
const FETCH_TIMEOUT = 12000;
const CONCURRENCY = 5;

function extractMainContent(html) {
  // Try to extract <article> or <main> content first
  for (const tag of ['article', 'main', '[role="main"]']) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const m = html.match(re);
    if (m) {
      html = m[1];
      break;
    }
  }

  // Strip script, style, nav, footer, header, aside
  html = html.replace(/<(script|style|nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Strip all remaining tags
  html = html.replace(/<[^>]*>/g, ' ');
  // Decode entities
  html = html
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  html = html.replace(/\s+/g, ' ').trim();

  return html.slice(0, MAX_CHARS);
}

async function fetchOne(item) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(item.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'devstory-bot/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return { id: item.id, url: item.url, text_content: extractMainContent(html) };
  } catch (e) {
    return { id: item.id, url: item.url, text_content: null, error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBatch(items) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(batch.map(fetchOne));
    for (const r of batchResults) {
      results.push(r.status === 'fulfilled' ? r.value : { id: 'unknown', text_content: null, error: r.reason?.message });
    }
  }
  return results;
}

function main() {
  const rootDir = resolve(import.meta.dirname, '..');
  const args = process.argv.slice(2);

  let dataDir;
  if (args[0]) {
    dataDir = resolve(args[0]);
  } else {
    const d = new Date();
    const dir = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    dataDir = join(rootDir, 'data', dir);
  }

  const rawPath = join(dataDir, 'raw.json');
  const raw = JSON.parse(readFileSync(rawPath, 'utf-8'));
  const items = raw.items || [];

  console.log(`[prefetch-urls] Fetching ${items.length} URLs...`);

  fetchBatch(items).then(results => {
    const succeeded = results.filter(r => r.text_content).length;
    const failed = results.filter(r => !r.text_content).length;

    writeFileSync(join(dataDir, 'prefetched-content.json'), JSON.stringify(results, null, 2));
    console.log(`[prefetch-urls] Done. Succeeded: ${succeeded}, Failed: ${failed}`);
    console.log(`[prefetch-urls] Saved → ${join(dataDir, 'prefetched-content.json')}`);
  });
}

main();
