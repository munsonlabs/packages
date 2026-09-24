# Changesets

Every change that affects a published package needs a changeset: a small file in this folder naming
the packages it touches, the bump level, and the line that will appear in their changelogs. Releases
are driven by [Changesets](https://github.com/changesets/changesets) through
[`changesets/action`](https://github.com/changesets/action).

## Writing one

```bash
npm run publish   # shipkit deploy --commit — creates & commits a changeset
```

Commit it alongside the code, so a reviewer sees the bump level and the changelog entry in the same
diff as the change itself.

One changeset per package wherever the change is separable. A single file may name several packages,
but its summary is copied verbatim into every changelog it touches, so a shared entry leaves each
package's consumers reading about packages they do not use. These packages are independent and
release on their own cadence, so they usually want their own entries.

Not everything needs one. Changes to the docs site, the demos, tests or build config ship with
whatever release comes next, because nothing published has changed.

## Releasing

1. Merge your branch, changeset included, into `main`.
2. [`release.yml`](../.github/workflows/release.yml) runs on the merge. It builds, checks and tests,
   then opens or refreshes a **Version Packages** PR holding the version bumps, changelog entries and
   lockfile update for every pending changeset. Keep merging features; that PR is regenerated each
   time and always shows exactly what the next release contains.
3. Merge the Version Packages PR when you want to release. The workflow runs again, finds no pending
   changesets, publishes every bumped package to npm and tags each one
   (`@munsonlabs/video-player@1.3.0`), then redeploys the docs site, whose published-package demo
   loads the workspace version from a CDN.

To try unreleased work without cutting a release, publish a snapshot from any branch.
`shipkit deploy --snapshot <tag>` publishes `0.0.0-<tag>-<timestamp>` under that dist-tag and leaves
changesets and git untouched.

## What the workflow needs

- `NPM_TOKEN` — an npm automation token with publish access to the `@munsonlabs` scope, stored as a
  repository secret.
- Permission to open the Version Packages PR. Either enable _Settings → Actions → General → Allow
  GitHub Actions to create and approve pull requests_, or store a personal access token (repo scope)
  as the `CHANGESETS_TOKEN` secret. Prefer the token: PRs opened with the default `GITHUB_TOKEN` do
  not trigger CI on themselves.
- Optionally the [changeset-bot](https://github.com/apps/changeset-bot) GitHub app, so PRs without a
  changeset get a reminder comment.
