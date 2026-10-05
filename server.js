import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5174;
const ROOT = path.join(__dirname, 'src');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const YOUTUBE_CHANNEL_ID = 'UClDqjKjRnFNMHal7rsUbpGg';
const FALLBACK_VIDEO_ID = 'TrZwWx3-wMk';
let cachedVideo = {
  videoId: FALLBACK_VIDEO_ID,
  url: `https://www.youtube.com/watch?v=${FALLBACK_VIDEO_ID}`,
  title: 'Chesterfield Community Church of God',
  timestamp: 0
};

async function fetchLatestLiveVideo() {
  const now = Date.now();
  // Return cached result if less than 2 minutes old
  if (now - cachedVideo.timestamp < 120000 && cachedVideo.videoId) {
    return cachedVideo;
  }

  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const xml = await res.text();
      const idMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatches = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].map(m => m[1]);
      if (idMatch && idMatch[1]) {
        cachedVideo = {
          videoId: idMatch[1],
          url: `https://www.youtube.com/watch?v=${idMatch[1]}`,
          title: titleMatches[1] || titleMatches[0] || 'Chesterfield Community Church of God',
          timestamp: now
        };
        console.log(`[YouTube Live Sync] Latest live video resolved: ${cachedVideo.videoId} (${cachedVideo.title})`);
        return cachedVideo;
      }
    }
  } catch (err) {
    console.error('[YouTube Live Sync] Error fetching feed, using cached fallback:', err.message);
  }
  return cachedVideo;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Dynamic live video redirection: always points to the latest video/stream
  if (urlPath === '/watch-live' || urlPath === '/live') {
    fetchLatestLiveVideo().then((video) => {
      res.writeHead(302, {
        'Location': video.url,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end();
    }).catch(() => {
      res.writeHead(302, {
        'Location': `https://www.youtube.com/watch?v=${FALLBACK_VIDEO_ID}`
      });
      res.end();
    });
    return;
  }

  // API endpoint for client-side live video resolution
  if (urlPath === '/api/latest-live') {
    fetchLatestLiveVideo().then((video) => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(video));
    }).catch(() => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(cachedVideo));
    });
    return;
  }

  const safeUrlPath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, safeUrlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Chesterfield Migrated Site] Server live:`);
  console.log(` > Local:   http://localhost:${PORT}/`);
  console.log(` > Network: http://127.0.0.1:${PORT}/`);
  console.log(` > Watch Live Redirect: http://localhost:${PORT}/watch-live`);
});

export default server;
