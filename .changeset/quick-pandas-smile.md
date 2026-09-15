---
'@munsonlabs/shipkit': minor
---

Initial release.

Shared build tooling for `@munsonlabs/*` packages:

- **`shipkit init <target>`** — scaffolds a `vite.config.ts` for a library or an app.
- **`shipkit deploy`** — the developer side of a Changesets release: `--commit` to author a
  changeset, `--local` to publish to a Verdaccio registry, and `--snapshot <tag>` for a throwaway
  release off a feature branch. Versioning and publishing are left to `changesets/action` in CI.
- **Shared Vite configs** — `vite/vue.config` for Vue packages and apps, `vite/base.config` for
  plain TypeScript libraries. Both wire up DTS, lint, format and test. Includes `inlineCss()`, a
  plugin that embeds a built CSS file into a JS chunk at an `__INLINE_CSS(<path>)__` marker, for
  custom elements built without a shadow root.
- **Shared tsconfigs** — `tsconfig/base` (strict ESM, `nodenext`), `tsconfig/lib` (bundler
  resolution, DOM types, JSX) and `tsconfig/app`.
