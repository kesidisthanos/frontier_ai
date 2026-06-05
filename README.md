# frontier_ai

A single-page, filterable map of the AI ecosystem: who is building what across nine
categories, from frontier labs to open-weight models. It is a plain static site with no
framework and no build step. The entire UI is rendered from one data file, so keeping it
current is a data edit, not a code change.

- **Nine category branches** (frontier, search, coding, image, video, audio, agents, infra, open), each a card with a colored icon, label, and live count.
- **Filters**: multi-select category chips, an All / US / China / Europe region control, and a name/model/blurb search, plus a reset and a live total.
- **Every entry is a chip** that opens the official site in a new tab, shows its current flagship and the date it was last verified, and is flagged stale once that date is over 90 days old.
- **Light and dark** themes via `prefers-color-scheme`, self-contained CSS, no external resources.

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

`data/ecosystem.js` is the single source of truth: a `window.ECOSYSTEM` array of objects.

```js
{
  name: "Anthropic",
  category: "frontier",   // frontier | search | coding | image | video | audio | agents | infra | open
  region: "us",           // us | china | europe   (primary base / origin)
  access: "closed",       // closed | open | mixed
  flagship: "Claude Opus 4.8",
  blurb: "Safety-focused US lab that builds the Claude family of assistants and APIs.",
  url: "https://www.anthropic.com",
  lastVerified: "2026-06-05" // YYYY-MM-DD; entries older than 90 days are flagged stale
}
```

Categories, region segments, counts, and the total are all derived from this array. Add a
player by appending an object; remove one by deleting it. No other file needs to change.

## Keeping it current

1. **Edit the data.** Update `flagship` / `blurb`, bump `lastVerified`, add or remove players.
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
├── app.js                    # renders the cards and runs the filters
├── data/
│   └── ecosystem.js          # the single source of truth (edit this)
├── REFRESH.md                # ready-to-run prompt to update the data and open a PR
├── .github/workflows/
│   └── review.yml            # monthly review-issue reminder
└── README.md
```

## Notes

- `region` is the player's primary base or origin mapped onto the three available segments
  (US / China / Europe); a few companies headquartered elsewhere are placed by origin.
- Flagship versions are best-effort as of each entry's `lastVerified` date. The refresh
  workflow exists precisely because they move fast.
