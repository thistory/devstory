#!/usr/bin/env node
/**
 * fetch-structured.mjs
 * Fetches and parses all structured sources (RSS/Atom feeds + JSON APIs).
 * Zero LLM tokens — pure script.
 *
 * Output: data/YYYY/MM/DD/fetched-structured.json
 */

const MAX_PER_SOURCE = 20;
const HOURS_CUTOFF = 24;

// ── Helpers ──

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { y, m, dd, iso: `${y}-${m}-${dd}`, dir: `${y}/${m}/${dd}` };
}

function cutoffTime() {
  return Date.now() - HOURS_CUTOFF * 60 * 60 * 1000;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function safeFetch(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'devstory-bot/1.0' },
      ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ── RSS / Atom Parser ──

function parseRss(xml, sourceName, category) {
  const items = [];
  const cutoff = cutoffTime();

  // Try RSS <item> first, then Atom <entry>
  const isAtom = xml.includes('<feed') && !xml.includes('<rss');
  const tagOpen = isAtom ? '<entry>' : '<item>';
  const tagClose = isAtom ? '</entry>' : '</item>';

  let pos = 0;
  while (items.length < MAX_PER_SOURCE) {
    const start = xml.indexOf(tagOpen, pos);
    if (start === -1) break;
    const end = xml.indexOf(tagClose, start);
    if (end === -1) break;
    const block = xml.slice(start, end + tagClose.length);
    pos = end + tagClose.length;

    const title = extractTag(block, 'title');
    const link = isAtom ? extractAtomLink(block) : extractTag(block, 'link');
    const desc = extractTag(block, isAtom ? 'summary' : 'description')
      || extractTag(block, 'content');
    const dateStr = extractTag(block, isAtom ? 'updated' : 'pubDate')
      || extractTag(block, 'published')
      || extractTag(block, 'dc:date');

    if (!title || !link) continue;

    const pubDate = parseDate(dateStr);
    if (pubDate && pubDate.getTime() < cutoff) continue;

    items.push({
      id: `${sourceName}-${hashStr(link)}`,
      title: stripHtml(title),
      title_ko: null,
      summary_ko: null,
      summary_en: stripHtml(desc).slice(0, 500),
      url: link.trim(),
      source: sourceName,
      category,
      tags: null,
      score: 0,
      published_at: pubDate ? pubDate.toISOString() : null,
    });
  }
  return items;
}

function extractTag(xml, tag) {
  // Handle namespaced tags and CDATA
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function extractAtomLink(block) {
  // <link href="..." rel="alternate" />  or <link href="..."/>
  const m = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  return m ? m[1] : null;
}

// ── Source-Specific Fetchers ──

async function fetchHN() {
  const items = [];
  const cutoff = cutoffTime();
  try {
    const idsText = await safeFetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = JSON.parse(idsText).slice(0, MAX_PER_SOURCE);
    const details = await Promise.allSettled(
      ids.map(id => safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(JSON.parse))
    );
    for (const r of details) {
      if (r.status !== 'fulfilled') continue;
      const d = r.value;
      if (!d || !d.title) continue;
      const pubTime = (d.time || 0) * 1000;
      if (pubTime < cutoff) continue;
      items.push({
        id: `hacker_news-${d.id}`,
        title: d.title,
        title_ko: null,
        summary_ko: null,
        summary_en: '',
        url: d.url || `https://news.ycombinator.com/item?id=${d.id}`,
        source: 'hacker_news',
        category: 'news_blogs',
        tags: null,
        score: d.score || 0,
        published_at: new Date(pubTime).toISOString(),
      });
    }
  } catch (e) {
    return { items: [], error: { source: 'hacker_news', error: e.message } };
  }
  return { items };
}

async function fetchReddit(subreddit, sourceName) {
  const items = [];
  const cutoff = cutoffTime();
  try {
    const text = await safeFetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day`);
    const data = JSON.parse(text);
    const children = data?.data?.children || [];
    for (const child of children.slice(0, MAX_PER_SOURCE)) {
      const d = child.data;
      if (!d || !d.title) continue;
      const pubTime = (d.created_utc || 0) * 1000;
      if (pubTime < cutoff) continue;
      const url = d.is_self ? `https://www.reddit.com${d.permalink}` : d.url;
      items.push({
        id: `${sourceName}-${hashStr(url)}`,
        title: d.title,
        title_ko: null,
        summary_ko: null,
        summary_en: `${d.score} upvotes, ${d.num_comments} comments`,
        url,
        source: sourceName,
        category: 'community',
        tags: null,
        score: d.score || 0,
        published_at: new Date(pubTime).toISOString(),
      });
    }
  } catch (e) {
    return { items: [], error: { source: sourceName, error: e.message } };
  }
  return { items };
}

async function fetchRssSource(url, sourceName, category) {
  try {
    const xml = await safeFetch(url);
    return { items: parseRss(xml, sourceName, category) };
  } catch (e) {
    return { items: [], error: { source: sourceName, error: e.message } };
  }
}

// ── Main ──

const RSS_SOURCES = [
  // news_blogs
  { url: 'https://news.hada.io/rss', name: 'geeknews', category: 'news_blogs' },
  { url: 'https://techcrunch.com/feed/', name: 'techcrunch', category: 'news_blogs' },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'the_verge', category: 'news_blogs' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'ars_technica', category: 'news_blogs' },
  { url: 'https://dev.to/feed', name: 'devto', category: 'news_blogs' },
  // ai_research
  { url: 'https://rss.arxiv.org/rss/cs.AI', name: 'arxiv_ai', category: 'ai_research' },
  { url: 'https://rss.arxiv.org/rss/cs.LG', name: 'arxiv_lg', category: 'ai_research' },
  { url: 'https://rss.arxiv.org/rss/cs.CL', name: 'arxiv_cl', category: 'ai_research' },
  // github_oss
  { url: 'https://changelog.com/feed', name: 'changelog', category: 'github_oss' },
  // community
  { url: 'https://lobste.rs/rss', name: 'lobsters', category: 'community' },
  // eng_blogs
  { url: 'https://netflixtechblog.com/feed', name: 'netflix_tech', category: 'eng_blogs' },
  { url: 'https://eng.uber.com/feed/', name: 'uber_eng', category: 'eng_blogs' },
  { url: 'https://stripe.com/blog/feed.rss', name: 'stripe_blog', category: 'eng_blogs' },
  { url: 'https://vercel.com/atom', name: 'vercel_blog', category: 'eng_blogs' },
  { url: 'https://blog.cloudflare.com/rss/', name: 'cloudflare_blog', category: 'eng_blogs' },
  { url: 'https://engineering.fb.com/feed/', name: 'meta_eng', category: 'eng_blogs' },
];

