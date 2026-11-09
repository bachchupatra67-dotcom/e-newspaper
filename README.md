# Latest Newspaper

A clean, education-first digital newspaper. This is a fresh implementation; the previous site's application code is not used.

## Architecture
- Responsive static frontend: `index.html`, `styles.css`, `index.js`
- News data: `data/news.json`
- Hourly ingestion: GitHub Actions + Python standard library
- Feed registry: `config/sources.json`
- No paid news API keys required.

## Hourly collection
GitHub Actions runs at minute 17 of every hour (UTC). It fetches only feeds marked `"enabled": true`, stores headline/date/source/original URL, deduplicates by URL, and commits the updated JSON file. If every source fails, the last successful edition is retained.

Manual run: GitHub → Actions → Hourly news collection → Run workflow.

## Publisher licensing gate — important for monetisation
The six requested publishers are listed in `config/sources.json`, but their feeds are disabled until written commercial permission/licensing is obtained:
- Times of India RSS terms restrict commercial aggregation and advertising use.
- The Hindu terms restrict automated collection and commercial/public reuse without consent.
- Indian Express RSS terms specify personal, non-commercial use.
- BBC requires permission/licensing for business RSS and metadata use.
- NDTV RSS terms specify personal, non-commercial use.
- Reuters no longer provides its former public RSS feeds; do not scrape around that restriction.

Do not enable any feed until its commercial licence/permission is secured or its terms clearly permit the planned commercial use. The collector intentionally does not evade 403/429 responses or access controls.

## Editorial and content policy
- This first edition is link-first: headline, date, source and link to the original institution/publisher.
- No full articles, publisher images, copied article text or generated rewrites of publisher content are stored.
- All feeds, including the Press Information Bureau feed, are disabled until commercial display/reuse terms are confirmed. Link-first display is not itself a licence.
- Add original explainers, exam guides, scholarship explainers and study resources as separately authored editorial content.
- Do not imply endorsement or affiliation by any source.

## StudiesSupport promotion
The homepage includes a student-focused StudiesSupport link at `https://studiessupport.in`. Confirm this destination before public launch if the domain changes.

## Deployment
The project is static and can be deployed on Vercel, Netlify or GitHub Pages. Enable GitHub Actions in repository settings. The hourly workflow needs Actions write permission to commit `data/news.json`.

## Local preview
Open `index.html` through a local static server. Browser fetch requests may be blocked when opening the file directly with `file://`.
