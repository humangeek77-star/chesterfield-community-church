/**
 * Chesterfield Community Church of God - Site Migration Scraper (Node.js Engine)
 * Pure Node.js runtime alternative equipped with native fetch, asset downloader,
 * and structured JSON export into /data and /assets/images.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.dirname(__dirname);
const ASSETS_DIR = path.join(BASE_DIR, 'assets', 'images');
const DATA_DIR = path.join(BASE_DIR, 'data');

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const TARGET_URL = 'https://www.chesterfieldcommunitychurch.org/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': TARGET_URL
};

function sanitizeFilename(name, fallback = 'church-asset', ext = '.jpg') {
  if (!name) name = fallback;
  let clean = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!clean || clean.length < 3) {
    clean = `${fallback}-${Math.random().toString(36).substring(2, 8)}`;
  }
  if (clean.length > 55) {
    clean = clean.substring(0, 55).replace(/-$/, '');
  }
  return `${clean}${ext}`;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`[HTTP ${res.status}] Failed to fetch ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`[Error] Fetching ${url}:`, err.message);
    return null;
  }
}

async function downloadAsset(imgUrl, altText = '') {
  try {
    const fullUrl = new URL(imgUrl, TARGET_URL).href;
    const parsed = new URL(fullUrl);
    let ext = path.extname(parsed.pathname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
      ext = '.jpg';
    }

    const stem = altText.trim().length > 3 ? altText.trim() : path.basename(parsed.pathname, ext);
    let filename = sanitizeFilename(stem, 'church-asset', ext);
    let localPath = path.join(ASSETS_DIR, filename);

    let counter = 1;
    const parsedName = path.parse(filename);
    while (fs.existsSync(localPath)) {
      filename = `${parsedName.name}-${counter}${parsedName.ext}`;
      localPath = path.join(ASSETS_DIR, filename);
      counter++;
    }

    console.log(`[Asset Download] ${fullUrl} -> ${filename}`);
    const res = await fetch(fullUrl, { headers: HEADERS });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buffer);

    return {
      original_url: fullUrl,
      filename,
      local_path: `/assets/images/${filename}`,
      absolute_path: localPath,
      alt: altText,
      size_bytes: buffer.length,
      content_type: res.headers.get('content-type')
    };
  } catch (err) {
    console.error(`[Asset Error] ${imgUrl}:`, err.message);
    return null;
  }
}

export async function runScraper() {
  console.log('======================================================');
  console.log(`Starting Scraper Engine for: ${TARGET_URL}`);
  console.log('======================================================');

  const visitedUrls = new Set();
  const toVisit = new Set([
    TARGET_URL,
    new URL('about-us', TARGET_URL).href,
    new URL('mission-vision', TARGET_URL).href,
    new URL('our-team-1', TARGET_URL).href,
    new URL('ministries', TARGET_URL).href,
    new URL('ministries_kids-youth', TARGET_URL).href,
    new URL('outreach-and-missions', TARGET_URL).href,
    new URL('worship-services-on-youtube', TARGET_URL).href,
    new URL('contact-us', TARGET_URL).href,
    new URL('church-directory', TARGET_URL).href,
    new URL('prayer-ministry-requests', TARGET_URL).href,
    new URL('volunteer-schedules', TARGET_URL).href,
    new URL('pastoral-search', TARGET_URL).href,
    new URL('event-connection-opportunities', TARGET_URL).href
  ]);

  const sitePages = [];
  const assetManifest = {};

  while (toVisit.size > 0) {
    const url = toVisit.values().next().value;
    toVisit.delete(url);

    if (visitedUrls.has(url)) continue;
    visitedUrls.add(url);

    console.log(`[Scraping Page] ${url} (${visitedUrls.size} visited)`);
    const html = await fetchPage(url);
    if (!html) continue;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Chesterfield Community Church';

    // Extract headings
    const headings = [];
    const headingMatches = html.matchAll(/<(h[1-6])[^>]*>(.*?)<\/\1>/gis);
    for (const match of headingMatches) {
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) headings.push({ tag: match[1].toLowerCase(), text });
    }

    // Extract paragraphs
    const paragraphs = [];
    const paraMatches = html.matchAll(/<p[^>]*>(.*?)<\/p>/gis);
    for (const match of paraMatches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 10) paragraphs.push(text);
    }

    // Extract images
    const pageAssets = [];
    const imgMatches = html.matchAll(/<img\s+([^>]+)>/gis);
    for (const match of imgMatches) {
      const attrs = match[1];
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      if (srcMatch) {
        const src = srcMatch[1].trim();
        const alt = altMatch ? altMatch[1].trim() : '';

        if (assetManifest[src]) {
          pageAssets.push(assetManifest[src]);
        } else {
          const assetInfo = await downloadAsset(src, alt);
          if (assetInfo) {
            assetManifest[src] = assetInfo;
            pageAssets.push(assetInfo);
          }
        }
      }
    }

    const pageSlug = new URL(url).pathname.replace(/^\/|\/$/g, '') || 'home';
    sitePages.push({
      url,
      slug: pageSlug,
      title,
      headings,
      paragraphs,
      assets: pageAssets
    });
  }

  // Write site_content.json
  const contentPath = path.join(DATA_DIR, 'site_content.json');
  fs.writeFileSync(contentPath, JSON.stringify({
    target_url: TARGET_URL,
    total_pages: sitePages.length,
    pages: sitePages,
    scraped_at: new Date().toISOString()
  }, null, 2));

  // Write asset_manifest.json
  const manifestPath = path.join(DATA_DIR, 'asset_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(Object.values(assetManifest), null, 2));

  console.log('======================================================');
  console.log(`Scrape Complete! Output saved to:`);
  console.log(` - Content: ${contentPath}`);
  console.log(` - Assets:  ${manifestPath}`);
  console.log('======================================================');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScraper();
}
