# @munsonlabs/shipkit

Shared build tooling for Munson Labs packages. Provides the `shipkit` CLI, shared vite configs, and shared tsconfigs used across all `@munsonlabs/*` packages.

[![npm](https://img.shields.io/npm/v/@munsonlabs/shipkit)](https://www.npmjs.com/package/@munsonlabs/shipkit)

## Installation

```bash
npm install --save-dev @munsonlabs/shipkit vite-plus
```

`vite-plus` is a required peer dependency.

## CLI — `shipkit`

### `shipkit init <target>`

Scaffolds a `vite.config.ts` in the current directory:

```bash
shipkit init library   # for @munsonlabs/* packages
shipkit init app       # for apps
```

Generated `vite.config.ts`:

```ts
import { mergeConfig } from 'vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  // local overrides
})
```

### `shipkit deploy`

| Flag               | Description                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- |
| `--commit`         | Opens the Changesets CLI to create a changeset, then offers to commit it           |
| `--local`          | Publishes non-private workspace packages to a local Verdaccio registry             |
| `--snapshot <tag>` | Snapshot release to npm with the given tag — no changeset consumed, no git changes |

```bash
# create a changeset on your feature branch
shipkit deploy --commit

# publish a snapshot from a feature branch (no changeset required)
shipkit deploy --snapshot my-feature
# installs as: npm install @munsonlabs/video-player@my-feature

# publish to a local Verdaccio registry
VERDACCIO_URL=http://localhost:4873 shipkit deploy --local
```

Versioning and publishing are not shipkit's job: the repo's release workflow runs [`changesets/action`](https://github.com/changesets/action), which opens a Version Packages PR from pending changesets and publishes when that PR is merged.

## Shared vite configs

Import and extend in your `vite.config.ts`:

```ts
import { mergeConfig } from 'vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  // local overrides
})
```

| Config                                 | Use case                                                           |
| -------------------------------------- | ------------------------------------------------------------------ |
| `@munsonlabs/shipkit/vite/vue.config`  | Vue packages and apps — includes Vue plugins, DTS, lint, fmt, test |
| `@munsonlabs/shipkit/vite/base.config` | Plain TypeScript libraries — no Vue, includes lint, fmt, test      |

## Shared tsconfigs

Extend in your `tsconfig.json`:

```json
{
  "extends": "@munsonlabs/shipkit/tsconfig/lib"
}
```

| Config                              | Use case                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `@munsonlabs/shipkit/tsconfig/base` | Strict ESM base — `nodenext` resolution, `noEmit: true` |
| `@munsonlabs/shipkit/tsconfig/lib`  | Library packages — `bundler` resolution, DOM types, JSX |
| `@munsonlabs/shipkit/tsconfig/app`  | Apps — same as lib with `isolatedModules`               |
