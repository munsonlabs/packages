# Munson Labs packages

Public npm packages published under the `@munsonlabs` scope.

## Packages

| Package                                             | Description                                        |
| --------------------------------------------------- | -------------------------------------------------- |
| [`@munsonlabs/video-player`](packages/video-player) | Standalone Vue 3 video player                      |
| [`@munsonlabs/shipkit`](packages/shipkit)           | Shared build tooling (`shipkit` CLI, vite configs) |

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
npm run dev        # dev server on :5176
npm run test:e2e   # component tests, real Chromium via Vitest browser mode
npm run test:page  # full-page Playwright tests against the dev server
npm test           # both
```

Both suites are offline: they play a committed fixture clip (`tests/fixtures/flower.mp4`, MDN's CC0
sample) and the page tests abort every other cross-origin request. Playwright's Chromium needs to
be installed once (`npx playwright install chromium`).

## Releasing

Releases go through [Changesets](https://github.com/changesets/changesets):

```bash
npm run publish   # shipkit deploy --commit — creates & commits a changeset
```

Pushing to `main` (or `beta`) runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds, checks, tests, bumps versions, and publishes to npm using the `NPM_TOKEN` repo secret. This requires:

- An npm automation token with publish access to the `@munsonlabs` scope, stored as the `NPM_TOKEN` repository secret
- The `main` branch to allow the release workflow to push version-bump commits (Settings → Actions → General → Workflow permissions → Read and write)

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
