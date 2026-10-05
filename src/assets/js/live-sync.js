/**
 * Dynamic YouTube Live & Latest Service Sync
 * Automatically detects and links to the church's newest live stream or most recent service.
 */
(function () {
  const YOUTUBE_CHANNEL_ID = 'UClDqjKjRnFNMHal7rsUbpGg';
  const DEFAULT_FALLBACK_URL = 'https://www.youtube.com/watch?v=TrZwWx3-wMk';

  function updateLiveButtons(url, title) {
    if (!url) return;
    const buttons = document.querySelectorAll('[data-watch-live="true"], .watch-live-btn');
    buttons.forEach((btn) => {
      btn.href = url;
      if (title && title.trim()) {
        btn.setAttribute('title', `Watch Live / Latest Service: ${title.trim()} on YouTube`);
      }
    });
  }

  async function syncLatestLiveVideo() {
    // 1. Try local server endpoint first (fast, cached, zero CORS issues)
    try {
      const res = await fetch('/api/latest-live', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          updateLiveButtons(data.url, data.title);
          return;
        }
      }
    } catch (_) {
      // Continue to static fallback
    }

    // 2. Fallback to public RSS-to-JSON if deployed on a static host (GitHub Pages, Netlify, etc.)
    try {
      const feedUrl = encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.items && data.items.length > 0) {
          const latest = data.items[0];
          updateLiveButtons(latest.link, latest.title);
          return;
        }
      }
    } catch (_) {
      // Keep verified default
    }

    updateLiveButtons(DEFAULT_FALLBACK_URL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncLatestLiveVideo);
  } else {
    syncLatestLiveVideo();
  }
})();
