# frontier_ai

A single-page, filterable map of the AI ecosystem: who is building what across nine
categories, from frontier labs to open-weight models. It is a plain static site with no
framework and no build step. The entire UI is rendered from one data file, so keeping it
current is a data edit, not a code change.

- **Three views** of one product catalog: **Categories** (nine branches), **Companies** (every company opens into its full product line), and an interactive **Graph** (force-directed) that clusters products by category with faint company links.
- **Availability status** on every product (live, preview, beta, research, waitlist, announced, deprecated), so things not yet fully released are visible at a glance.
- **Filters**: multi-select category chips, an All / US / China / Europe region control, and a product/company/model/status search, plus reset and a live total.
- **Theme toggle** (system / light / dark, remembered) plus self-contained CSS with embedded fonts, no external resources.
- Each product opens its official site, shows its version and last-verified date, and is flagged stale after 90 days.

## Quick start

It is a static site, so there is nothing to install.

- **Open it directly**: double-click `index.html` (or drag it into a browser). The data
  lives in `data/ecosystem.js` as a plain script, so it works offline with no server.
- **Or serve it locally** (closer to how it deploys):

  ```sh
  python3 -m http.server 8000
  ```

  then open <http://localhost:8000>.

## Data model

`data/ecosystem.js` is the single source of truth: a flat `window.ECOSYSTEM` array of
**products**, each tagged with the company (`org`) that makes it.

```js
{
  name: "Claude",
  org: "Anthropic",        // the company / lab
  category: "frontier",    // frontier | search | coding | image | video | audio | agents | infra | open
  region: "us",            // us | china | europe   (the org's primary base)
  access: "closed",        // closed | open | mixed
  status: "ga",            // ga | preview | beta | research | waitlist | announced | deprecated
  version: "Opus 4.8",     // current model or version (or "")
  blurb: "Safety-focused assistant family (Opus, Sonnet, Haiku) used via apps and API.",
  url: "https://claude.ai",
  orgUrl: "https://www.anthropic.com",
  lastVerified: "2026-06-05" // YYYY-MM-DD; products older than 90 days are flagged stale
}
```

Every view derives from this array: the Categories grid groups by `category`, the Companies
view groups by `org`, and the Graph links products to category and company hubs. Add a
product by appending an object; no other file needs to change.

## Keeping it current

1. **Edit the data.** Update `version` / `status` / `blurb`, bump `lastVerified`, add or remove products.
2. **Use the refresh prompt.** [`REFRESH.md`](REFRESH.md) contains a ready-to-run prompt for a
   [Claude Code](https://www.anthropic.com/claude-code) session that web-searches every entry,
   updates the data, and opens a pull request with the diff.
3. **Monthly reminder.** [`.github/workflows/review.yml`](.github/workflows/review.yml) opens a
   "Monthly AI ecosystem review" checklist issue on the first of each month (and on demand from
   the Actions tab).

### Optional: fully automated refresh PRs

You can wire up the **Claude Code GitHub Action** so the monthly issue (or a mention/label) triggers
Claude to run `REFRESH.md` and open the pull request on its own, no local session needed. Setup and
the current configuration options are in the official docs:
<https://docs.claude.com/en/docs/claude-code/github-actions>. (Linking the docs rather than pinning
specific flags here, since they evolve.)

## Deploy

The site is static and lives at the repository root, so it deploys as-is.

### Cloudflare Pages

1. Push this repo to GitHub (see below).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset**: `None`
   - **Build command**: leave empty
   - **Build output directory**: `/` (the repository root)
4. **Save and Deploy.** Every push to the default branch redeploys automatically.

### GitHub Pages (alternative)

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. Choose your default branch and the **`/ (root)`** folder, then **Save**.
4. The site publishes at `https://<user>.github.io/<repo>/` within a minute or two.

## Project structure

```
frontier_ai/
├── index.html                # shell; loads the data then app.js
├── style.css                 # self-contained design tokens, light + dark
├── app.js                    # renders the three views, status, theme, and filters
├── graph.js                  # the force-directed graph view
├── data/
│   └── ecosystem.js          # the single source of truth (edit this)
├── REFRESH.md                # ready-to-run prompt to update the data and open a PR
├── .github/workflows/
│   └── review.yml            # monthly review-issue reminder
└── README.md
```

## Notes

- `region` is the org's primary base mapped onto the three segments (US / China / Europe);
  companies headquartered elsewhere are placed by closest fit.
- Versions and availability statuses are best-effort as of each product's `lastVerified`
  date. The refresh workflow exists precisely because they move fast.
