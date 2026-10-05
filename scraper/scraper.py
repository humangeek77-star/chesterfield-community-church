#!/usr/bin/env python3
"""
Chesterfield Community Church of God - Site Migration Scraper
Extracts semantic content, metadata, navigation, text, and media assets
into structured JSON and local SEO-named image files.
"""

import os
import re
import sys
import json
import time
import hashlib
import logging
from urllib.parse import urljoin, urlparse, unquote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("SiteMigrationScraper")

# Constants
TARGET_URL = "https://www.chesterfieldcommunitychurch.org/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

# Directory Resolution
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets", "images")
DATA_DIR = os.path.join(BASE_DIR, "data")

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": TARGET_URL,
    "Connection": "keep-alive"
}

def sanitize_filename(name, fallback="image", ext=".jpg"):
    """Generates clean, SEO-friendly filenames from alt text or URLs."""
    if not name:
        name = fallback
    clean = re.sub(r'[^a-zA-Z0-9_-]', '-', name.lower())
    clean = re.sub(r'-+', '-', clean).strip('-')
    if not clean or len(clean) < 3:
        clean = f"{fallback}-{hashlib.md5(name.encode('utf-8')).hexdigest()[:6]}"
    if len(clean) > 60:
        clean = clean[:60].rstrip('-')
    return f"{clean}{ext}"

def fetch_url(url, is_binary=False):
    """Fetches URL with robust headers, timeouts, and error handling."""
    req = Request(url, headers=HEADERS)
    try:
        with urlopen(req, timeout=20) as response:
            if is_binary:
                return response.read(), response.headers.get_content_type()
            return response.read().decode('utf-8', errors='replace'), response.headers.get_content_type()
    except (HTTPError, URLError) as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return None, None
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return None, None

def download_image(img_url, alt_text=""):
    """Downloads an image and saves with SEO-friendly name in ASSETS_DIR."""
    # Normalize URL
    full_url = urljoin(TARGET_URL, img_url)
    parsed = urlparse(full_url)
    ext = os.path.splitext(parsed.path)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        ext = ".jpg"

    # Base candidate name on alt text or URL stem
    stem = ""
    if alt_text and len(alt_text.strip()) > 3:
        stem = alt_text.strip()
    else:
        path_stem = os.path.splitext(os.path.basename(parsed.path))[0]
        stem = unquote(path_stem)

    filename = sanitize_filename(stem, fallback="church-asset", ext=ext)
    local_path = os.path.join(ASSETS_DIR, filename)

    # Avoid duplicate file overwrite collisions
    counter = 1
    base_name, file_ext = os.path.splitext(filename)
    while os.path.exists(local_path):
        # Check if already identical download
        try:
            if os.path.getsize(local_path) > 0:
                pass
        except OSError:
            pass
        local_path = os.path.join(ASSETS_DIR, f"{base_name}-{counter}{file_ext}")
        filename = f"{base_name}-{counter}{file_ext}"
        counter += 1

    logger.info(f"Downloading asset: {full_url} -> {filename}")
    data, content_type = fetch_url(full_url, is_binary=True)
    if data:
        with open(local_path, "wb") as f:
            f.write(data)
        return {
            "original_url": full_url,
            "filename": filename,
            "local_path": f"/assets/images/{filename}",
            "absolute_path": local_path,
            "alt": alt_text,
            "size_bytes": len(data),
            "content_type": content_type
        }
    return None

def extract_meta(html):
    """Extracts title, meta tags, and open graph data."""
    meta = {}
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if title_match:
        meta['title'] = title_match.group(1).strip()
    
    # Meta tags
    for tag_match in re.finditer(r'<meta\s+([^>]+)>', html, re.IGNORECASE):
        tag_str = tag_match.group(1)
        name_match = re.search(r'(?:name|property)\s*=\s*["\']([^"\']+)["\']', tag_str, re.IGNORECASE)
        content_match = re.search(r'content\s*=\s*["\']([^"\']*)["\']', tag_str, re.IGNORECASE)
        if name_match and content_match:
            meta[name_match.group(1).lower()] = content_match.group(1).strip()
    return meta

