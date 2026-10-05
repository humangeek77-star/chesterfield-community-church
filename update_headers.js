import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

const navLinks = [
  { href: 'index.html', label: 'Home' },
  { href: 'about.html', label: 'About Us' },
  { href: 'team.html', label: 'Our Team' },
  { href: 'ministries.html', label: 'Ministries' },
  { href: 'missions.html', label: 'Outreach & Missions' },
  { href: 'sermons.html', label: 'Worship Online' },
  { href: 'prayer.html', label: 'Prayer Requests' },
  { href: 'contact.html', label: 'Contact' }
];

function generateHeader(activeHref) {
  const desktopLinks = navLinks.map(link => {
    if (link.href === activeHref) {
      return `        <a href="${link.href}" class="px-3.5 py-2 text-sm font-bold text-amber-700 bg-amber-50 rounded-lg whitespace-nowrap">${link.label}</a>`;
    }
    return `        <a href="${link.href}" class="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-navy-950 hover:bg-slate-100 rounded-lg whitespace-nowrap transition-colors">${link.label}</a>`;
  }).join('\n');

  const mobileLinks = navLinks.map(link => {
    if (link.href === activeHref) {
      return `      <a href="${link.href}" class="block px-3 py-2 rounded-md text-base font-semibold bg-amber-50 text-amber-800">${link.label}</a>`;
    }
    return `      <a href="${link.href}" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">${link.label}</a>`;
  }).join('\n');

  return `  <!-- Primary Navigation -->
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
    <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
      <!-- Logo & Brand: Authentic Flame Icon + Crisp Church Name -->
      <a href="index.html" class="flex items-center gap-3.5 group flex-shrink-0">
        <img src="assets/images/flame-logo.png" alt="Chesterfield Community Church of God Flame Logo" class="h-11 sm:h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm"/>
        <div class="flex flex-col justify-center">
          <span class="font-serif text-lg sm:text-xl font-bold text-navy-950 leading-tight group-hover:text-amber-700 transition-colors tracking-tight">Chesterfield Community</span>
          <span class="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Church of God</span>
        </div>
      </a>

      <!-- Desktop Nav Links: Evenly Spaced & Clean -->
      <nav class="hidden lg:flex items-center gap-1 xl:gap-2">
${desktopLinks}
      </nav>

      <!-- Action Button -->
      <div class="hidden lg:flex items-center flex-shrink-0">
        <a href="sermons.html" class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm hover:shadow transition-all whitespace-nowrap">
          <span class="material-symbols-outlined text-base">play_circle</span> Watch Live
        </a>
      </div>

      <!-- Mobile Hamburger Button -->
      <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none" aria-label="Toggle navigation menu">
        <span class="material-symbols-outlined text-2xl">menu</span>
      </button>
    </div>

    <!-- Mobile Drawer Menu -->
    <div id="mobile-menu" class="hidden lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
${mobileLinks}
    </div>
  </header>`;
}

const pages = ['about.html', 'team.html', 'ministries.html', 'missions.html', 'sermons.html', 'prayer.html', 'contact.html'];

for (const page of pages) {
  const filePath = path.join(SRC_DIR, page);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');
  // Match from <header ...> to </header>
  const headerRegex = /<!-- Header -->\s*<header[\s\S]*?<\/header>/i;
  const newHeader = '<!-- Header -->\n' + generateHeader(page);

  if (headerRegex.test(content)) {
    content = content.replace(headerRegex, newHeader);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated header in ${page}`);
  } else {
    // Try matching <header ... </header>
    const bareHeaderRegex = /<header class="sticky top-0[\s\S]*?<\/header>/i;
    if (bareHeaderRegex.test(content)) {
      content = content.replace(bareHeaderRegex, generateHeader(page));
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated header in ${page} (bare regex)`);
    } else {
      console.warn(`Could not find header in ${page}`);
    }
  }
}