const REDDIT_SOURCES = [
  { subreddit: 'programming', name: 'reddit_programming' },
  { subreddit: 'MachineLearning', name: 'reddit_ml' },
  { subreddit: 'ExperiencedDevs', name: 'reddit_experienceddevs' },
];

async function main() {
  const { dir, iso } = today();
  const fs = await import('node:fs');
  const path = await import('node:path');
  const rootDir = path.resolve(import.meta.dirname, '..');
  const outDir = path.join(rootDir, 'data', dir);

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[fetch-structured] Fetching structured sources for ${iso}...`);

  // Launch all fetches in parallel
  const fetches = [
    fetchHN(),
    ...RSS_SOURCES.map(s => fetchRssSource(s.url, s.name, s.category)),
    ...REDDIT_SOURCES.map(s => fetchReddit(s.subreddit, s.name)),
  ];

  const results = await Promise.allSettled(fetches);

  const allItems = [];
  const errors = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value.items);
      if (r.value.error) errors.push(r.value.error);
    } else {
      errors.push({ source: 'unknown', error: r.reason?.message || 'fetch failed' });
    }
  }

  const output = {
    date: iso,
    fetched_at: new Date().toISOString(),
    items: allItems,
    meta: {
      total: allItems.length,
      sources_succeeded: new Set(allItems.map(i => i.source)).size,
      sources_failed: errors.length,
      errors,
    },
  };

  const outPath = path.join(outDir, 'fetched-structured.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[fetch-structured] Saved ${allItems.length} items → ${outPath}`);
  if (errors.length > 0) {
    console.log(`[fetch-structured] Errors (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e.source}: ${e.error}`);
  }
}

main().catch(e => {
  console.error('[fetch-structured] Fatal:', e.message);
  process.exit(1);
});
