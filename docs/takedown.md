# Takedown

These are commands, not intentions. Deployment status lives in PLAN.md (D6); the commit that
changes deployment also rewrites this file.

The repository is public (`dragoonant/bossforge-`) and served by GitHub Pages from the
`gh-pages` deployment of the Pages workflow (`.github/workflows/pages.yml`).

## 1. Withdraw the hosted copy

- Repository → Settings → Pages → "Unpublish site", then Settings → General → Change visibility →
  Private. (With `gh` available: `gh api -X DELETE repos/dragoonant/bossforge-/pages` and
  `gh repo edit dragoonant/bossforge- --visibility private --accept-visibility-change-consequences`.)
- Delete `.github/workflows/pages.yml` so no later push redeploys.

## 2. Names only

`git rm data/printed.js` and remove its `<script>` line from `index.html`. The game keeps working
on the gist text in our own words (`BF.names` falls back by design, CLAUDE.md regime 4).

## 3. Make the game unplayable from the repository

`git rm data/cards.js data/printed.js`. Load-time validation throws on the first frame.

## 4. Remove all derived material

`git rm -r data art` and rewrite history if the request asks for it.