def extract_links(html, current_url):
    """Discovers internal site navigation and page routes."""
    internal_links = set()
    parsed_base = urlparse(TARGET_URL)
    base_domain = parsed_base.netloc.lower()

    for match in re.finditer(r'<a\s+[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL):
        href = match.group(1).strip()
        link_text = re.sub(r'<[^>]+>', '', match.group(2)).strip()

        if href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue

        resolved = urljoin(current_url, href)
        parsed_res = urlparse(resolved)

        # Check internal domain
        if parsed_res.netloc.lower() in [base_domain, f"www.{base_domain.replace('www.', '')}"]:
            clean_url = f"{parsed_res.scheme}://{parsed_res.netloc}{parsed_res.path}"
            internal_links.add((clean_url, link_text))

    return internal_links

def extract_content(html):
    """Extracts structured text, headings, sections, and images from HTML."""
    sections = []
    images = []

    # Extract all images
    for img_match in re.finditer(r'<img\s+([^>]+)>', html, re.IGNORECASE):
        attrs = img_match.group(1)
        src_match = re.search(r'src\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
        alt_match = re.search(r'alt\s*=\s*["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        if src_match:
            src = src_match.group(1).strip()
            alt = alt_match.group(1).strip() if alt_match else ""
            images.append({"src": src, "alt": alt})

    # Extract headings and content blocks
    heading_patterns = re.findall(r'<(h[1-6])[^>]*>(.*?)</\1>', html, re.IGNORECASE | re.DOTALL)
    headings = [{"tag": tag.lower(), "text": re.sub(r'<[^>]+>', '', text).strip()} for tag, text in heading_patterns if text.strip()]

    # Extract paragraphs
    para_patterns = re.findall(r'<p[^>]*>(.*?)</p>', html, re.IGNORECASE | re.DOTALL)
    paragraphs = [re.sub(r'<[^>]+>', '', p).strip() for p in para_patterns if len(re.sub(r'<[^>]+>', '', p).strip()) > 10]

    return {
        "headings": headings,
        "paragraphs": paragraphs,
        "images": images
    }

def run_scraper():
    """Main crawler loop through target website."""
    logger.info("=" * 60)
    logger.info(f"Starting Scraper Execution for {TARGET_URL}")
    logger.info("=" * 60)

    visited_urls = set()
    to_visit = {TARGET_URL}
    site_pages = []
    asset_manifest = {}

    # Seed known church pages to ensure complete coverage
    known_routes = [
        "",
        "about-us",
        "mission-vision",
        "our-team-1",
        "ministries",
        "ministries_kids-youth",
        "outreach-and-missions",
        "worship-services-on-youtube",
        "contact-us",
        "church-directory",
        "prayer-ministry-requests",
        "volunteer-schedules",
        "pastoral-search",
        "event-connection-opportunities"
    ]
    for route in known_routes:
        to_visit.add(urljoin(TARGET_URL, route))

    while to_visit:
        url = to_visit.pop()
        if url in visited_urls:
            continue
        visited_urls.add(url)

        logger.info(f"Scraping page: {url} ({len(visited_urls)} visited, {len(to_visit)} remaining)")
        html, content_type = fetch_url(url)
        if not html:
            continue

        meta = extract_meta(html)
        content = extract_content(html)
        links = extract_links(html, url)

        # Download discovered images
        page_assets = []
        for img in content["images"]:
            img_src = img["src"]
            if img_src in asset_manifest:
                page_assets.append(asset_manifest[img_src])
            else:
                asset_info = download_image(img_src, img["alt"])
                if asset_info:
                    asset_manifest[img_src] = asset_info
                    page_assets.append(asset_info)

        # Record page data
        page_slug = urlparse(url).path.strip('/') or "home"
        site_pages.append({
            "url": url,
            "slug": page_slug,
            "meta": meta,
            "headings": content["headings"],
            "paragraphs": content["paragraphs"],
            "assets": page_assets
        })

        # Add newly discovered links
        for link_url, _ in links:
            if link_url not in visited_urls:
                to_visit.add(link_url)

        time.sleep(0.5)  # Respectful crawl delay

    # Save structured content
    content_output_path = os.path.join(DATA_DIR, "site_content.json")
    with open(content_output_path, "w", encoding="utf-8") as f:
        json.dump({"target_url": TARGET_URL, "pages": site_pages, "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")}, f, indent=2)
    logger.info(f"Saved structured content to: {content_output_path}")

    # Save asset manifest
    asset_manifest_path = os.path.join(DATA_DIR, "asset_manifest.json")
    with open(asset_manifest_path, "w", encoding="utf-8") as f:
        json.dump(list(asset_manifest.values()), f, indent=2)
    logger.info(f"Saved asset manifest to: {asset_manifest_path}")

    logger.info("=" * 60)
    logger.info(f"Scrape Complete! {len(site_pages)} pages extracted, {len(asset_manifest)} assets downloaded.")
    logger.info("=" * 60)

if __name__ == "__main__":
    run_scraper()
