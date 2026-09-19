# @munsonlabs/sigil — Agent Guide

## Package purpose

A framework-free icon registry with a `<ml-sigil>` custom element. The core is a tiny kernel: direct overrides by name, plus named `IconSource`s of which exactly one is asked per lookup. Every kind of source (SVG libraries, icon fonts) and every renderer (element, Vue) is its own entry. It exists so icons can be resolved by name and, critically, so a script loaded separately from the app can replace them at runtime through the shared singleton. Its only internal dependency is `@munsonlabs/shipkit` for build tooling.

## Public API

```ts
import { sigil, createSigil, register, unregister, override, use, getIcon, getIconSync, subscribe, clear, watchIcon, cached } from '@munsonlabs/sigil'
import type { Sigil, IconSource, IconRequest, ResolvedIcon, IconQuery, IconOverride, OverrideRequest } from '@munsonlabs/sigil'
import { SigilElement, defineElements, createIconNode } from '@munsonlabs/sigil/element'
import { Sigil } from '@munsonlabs/sigil/vue'
```

Full member table in README.md. `register(name, config | source)`/`unregister` manage libraries, `override` pins markup to a name (`null` removes). `createSigil()` returns a registry built from closures over a private `State`, so its methods need no binding: the named exports are one destructuring of the shared `sigil` at the bottom of `registry/index.ts`. Keep the `Sigil` interface, that destructuring line and the README table in step.

## Layout

```
src/
  index.ts              core entry: registry, watchIcon, cached, every public type
  registry/
    index.ts            createSigil() + the Sigil interface, shared sigil, destructured named exports
    state.ts            the State record (overrides, libraries, listeners, defaultLibrary) + notify
    lookup.ts           plan(): which source and override answer a query; resolveSync/resolveFrom
    lazy.ts             createLazySource(): placeholder while a kind's module loads
    load.ts             isSource(), loadKind(): config shape → dynamic import of a kind
  watch.ts              watchIcon(): sync-first, stale-safe resolution both renderers use
  sources/
    svg.ts              svgLibrary  (loaded by register on first { resolver } / { icons })
    font.ts             fontLibrary (loaded by register on first { className })
    cached.ts           cached(): per name+variant memo any IconSource can wear; svg uses it
  types/                one file per concern, re-exported from types/index.ts
  element/
    index.ts            entry /element: defines <ml-sigil> on import (unless ?defer)
    SigilElement.ts     the custom element + defineElements()
    render.ts           createIconNode: ResolvedIcon → DOM
  vue.ts                entry /vue: the Sigil component
test/                   mirrors src: registry, watch, sources/{svg,font,cached}, element/SigilElement, vue
```

Every function of substance carries a multi-line docblock that says what it does, when it is used and what a caller can rely on - full sentences, not a one-line label. Bodies are written line by line (`if` blocks with braces, a `return` you can see) rather than as dense one-line arrows. Inline comments are reserved for a why the code cannot show, such as the `import.meta.env?.DEV` optional chain.

## The contract between core and sources

- `IconRequest` is `{ name, variant? }`. The registry applies the default library in `plan()` (`registry/lookup.ts`); sources never see the library name. Override factories do, as `OverrideRequest`.
- `ResolvedIcon` is `{ tag, className?, html?, text? }`, a DOM description. Sources own their output; renderers are generic. **Never add a source-specific kind to `ResolvedIcon`.** Overrides render as `{ tag: 'span', className: 'icon-svg', html }`, the same shape `svgLibrary` uses.
- `resolveSync` must not do I/O. `getIcon` calls `getIconSync` first, so a cached answer never waits behind `resolve`.
- **One library per lookup.** `plan()` picks `query.library`, else `defaultLibrary`, else the sole registered library, else none. There is deliberately no scan across libraries: it made results order-dependent and fanned one miss into a request per library.
- `dispose` is called on replace, `unregister` and `clear`. `svgLibrary` drops its cache there.
- A rejecting `resolve` resolves to `undefined`, with a `console.warn` in development builds only (`import.meta.env?.DEV` - optional chain because the library build leaves `import.meta.env` in place).
- A source answers `undefined` for a name it does not have, built-ins included: `fontLibrary` declines a name missing from a record `mapping` or `glyphs` rather than emitting an empty `<i>`.

## Invariants to preserve

- **The core stays framework-free and DOM-free.** Only `vue.ts` imports `vue`; only `element/` touches `document`; the core and every library are DOM-free apart from `svgLibrary`'s optional `DOMParser` validation. There is no Vue-only override layer: `<Sigil>` resolves through the registry and nothing else, so an icon means the same thing whichever renderer draws it.
- **`register` is synchronous in effect, lazy in code.** A config gets a placeholder source immediately (`createLazySource`, `registry/lazy.ts`); `loadKind()` `import()`s the kind module, and once it lands the real source replaces the placeholder in the map and listeners are notified. `resolveSync` on the placeholder answers nothing until then; `resolve` awaits the load. A placeholder unregistered before its load finishes disposes the loaded source and does not notify; a load that fails clears `defaultLibrary` if it pointed there. Shape detection in `loadKind()`: `resolver` or `icons` is SVG, `className` is font.
- **The core caches nothing.** Caching is a source concern: `cached()` (`sources/cached.ts`) wraps any `IconSource`, `svgLibrary` is built on it, and nothing in `registry/` remembers a result.
- **Renderers do not resolve for themselves.** `watchIcon()` (`watch.ts`) owns sync-first resolution, stale-result dropping and re-resolving on registry changes; `element/` and `vue.ts` only turn a `ResolvedIcon` into DOM. Put resolution behaviour there, once.
- **The shared instance lives on `globalThis[Symbol.for('@munsonlabs/sigil')]`.** This is what makes two bundled copies of the package on one page share state. Never replace `??=` with `=`, and never store anything on the instance that a different package version could not understand; the public surface is the compatibility contract. `sigil.version` exists so a mismatch can be diagnosed.
- **Every mutation calls `notify(state)`.** `watchIcon` relies on it to re-resolve.
- **Overrides are keyed by the raw name**, so `heart/solid` and `heart` are distinct keys.
- **Resolved SVG markup is always parsed** and rejected if the root is not `<svg>`. Without `DOMParser` (a server) it is root-checked by regex, not mutated and not cached, so nothing unvalidated ever sits in the process-wide instance.
- **`element/render.ts` and the Vue render function must agree**: `tag`, `className`, `aria-hidden`, then `html` as innerHTML else `text` as content.

## Build

One multi-entry `vp pack`. Entries import each other by relative path; the bundler factors shared code (the registry) into `dist/chunks/`, and the registry's `import('./sources/x')` calls become relative dynamic imports of the kind entries. Nothing in `dist/` uses a bare specifier except `vue`, so consumers never need an import map. Self-hosting must serve `dist/chunks/` alongside the entries.

Adding a kind means: a source file in `src/sources/`, its options type in `src/types/`, a member of `LibraryConfig`, and a branch in `loadKind()` in `registry/load.ts` keyed on a shape no other kind can match. Kinds are not public entries; `register` is the only way in.

## Testing

`vp test`. Tests import source by alias (`@/registry`, `@/watch`, `@/sources/svg`), never the package specifier. `registry.spec.ts` uses hand-written fake sources so it tests dispatch only; each library kind has its own spec, importing it by `@/sources/…` path since kinds are not exported. Element tests append real `<ml-sigil>` nodes to `document.body` and clear it in `afterEach`. Vue tests use `@vue/test-utils` with `enableAutoUnmount(afterEach)`; without it, mounted icons from earlier tests keep reacting to `clear()` and inflate resolver call counts.
