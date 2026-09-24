<div align="center">

<img src="docs/public/favicon.svg" width="72" height="72" alt="">

# Munson Labs packages

Public npm packages published under the `@munsonlabs` scope.

[**Documentation**](https://munsonlabs.github.io/packages/) ·
[![Build](https://github.com/munsonlabs/packages/actions/workflows/release.yml/badge.svg)](https://github.com/munsonlabs/packages/actions/workflows/release.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

## Packages

Each is published and versioned on its own, but they are not unrelated. Installing the video player
brings sigil with it, for its icons. Shipkit is build tooling the other two use while developing, and
never ships to a consumer.

| Package                                             |                                                                                                                                | Description                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| [`@munsonlabs/video-player`](packages/video-player) | [![npm](https://img.shields.io/npm/v/@munsonlabs/video-player?label=)](https://www.npmjs.com/package/@munsonlabs/video-player) | Vue 3 video player: native, HLS, DASH, embeds and IMA ads      |
| [`@munsonlabs/sigil`](packages/sigil)               | [![npm](https://img.shields.io/npm/v/@munsonlabs/sigil?label=)](https://www.npmjs.com/package/@munsonlabs/sigil)               | Framework-free icon registry with an `<ml-sigil-icon>` element |
| [`@munsonlabs/shipkit`](packages/shipkit)           | [![npm](https://img.shields.io/npm/v/@munsonlabs/shipkit?label=)](https://www.npmjs.com/package/@munsonlabs/shipkit)           | Shared build tooling: the `shipkit` CLI and vite configs       |

## Develop

Everything runs through [vite-plus](https://www.npmx.dev/package/vite-plus) and its `vp` command.
The npm scripts are thin wrappers, so either form works.

```bash
vp i
vp config        # installs the pre-commit hook; .npmrc sets ignore-scripts, so it isn't automatic
vp run -r dev    # per-package dev/watch
vp run -r build
vp run -r check  # lint + typecheck
vp run -r test
```

`-r` runs a task across every workspace. To target one, filter by name, directory or glob:

```bash
vp run --filter @munsonlabs/video-player test
vp run --filter './apps/demos/*' build
```

Run from a package's own directory instead when you want `--watch` or file filters, which only
behave well there.

Browsers for the real-browser suites install once with `vp exec playwright install chromium webkit`. CI
runs Chromium on Linux and WebKit on macOS, because Linux WebKit ships no H.264 decoder and the test
fixtures are H.264. Each package's `AGENTS.md` covers its own test layout and development loop.

## Releasing

Changesets drive it: describe the change on your branch with `npm run publish`, merge, then merge the **Version Packages** PR when you want to ship. The flow, the snapshot escape hatch and the secrets the workflow needs are in [`.changeset/README.md`](.changeset/README.md).

## Local registry

Publishing to a local Verdaccio and installing from it is covered in [`buildtools/README.md`](buildtools/README.md), alongside the rest of the Docker setup which makes it easier to run the varous apps across environments consistently.
