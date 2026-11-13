# Latest Newspaper

An independent, education-first digital newspaper focused on useful news for students, families and educators.

## Reader experience
- The homepage displays a short, independently written summary for each story.
- Selecting a headline opens `article.html?id=...` on Latest Newspaper itself.
- Detailed reports are stored in `data/news.json`; readers are not redirected to publisher websites.
- Publisher names are shown as attribution, while the original publisher URL is retained as an editorial source record and is not used as the story-card destination.

## Editorial focus
Education policy, schools, universities, board and entrance examinations, results, admissions, scholarships, science, research, education technology and student opportunities.

## Hourly news bot
GitHub Actions runs the collector at minute 17 of every hour (UTC), and can also be started manually. The bot:
1. Reads only RSS/Atom feeds explicitly enabled in `config/sources.json`.
2. Requires each source to be explicitly cleared for commercial use (`commercial_use_permitted: true)); disabled or uncleared sources are skipped.
3. Uses the permitted feed metadata only. It does not scrape arbitrary webpages, bypass access controls, or copy publisher articles.
4. Calls Gemini to produce a fresh headline, short homepage summary and concise internal report using only permitted feed metadata. The bot skips previously published IDs, ignores items older than 30 days, and limits each run to eight new reports.
5. Deduplicates stories and commits the updated edition to `data/news.json`.

### Required setup
- Add a GitHub Actions repository secret named `GEMINI_API_KEY` containing a valid Gemini API key. Never put the key in frontend JavaScript, source files or commits.
- Optionally set the `GEMINI_MODEL` environment variable in the workflow to a model available to your API key.
- The Press Information Bureau feed is enabled for PIB-originated text/feed metadata only. PIB's published copyright policy permits free reproduction without prior approval, subject to accurate presentation, prominent attribution and exclusion of third-party material. Other publisher feeds remain disabled pending permission. The collector does not download images or attachments.
- Enable GitHub Actions and allow the workflow to write repository contents.

The currently enabled source is the PIB RSS feed. The bot does not guarantee a new story every hour: it publishes only when a permitted feed has a new education-related item and Gemini successfully creates a report. If no qualifying story is found, the previous edition is retained.

## Editorial and copyright policy
- Do not scrape "any website" indiscriminately. Follow each source's terms, robots/access restrictions, rate limits and licence.
- Do not treat paraphrasing or synonym replacement as permission to republish protected reporting.
- Create original reports from verifiable facts and permitted source metadata; do not reproduce article text, photos, graphics or distinctive wording without permission.
- Attribute the publisher and keep the source URL as an editorial record. Do not make the source URL the reader-facing article destination.
- Do not publish unsupported claims. Thin feed metadata must produce a short, cautious report rather than invented detail.

## Advertising inventory
The homepage contains clearly labelled commercial banner placeholders. No advertiser creative or ad-network integration is connected yet. Keep advertisements visibly separate from editorial content. Verify the existing `ads.txt` seller declaration before monetisation.

## Deployment
The project is a static frontend and can be deployed on Vercel, Netlify or GitHub Pages. The GitHub Actions workflow updates the JSON data file in the repository; the hosting platform must redeploy or serve the updated repository content for readers to see each edition.
