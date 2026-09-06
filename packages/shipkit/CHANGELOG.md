# @munsonlabs/shipkit

## 0.1.6

### Patch Changes

- 5da85b3: Fix the `inlineCss` Vite plugin so it's safe to share across multiple pack configs in the same package: `dir`/tracked chunk names now come from each build's own `generateBundle` instead of a static default/accumulated set, so state from one build can no longer leak into another's `closeBundle` pass. Also add a `@test` path alias (-> `test/`) alongside the existing `@` (-> `src/`).

## 0.1.5

### Patch Changes

- d53d3ab: Adds `inlineCss()`, a Vite/Rollup plugin (exported from `@munsonlabs/shipkit/vite/vue/inline-css` and included by default in the shared Vue pack config) that replaces any `__INLINE_CSS(<path>)__` marker in a built JS chunk with that CSS file's content, embedded as a string literal. No-op when the marker is absent. For custom elements built with `shadowRoot: false`, which have no shadow root for Vue to inject compiled styles into and can't reliably locate a separately-built CSS file via `import.meta.url` on CDNs that rewrite module paths (e.g. esm.sh).

## 0.1.4

### Patch Changes

- 01e369d: Auto detect setup files for tests

## 0.1.3

### Patch Changes

- 3891819: Output now strips comments, minifies code, and places chunks in a subdirectory.

## 0.1.2

### Patch Changes

- bebd766: Moved npm version badge below the package description in all README files.

## 0.1.1

### Patch Changes

- 6036bdd: Updated README with npm version badge and trimmed outdated content.

## 0.1.0

### Minor Changes

- 6d1fa19: Initial release. vp CLI with deploy, pack, init, and version commands, vp check for lint, formatting, and type checking, shared Vite configs for Vue apps and libraries, shared tsconfig bases, and changeset-based publish flow with beta, local, and snapshot modes.
