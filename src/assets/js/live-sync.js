/**
 * Dynamic YouTube Live & Latest Service Sync
 * Automatically detects and links to the church's newest live stream or most recent service.
 * Automatically synchronizes the recent sermons & series archive as new services are uploaded weekly.
 */
(function () {
  const YOUTUBE_CHANNEL_ID = 'UClDqjKjRnFNMHal7rsUbpGg';
  const YOUTUBE_LIVE_URL = 'https://www.youtube.com/@ChesterfieldCommunityChu-ye6vh/streams';

  function updateLiveButtons(url) {
    const targetUrl = url || YOUTUBE_LIVE_URL;
    const buttons = document.querySelectorAll('[data-watch-live="true"], .watch-live-btn');
    buttons.forEach((btn) => {
      btn.href = targetUrl;
      btn.setAttribute('title', 'Watch Chesterfield Community Church of God Live on YouTube');
    });
  }

  async function syncLatestLiveVideo() {
    updateLiveButtons(YOUTUBE_LIVE_URL);
  }

  function parseItemFallback(item) {
    const rawLink = item.link || '';
    const idMatch = rawLink.match(/[?&]v=([^&]+)/) || (item.guid || '').match(/yt:video:([^&]+)/);
    const videoId = idMatch ? idMatch[1] : '';
    if (!videoId) return null;

    const rawTitle = item.title || '';
    const rawDesc = item.description || '';
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

    const d = new Date(item.pubDate || item.published);
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
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  function renderRecentVideoCards(container, videos) {
    if (!container || !videos || videos.length === 0) return;
    
    // Take the top 4 most recent videos
    const displayVideos = videos.slice(0, 4);

    const html = displayVideos.map((v) => `
      <div class="bg-linen rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group" data-video-id="${v.videoId}">
        <div>
          <a href="${v.url}" target="_blank" rel="noopener" class="block h-48 overflow-hidden bg-slate-900 relative" title="Watch '${v.title}' on YouTube">
            <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='assets/images/church-building.jpg'"/>
            <div class="absolute inset-0 bg-navy-950/20 group-hover:bg-navy-950/40 transition-colors flex items-center justify-center">
              <span class="size-12 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-2xl ml-0.5">play_arrow</span>
              </span>
            </div>
            <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-600 text-white shadow-sm">${v.series || 'Sunday Service'}</span>
          </a>
          <div class="p-5 space-y-2">
            <h3 class="font-serif font-bold text-lg text-navy-900 group-hover:text-amber-700 transition-colors">
              <a href="${v.url}" target="_blank" rel="noopener">${v.title}</a>
            </h3>
            <p class="text-[11px] font-bold text-amber-700 uppercase tracking-wider">${v.scripture ? v.scripture + ' &bull; ' : ''}${v.speaker}</p>
            <p class="text-xs text-slate-600 leading-relaxed">
              ${v.summary || (v.date ? 'Recorded on ' + v.date + ' at Chesterfield Community Church of God.' : 'Sunday service broadcast from Chesterfield Community Church of God.')}
            </p>
          </div>
        </div>
        <div class="p-5 pt-0">
          <a href="${v.url}" target="_blank" rel="noopener" class="text-xs font-bold text-navy-900 hover:text-amber-700 flex items-center gap-1 pt-3 border-t border-slate-200">
            <span>Watch Service</span> &rarr;
          </a>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  async function syncRecentVideos() {
    const container = document.getElementById('recent-videos-grid');
    if (!container) return;

    // 1. Try local server API
    try {
      const res = await fetch('/api/recent-videos', { cache: 'no-cache' });
      if (res.ok) {
        const videos = await res.json();
        if (Array.isArray(videos) && videos.length > 0) {
          const firstExistingId = container.querySelector('[data-video-id]')?.getAttribute('data-video-id');
          // Update if first video ID changed (a new sermon was added) or if container is empty
          if (!firstExistingId || firstExistingId !== videos[0].videoId) {
            renderRecentVideoCards(container, videos);
          }
          return;
        }
      }
    } catch (_) {
      // Continue to fallback
    }

    // 2. Fallback to public RSS-to-JSON for static environments
    try {
      const feedUrl = encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.items && data.items.length > 0) {
          const parsed = data.items.map(parseItemFallback).filter(Boolean);
          if (parsed.length > 0) {
            const firstExistingId = container.querySelector('[data-video-id]')?.getAttribute('data-video-id');
            if (!firstExistingId || firstExistingId !== parsed[0].videoId) {
              renderRecentVideoCards(container, parsed);
            }
          }
        }
      }
    } catch (_) {
      // Keep static pre-rendered cards
    }
  }

  function init() {
    syncLatestLiveVideo();
    syncRecentVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
