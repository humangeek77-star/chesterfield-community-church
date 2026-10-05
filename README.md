# Chesterfield Community Church of God — Site Migration Project

## 1. Project Directory Architecture

This workspace hosts the full-site migration from the legacy JouwWeb site (`https://www.chesterfieldcommunitychurch.org/`) to a modern, high-performance website.

```
chesterfield-migration/
├── scraper/
│   ├── scraper.py             # Python scraper using requests & regex/bs4
│   └── scraper.js             # Node.js scraper engine (zero-dependency runner)
├── assets/
│   └── images/                # Local destination for 46 downloaded original photos & logos
├── data/
│   ├── site_content.json      # Complete scraped page copy, headings, and metadata
│   └── asset_manifest.json    # Source URL -> local path & SEO slug mapping
├── src/                       # Modern target website codebase
│   ├── index.html             # Homepage (Hero, Welcome, Service Times, Event Previews)
│   ├── about.html             # About Us, Statement of Faith, Mission & Vision
│   ├── team.html              # Pastoral & Support Staff (Jerry Grubbs, Becky Fauntleroy, etc.)
│   ├── ministries.html        # Discovery Kids, Nursery, Bible Studies, Fellowships
│   ├── missions.html          # Food Pantry, Benevolence, Indiana Ministries, Global Missions
│   ├── sermons.html           # Worship Services on YouTube & Weekly Livestream details
│   ├── prayer.html            # Prayer Ministry & Interactive Online Prayer Request Form
│   ├── contact.html           # Campus Location (123 Linden Lane), Hours, & Contact Form
│   └── assets/images/         # Optimized, self-contained image assets
├── server.js                  # Zero-dependency local preview server
├── package.json               # Scripts for scraping and running the server
└── README.md                  # Project documentation and asset mapping
```

---

## 2. Scraping & Asset Mapping Results

- **Source Target**: `https://www.chesterfieldcommunitychurch.org/`
- **Total Pages Scraped**: 13 internal routes
- **Total Assets Extracted**: 46 original image and logo files (7.5 MB)
- **Primary Leadership Mapped**:
  - `Rev. Dr. Jerry Grubbs` (Interim Pastor) &rarr; `assets/images/0-high.png`
  - `Rev. Becky Fauntleroy` (Associate Pastor - Pastoral Care) &rarr; `assets/images/becky-1-cropped-high.jpg`
  - `Rev. Dr. Lisa Moore` (Worship Pastor) &rarr; `assets/images/image-high-sqbbn9.png`
  - `Susan Blower` (Children's Director) &rarr; `assets/images/image-high-xzjlrf.png`
  - `Amy Greenwalt` (Nursery Attendant) &rarr; `assets/images/photoroom-20241011_174347-2-high-1v2i9a.png`
  - `Shelly Siek` (Office Administrator) &rarr; `assets/images/image-high-ipdk3h.png`
  - `Marvin Ginn` (Facilities Manager) &rarr; `assets/images/marvin-ginn-high.jpg`
- **Church Identity**:
  - Logo &rarr; `assets/images/chesterfield-community-church-of-god.png`
  - Sanctuary Stained Glass Cross &rarr; `assets/images/cross-straighhted-cropped-jjpg-high-2hjh9n.jpg`
  - Campus Building &rarr; `assets/images/picture-of-church-edited-without-logo-and-name-copy-hig.jpg`

---

## 3. Real Church Schedule & Contact Details

- **Address**: 123 Linden Lane, Chesterfield, IN 46017 (Corner of Main & Linden)
- **Phone**: (765) 378-7685
- **Email**: chesterfieldcommunitycog@gmail.com
- **Sunday Services**:
  - 9:30 AM: Small Group Bible Study (All Ages)
  - 10:30 AM: Worship Service & Preaching (In-person & YouTube Livestream)
  - Staffed Nursery & Discovery Kids provided during morning worship
- **Online Worship Hub**:
  - YouTube Channel: [@ChesterfieldCommunityChu-ye6vh](https://www.youtube.com/@ChesterfieldCommunityChu-ye6vh) (240+ subscribers, 190+ services)
  - Live broadcast every Sunday at 10:30 AM EST
  - Interactive theater player, sermon series archives, and companion notes on `/sermons.html`
- **Church Office Hours**:
  - Monday &ndash; Wednesday: 9:00 AM &ndash; 1:00 PM
  - Thursday: 9:00 AM &ndash; 12:00 PM

---

## 4. How to Run the Website

Start the local server:
```bash
node server.js
```
Open your browser to:
- Home: [http://localhost:5174/](http://localhost:5174/)
- Worship Online: [http://localhost:5174/sermons.html](http://localhost:5174/sermons.html)
