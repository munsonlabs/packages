# Munson Labs packages

Public npm packages published under the `@munsonlabs` scope.

## Packages

| Package                                             | Description                                                   |
| --------------------------------------------------- | ------------------------------------------------------------- |
| [`@munsonlabs/video-player`](packages/video-player) | Standalone Vue 3 video player                                 |
| [`@munsonlabs/sigil`](packages/sigil)               | Framework-free icon registry with a `<ml-sigil-icon>` element |
| [`@munsonlabs/shipkit`](packages/shipkit)           | Shared build tooling (`shipkit` CLI, vite configs)            |

## Development

```bash
npm install
npm run prepare  # installs the git pre-commit hook (.npmrc sets ignore-scripts, so this isn't automatic)
npm run dev      # per-package dev/watch
npm run build    # build all packages
npm run check    # lint + typecheck
npm run test     # run tests
```

### Video player demo (`apps/demos/video-player`)

A Vue showcase app for `@munsonlabs/video-player`. From that directory:

```bash
vp run dev     # dev server on :5176
vp run test    # boots the real app and drives its panels in Vitest browser mode, in Chromium and WebKit
```

The player's own real-browser tests live with the package in `packages/video-player/test/browser`
(a second vitest project beside the jsdom unit suite, run by the same `vp test`); the per-test
development loop is in that package's `AGENTS.md` under "Adding a browser test". Both suites play
the committed fixture clip there (`flower.mp4`, MDN's CC0 sample, plus an HLS remux of it); the
demo's `public/media` is a symlink to it. `vp test --browser.name=chromium` (or `webkit`) narrows a
run to one engine. Install the browsers once with
`npx playwright install chromium webkit`. CI runs Chromium on Linux and WebKit on macOS, since
Linux WebKit has no H.264 decoder. A tap-to-play timing harness used to live in the demo; see git
history around `9623955` if start-time measurement is needed again.

## Releasing

Releases follow the standard [Changesets](https://github.com/changesets/changesets) flow, driven by [`changesets/action`](https://github.com/changesets/action).

1. On your feature branch, describe the change and commit the changeset alongside the code:

   ```bash
   npm run publish   # shipkit deploy --commit — creates & commits a changeset
   ```

2. Open a PR to `main` and merge it. Reviewers see the changeset (bump level and changelog entry) in the diff.
3. [`.github/workflows/release.yml`](.github/workflows/release.yml) runs on the merge. It builds, checks and tests, then opens (or refreshes) a **Version Packages** PR containing the version bumps, changelog entries and lockfile update for every pending changeset. Keep merging features; the PR is regenerated each time and always shows exactly what the next release contains.
4. Merge the Version Packages PR when you want to release. The workflow runs again, finds no pending changesets, and publishes every bumped package to npm, tagging each one (`@munsonlabs/video-player@1.3.0`). It then redeploys the docs site, whose published-package demo loads the workspace version from a CDN.

To try unreleased work without cutting a release, publish a snapshot from any branch — `shipkit deploy --snapshot <tag>` publishes `0.0.0-<tag>-<timestamp>` under that dist-tag and leaves changesets and git untouched.

Setup the workflow needs:

- `NPM_TOKEN` — an npm automation token with publish access to the `@munsonlabs` scope, stored as a repository secret.
- Permission to open the Version Packages PR. Either enable _Settings → Actions → General → Allow GitHub Actions to create and approve pull requests_, or store a personal access token (repo scope) as the `CHANGESETS_TOKEN` secret. Prefer the token: PRs opened with the default `GITHUB_TOKEN` do not trigger CI on themselves.
- Optionally install the [changeset-bot](https://github.com/apps/changeset-bot) GitHub app so PRs without a changeset get a reminder comment.

## Local Verdaccio registry

For testing a package install locally without touching the public registry:

```bash
docker compose up -d verdaccio        # starts Verdaccio on http://localhost:4873
VERDACCIO_URL=http://localhost:4873 npm run publish:local
```

`publish:local` runs `shipkit deploy --local --scope @munsonlabs/`, which publishes every non-private `@munsonlabs/*` workspace package to the local registry under a `-local.<timestamp>` version tag.

To install from it in another project:

```bash
npm install @munsonlabs/video-player --registry=http://localhost:4873
```
