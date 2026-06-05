# Refreshing the data

The dashboard renders entirely from [`data/ecosystem.js`](data/ecosystem.js). Keeping it
current means editing that one array: confirm each player's current flagship, refresh the
blurb if needed, bump `lastVerified`, and add or remove players as the field moves.

Anything whose `lastVerified` is more than 90 days old is visually flagged as **stale** in
the UI, so a monthly pass keeps everything green.

## Ready-to-run prompt

Open a [Claude Code](https://www.anthropic.com/claude-code) session at the repository root
and paste the prompt below. It web-searches every entry, updates the data, and opens a pull
request with the diff.

```text
You are refreshing the AI ecosystem dataset in data/ecosystem.js.

Today's date: run `date +%F` and use that ISO value for every lastVerified you touch.

Do this:
1. Read data/ecosystem.js. It is a window.ECOSYSTEM array of objects with this schema:
   { name, org, category, region, access, flagship, blurb, url, lastVerified }
     org      : parent company or owner (groups products in the graph view)
     category : frontier | search | coding | image | video | audio | agents | infra | open
     region   : us | china | europe        (primary base / origin)
     access   : closed | open | mixed
     lastVerified : YYYY-MM-DD

2. For EACH entry, web-search its official source and recent (this-month) announcements:
   - Confirm the current flagship product or model and update `flagship` (include the version).
   - If the description has drifted, rewrite `blurb` as one neutral factual sentence
     (roughly 8 to 18 words, no marketing language, no em-dash characters).
   - Confirm `url` still resolves to the official site; fix if it moved.
   - Set `lastVerified` to today's date for every entry you verified.

3. Add or remove players:
   - Add any clearly notable new entrant to the right category (keep categories balanced,
     a handful of the most significant names each, not an exhaustive list). Set its `org`
     to the parent company so it connects correctly in the graph view.
   - Remove anything defunct, acquired into irrelevance, or renamed (update instead if renamed).

4. Validate before committing:
   - Every object keeps all eight keys.
   - category, region, and access use only the allowed values above.
   - lastVerified is valid ISO YYYY-MM-DD.
   - Open index.html (or run `python3 -m http.server` and load it) and confirm it renders,
     the counts look right, and nothing is unexpectedly flagged stale.

5. Open a pull request:
   - Create a branch like `refresh/YYYY-MM`.
   - Commit only data/ecosystem.js with a message summarizing what changed
     (new players, removed players, notable flagship bumps).
   - Push and open a PR with `gh pr create`, listing the notable changes in the body.

Keep the change surgical: only data edits, no code or style changes unless a schema field
genuinely needs to change (in which case update app.js and this file too).
```

## Doing it by hand

If you would rather edit manually, each entry is a plain object. Change the values, set
`lastVerified` to today, save, and reload `index.html`. No build step, no tooling.

A scheduled [GitHub Actions workflow](.github/workflows/review.yml) opens a checklist issue
on the first of every month as a reminder to run this pass.
