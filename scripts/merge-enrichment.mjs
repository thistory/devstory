#!/usr/bin/env node
/**
 * merge-enrichment.mjs
 * Merges enrichment results (detail_ko, detail_en) back into raw.json.
 * Zero LLM tokens.
 *
 * Input:  data/YYYY/MM/DD/raw.json + data/YYYY/MM/DD/enrichment-output.json
 * Output: overwrites data/YYYY/MM/DD/raw.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

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
  const enrichPath = join(dataDir, 'enrichment-output.json');

  const raw = JSON.parse(readFileSync(rawPath, 'utf-8'));
  const enrichments = JSON.parse(readFileSync(enrichPath, 'utf-8'));

  // Build lookup by id
  const enrichMap = new Map();
  const enrichArray = Array.isArray(enrichments) ? enrichments : enrichments.items || [];
  for (const e of enrichArray) {
    if (e.id) enrichMap.set(e.id, e);
  }

  let merged = 0;
  for (const item of raw.items) {
    const e = enrichMap.get(item.id);
    if (e) {
      if (e.detail_ko) item.detail_ko = e.detail_ko;
      if (e.detail_en) item.detail_en = e.detail_en;
      merged++;
    }
  }

  writeFileSync(rawPath, JSON.stringify(raw, null, 2));
  console.log(`[merge-enrichment] Merged ${merged}/${raw.items.length} items into raw.json`);
}

main();
