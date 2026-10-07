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

const FALLBACK_SERMONS = [
  {
    videoId: 'L6X0lAQVedQ',
    title: 'The Power of One Life',
    speaker: 'Pastor Kirk Bookout',
    scripture: '',
    series: 'Sunday Message',
    date: 'Oct 4, 2026',
    summary: 'Interim Pastor Kirk Bookout shares an inspiring message on how God works through each individual believer to bring hope and light to our community.',
    thumbnail: 'https://i.ytimg.com/vi/L6X0lAQVedQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=L6X0lAQVedQ'
  },
  {
    videoId: 'TrZwWx3-wMk',
    title: 'The Faith of the Founding Fathers',
    speaker: 'Gary Varvel (Guest Speaker)',
    scripture: '',
    series: 'Special Guest',
    date: 'Oct 4, 2026',
    summary: 'Nationally syndicated cartoonist and inspirational speaker Gary Varvel explores the deep spiritual foundation and biblical faith of America\'s founders.',
    thumbnail: 'https://i.ytimg.com/vi/TrZwWx3-wMk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=TrZwWx3-wMk'
  },
  {
    videoId: '4s8OzpjaVgk',
    title: 'Living in the Midst',
    speaker: 'Dr. Jerry Grubbs',
    scripture: 'James 4:13–17',
    series: 'James Series',
    date: 'Sep 28, 2026',
    summary: 'Discovering how to surrender our future ambitions to God\'s will and walk in humility amid life\'s uncertainties.',
    thumbnail: 'https://i.ytimg.com/vi/4s8OzpjaVgk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=4s8OzpjaVgk'
  },
  {
    videoId: 'pdHGVr1NG7U',
    title: 'It\'s a Long Way from Here to There',
    speaker: 'Dr. Jerry Grubbs',
    scripture: 'Genesis 12:1–9',
    series: 'Genesis Series',
    date: 'Sep 21, 2026',
    summary: 'Reflecting on Abraham\'s call to step out in obedience and trust God even when the final destination is still unseen.',
    thumbnail: 'https://i.ytimg.com/vi/pdHGVr1NG7U/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=pdHGVr1NG7U'
  }
];

let cachedRecentVideos = {
  videos: FALLBACK_SERMONS,
  timestamp: 0
};

function parseSermonsFromXml(xml) {
  const entries = xml.split('<entry>').slice(1);
  const results = entries.map(entry => {
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
    const rawTitle = (entry.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    const rawDesc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';

    const cleanDesc = rawDesc.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const cleanTitle = rawTitle.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

    let title = cleanTitle;
    let speaker = 'Chesterfield Ministry';
    let scripture = '';
    let series = 'Sunday Service';

    const lines = cleanDesc.split('\n').map(l => l.trim()).filter(Boolean);
    const detailLine = lines.find(l => !l.toLowerCase().includes('chesterfield community church')) || lines[0] || '';

    const scripMatch = detailLine.match(/((?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+\d+[:\s\d\-–]+(?:\s*\([A-Z]+\))?)/i);
    if (scripMatch) {
      scripture = scripMatch[1].trim();
    }

    const quoteMatch = detailLine.match(/"([^"]+)"/);
    if (quoteMatch) {
      title = quoteMatch[1];
    } else {
      const withSplit = detailLine.split(/\s+(?:with|With)\s+/i);
      if (withSplit.length > 1) {
        let firstPart = withSplit[0].trim();
        if (scripture) {
          firstPart = firstPart.replace(scripture, '').trim();
        }
        title = firstPart || title;
      }
    }

    const speakerMatch = detailLine.match(/(?:with|With)\s+(?:guest speaker\s+)?((?:Pastor|Dr\.|Reverend|Rev\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (speakerMatch) {
      let sp = speakerMatch[1].trim();
      if (scripture) {
        const bookName = scripture.split(/\s+\d+/)[0];
        if (sp.endsWith(bookName)) {
          sp = sp.slice(0, -bookName.length).trim();
        }
      }
      if (detailLine.toLowerCase().includes('guest speaker') && !sp.toLowerCase().includes('guest')) {
        sp += ' (Guest Speaker)';
      }
      speaker = sp;
    }

    title = title.replace(/^["'\s\-–\.]+|["'\s\-–\.]+$/g, '');
    if (!title || title.toLowerCase().includes('chesterfield community')) {
      title = 'Sunday Morning Worship';
    }

    const textToScan = (title + ' ' + scripture + ' ' + detailLine).toLowerCase();
    if (textToScan.includes('james')) series = 'James Series';
    else if (textToScan.includes('genesis')) series = 'Genesis Series';
    else if (textToScan.includes('communion') || textToScan.includes('bread that unites')) series = 'Communion';
    else if (textToScan.includes('founding fathers') || textToScan.includes('gary varvel') || textToScan.includes('guest speaker')) series = 'Special Guest';
    else if (textToScan.includes('romans')) series = 'Romans Series';
    else if (textToScan.includes('luke')) series = 'Gospel of Luke';
    else if (speaker.includes('Bookout')) series = 'Sunday Message';

    const d = new Date(published);
    const dateFormatted = isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let summary = '';
    if (scripture && speaker) {
      summary = `Worship service and message from ${scripture} presented by ${speaker} at Chesterfield Community Church of God.`;
    } else if (speaker) {
      summary = `Sunday message presented by ${speaker} at Chesterfield Community Church of God.`;
    } else {
      summary = `Sunday morning worship service and message at Chesterfield Community Church of God.`;
    }

    return {
      videoId,
      title,
      speaker,
      scripture,
      series,
      date: dateFormatted,
      summary,
      published,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  });

  return results.filter(r => Boolean(r.videoId));
}

async function fetchRecentVideos() {
  const now = Date.now();
  if (now - cachedRecentVideos.timestamp < 600000 && cachedRecentVideos.videos.length > 0) {
    return cachedRecentVideos.videos;
  }

  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const xml = await res.text();
      const parsed = parseSermonsFromXml(xml);
      if (parsed.length > 0) {
        cachedRecentVideos = {
          videos: parsed.slice(0, 8),
          timestamp: now
        };
        console.log(`[YouTube Feed Sync] Parsed ${cachedRecentVideos.videos.length} recent sermon videos.`);
        return cachedRecentVideos.videos;
      }
    }
  } catch (err) {
    console.error('[YouTube Feed Sync] Error fetching recent videos feed:', err.message);
  }
  return cachedRecentVideos.videos;
}

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

  // Dynamic live video redirection: always points to the YouTube Live stream tab
  if (urlPath === '/watch-live' || urlPath === '/live') {
    res.writeHead(302, {
      'Location': 'https://www.youtube.com/@ChesterfieldCommunityChu-ye6vh/streams',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end();
    return;
  }

  // Instant Church Directory redirection
  if (urlPath === '/directory' || urlPath === '/church-directory' || urlPath === '/instantchurchdirectory') {
    res.writeHead(302, {
      'Location': 'https://www.instantchurchdirectory.com/',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end();
    return;
  }

  // API endpoint for client-side live video resolution
  if (urlPath === '/api/latest-live') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({
      url: 'https://www.youtube.com/@ChesterfieldCommunityChu-ye6vh/streams',
      title: 'Chesterfield Community Church of God Live'
    }));
    return;
  }

  // API endpoint for recent sermon messages feed
  if (urlPath === '/api/recent-videos') {
    fetchRecentVideos().then((videos) => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(videos));
    }).catch(() => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(FALLBACK_SERMONS));
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
