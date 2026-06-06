# Refreshing the data

The dashboard renders entirely from [`data/ecosystem.js`](data/ecosystem.js). Keeping it
current means editing that one array: confirm each product's current version and status,
refresh the blurb if needed, bump `lastVerified`, and add or remove products as the field moves.

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
1. Read data/ecosystem.js. It is a flat window.ECOSYSTEM array of PRODUCTS; each product
   belongs to an org (company or lab). Schema:
   { name, org, category, region, access, status, version, blurb, url, orgUrl, lastVerified }
     org      : the company or lab that makes the product
     category : frontier | search | coding | image | video | audio | agents | infra | open
     region   : us | china | europe        (the org's primary base)
     access   : closed | open | mixed
     status   : ga | preview | beta | research | waitlist | announced | deprecated
     version  : current model or version (or empty string)
     orgUrl   : the org's official site
     lastVerified : YYYY-MM-DD

2. For EACH product, web-search its official source and recent (this-month) announcements:
   - Confirm the current `version` and `status` (ga, or preview/beta/research/waitlist/
     announced for things not fully available, deprecated for retired ones).
   - If the description has drifted, rewrite `blurb` as one neutral factual sentence
     (roughly 8 to 16 words, no marketing language, no em-dash characters).
   - Confirm `url` still resolves to the official product page; fix if it moved.
   - Set `lastVerified` to today's date for every product you verified.

3. Add or remove products and companies (go deep, this is a living map):
   - Add notable new products to existing companies, and new companies with their lineups.
     Set `org` and `orgUrl` so each product groups under its company.
   - Include things that are not fully available, with the right `status`.
   - Remove anything fully retired, or set its `status` to deprecated if it is winding down.

4. Validate before committing:
   - Every object keeps all eleven keys.
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
