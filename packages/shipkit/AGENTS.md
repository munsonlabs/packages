# @munsonlabs/shipkit — Agent Guide

## Package purpose

`@munsonlabs/shipkit` is the shared build tooling for all `@munsonlabs/*` packages. It provides:

- The `shipkit` CLI binary (`shipkit init`, `shipkit deploy`)
- Shared `vite-plus` configs for Vue packages and plain TS libraries
- Shared tsconfigs
- Build utilities (`getLibEntries`, `getFormattedVersion`)

## CLI commands

### `shipkit init <target>`

Scaffolds a `vite.config.ts` in the current directory. Both targets produce identical output — they both import from `@munsonlabs/shipkit/vite/vue.config`.

```bash
shipkit init library   # for @munsonlabs/* library packages
shipkit init app       # for apps
```

Generated file:

```ts
import { mergeConfig } from 'vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  // local overrides
})
```

### `shipkit deploy`

Handles the full release pipeline using Changesets.

| Flag               | What it does                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `--commit`         | Opens Changesets CLI to create a changeset, then offers to commit it                                                       |
| `--publish`        | **CI only.** Bumps versions, publishes to npm, commits and pushes git tags (main branch). Exits prerelease mode if needed. |
| `--beta`           | **CI only.** Enters/continues prerelease mode, bumps versions, publishes with `beta` tag (beta branch).                    |
| `--local`          | Publishes non-private workspace packages to local Verdaccio registry with a timestamp version.                             |
| `--package <name>` | Target a specific package (use with `--local`).                                                                            |
| `--scope <scope>`  | Filter packages by name prefix, e.g. `@munsonlabs/` (use with `--local` and `--snapshot`).                                 |
| `--snapshot <tag>` | Publishes snapshot release to npm with the given tag. No changeset consumed, no git changes.                               |

`--publish` and `--beta` require `GITHUB_ACTIONS` to be set — they exit with an error if run locally. The GitHub Actions release workflow writes `NPM_TOKEN` into `.npmrc` before running, which routes all packages to public npm.

`VERDACCIO_URL` must be set for `--local` — there is no default. In Docker it is injected automatically via `docker-compose.yml`. Outside Docker, export it in your shell before running `shipkit deploy --local`.

Version formats:

- `--local`: `1.2.0-local.<unix-timestamp>`
- `--snapshot`: `0.0.0-<tag>-<unix-timestamp>`
- `--beta`: `1.2.0-beta.0`, `1.2.0-beta.1`, …
- `--publish`: `1.2.0`, `1.3.0`, …

## Shared vite configs

### `@munsonlabs/shipkit/vite/vue.config`

For all Vue packages — covers both `vp pack` (rolldown/library) and `vp build` (Vite/app) pipelines. These two pipelines coexist in a single config without interfering.

Configures:

- `@vitejs/plugin-vue` (for `vp build`) + `unplugin-vue/rolldown` in `pack.plugins` (for `vp pack`)
- `pack.entry` defaults to `{}` — set `AUTO_ENTRIES=1` to auto-detect entries from `package.json` exports, or override `pack.entry` explicitly
- `dts: { vue: true }` — DTS generation including Vue SFC types
- `vue` is always external
- `VITE_GIT_VERSION` injected via `define`
- `@` alias pointing to `src/`
- oxlint with type-aware rules, oxfmt, vitest with `happy-dom`

Consumer usage:

```ts
import { mergeConfig } from 'vite-plus'
import type { UserConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  pack: {
    entry: { index: resolve(import.meta.dirname, 'src/index.ts') },
  },
}) as UserConfig
```

### `@munsonlabs/shipkit/vite/base.config`

For plain TypeScript libraries (no Vue). Configures:

- `vp pack` with DTS generation and ESM output
- Same `AUTO_ENTRIES=1` / explicit `pack.entry` pattern as `vue.config`
- `vue` is always external
- Same oxlint, oxfmt, vitest settings as `vue.config`

## Internal structure

```
src/
  bin/index.ts              — CLI entry point (cac), registers init / deploy commands
  commands/
    init.ts                 — runInit(target) — writes vite.config.ts from template
    deploy.ts               — runDeploy(options) — commit / publish / beta / local / snapshot flows
  vite/
    vue.config.ts           — main Vue config (pack + build pipelines)
    base.config.ts          — plain TS library config (pack only)
    vue/
      index.ts              — barrel: re-exports pack, plugins + shared fragments
      pack.ts               — pack section (unplugin-vue/rolldown, dts, entry, format, deps)
      plugins.ts            — plugins section (@vitejs/plugin-vue + shipkit-version-html transform)
    shared/
      index.ts              — barrel: lint, fmt, test, build
      lint.ts               — oxlint config
      fmt.ts                — oxfmt config
      test.ts                — vitest config (happy-dom, globals)
      build.ts               — vite build config (outDir, chunkFileNames)
  utils/
    entries.ts              — getLibEntries() — reads package.json exports when AUTO_ENTRIES=1
    version.ts              — getFormattedVersion() — git describe → version string
    package.ts              — workspace package helpers
  tsconfig/
    base.json               — strict ESM base (nodenext, noEmit)
    lib.json                — library packages (bundler resolution, DOM types, JSX)
    app.json                — apps (same as lib + isolatedModules)
```

## Exports

| Export                                 | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| `@munsonlabs/shipkit`                  | `shipkit` CLI binary                            |
| `@munsonlabs/shipkit/vite/vue.config`  | Vue config for `vp pack` + `vp build`           |
| `@munsonlabs/shipkit/vite/base.config` | Plain TS config for `vp pack` only              |
| `@munsonlabs/shipkit/tsconfig/base`    | Strict ESM base tsconfig                        |
| `@munsonlabs/shipkit/tsconfig/lib`     | Library tsconfig (bundler resolution, DOM, JSX) |
| `@munsonlabs/shipkit/tsconfig/app`     | App tsconfig (same as lib + isolatedModules)    |

The `./vite/*` export pattern covers only top-level files (`vue.config.ts`, `base.config.ts`). The `vue/` and `shared/` subdirectories are internal implementation — not exported directly.

## `AUTO_ENTRIES`

`getLibEntries()` in `entries.ts` returns `{}` unless `AUTO_ENTRIES=1` is set in the environment. This guard prevents the function from running at config-load time during tests or when `vite.config.ts` is imported as a module.

Packages that use auto-detection set it in their build scripts:

```json
"build": "AUTO_ENTRIES=1 vp pack"
```

Packages that specify entries explicitly in `vite.config.ts` do not need it.

## TypeScript notes

- Use `as UserConfig` (not `satisfies UserConfig`) when passing the result of `defineConfig` or `mergeConfig` to avoid "excessive stack depth" TypeScript errors.
- Literal string values in config objects need `as const` to satisfy strict union types: `'es' as const`, `'all' as const`, `'off' as const`.

## Build

```bash
npm run build      # vp pack
npm run dev        # vp pack --watch
npm run test       # vitest
npm run typecheck
```

The package builds itself with `vp pack` via its own `prepublishOnly` script.
