# Munson Labs Docs

Documentation site for `@munsonlabs/video-player` and `@munsonlabs/shipkit`. Built with [Docus](https://docus.dev) on Nuxt.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
```

## Deploy

The site is generated statically and hosted on Cloudflare Pages.
[`docs.yml`](../.github/workflows/docs.yml) builds it with the
[`build-site`](../.github/actions/build-site/action.yml) action, which generates the docs and copies
each demo in `apps/demos/` under `/demo/<name>/`, then deploys it with `wrangler pages deploy`.

- Production (`main`) deploys after a release publishes, so the published-package demo finds its
  version on npm. Run **Deploy docs** from the Actions tab to redeploy by hand.
- Every other branch push deploys a preview to `https://<branch>.<project>.pages.dev`. Deleting
  the branch deletes all of its previews through
  [`prune-previews.yml`](../.github/workflows/prune-previews.yml). Cloudflare has no retention
  setting of its own, so previews of branches that still exist are kept. Run **Prune previews**
  from the Actions tab with a branch name to delete one branch's previews by hand.

The branch flows and the secrets and variables the deploy needs are in
[`.changeset/README.md`](../.changeset/README.md).

## Content

Documentation lives in `content/` as Markdown files. Docus routes pages based on directory structure and filename numbers (e.g. `01.getting-started/01.introduction.md`).
