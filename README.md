# Latest Newspaper

An independent, education-first digital newspaper focused on useful news for students, families and educators.

## Editorial focus
- Education policy, schools, universities and learning
- Board examinations, entrance examinations, results and syllabus updates
- Admissions, scholarships, fellowships and student opportunities
- Science, research and education technology
- Important public announcements that directly affect students and education

## Architecture
- Responsive static frontend: `index.html`, `styles.css`, `index.js`
- News data: `data/news.json`
- Scheduled ingestion: GitHub Actions + Python standard library
- Feed registry: `config/sources.json`

## Hourly collection
GitHub Actions is scheduled at minute 17 of every hour (UTC). It checks only sources explicitly marked `"enabled": true`, filters to education-related categories, deduplicates links and updates `data/news.json`. The workflow can also be started manually from GitHub Actions.

All current sources remain disabled until their access and commercial-use terms are verified. Do not enable sources whose terms prohibit automated collection or commercial reuse. The collector must not bypass access controls, blocks or rate limits.

## Editorial and copyright policy
- Publish concise, independently written key-point summaries only when the underlying facts can be verified and the source's terms permit the intended collection and use.
- For major developments, create a fuller original report based on independently verified facts and primary announcements, not by synonym-swapping or rearranging a publisher's article.
- Attribute sources and link to original reporting or official announcements.
- Do not reproduce full articles, publisher photographs, graphics or distinctive article wording without permission.
- Clearly distinguish confirmed facts, developing information and uncertainty.
- Do not publish unverified claims as facts.

## Advertising inventory
The homepage contains clearly labelled commercial banner placeholders: a top leaderboard, an in-feed banner (shown after the third story when enough stories are available), and a lower-page responsive banner. These are placement areas only; no ad network or advertiser creative is connected yet. Replace the placeholders with approved advertiser creatives or a compliant ad-network integration. Keep advertisements visibly separate from editorial stories.

The existing `ads.txt` file is retained unchanged. Verify that its publisher account is controlled by the site owner and that its seller declaration is accurate before monetisation.

## Deployment
The project is static and can be deployed on Vercel, Netlify or GitHub Pages. Enable GitHub Actions in repository settings. The hourly workflow requires Actions write permission to commit `data/news.json`.

## Local preview
Open `index.html` through a local static server. Browser fetch requests may be blocked when opening the file directly with `file://`.
