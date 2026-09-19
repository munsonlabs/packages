# @munsonlabs/sigil

A framework-free icon registry with a `<ml-sigil>` custom element. Describe where icons come from once - an SVG set on a CDN, an icon font, a JSON map, your own source - then render them anywhere by name and swap them at runtime, even from a script the app didn't bundle. No dependencies; `vue` is optional, for the `/vue` entry.

## Installation

```bash
npm install @munsonlabs/sigil
```

## Usage

```ts
import { register, override } from '@munsonlabs/sigil'
import '@munsonlabs/sigil/element'

register(
  'lucide',
  {
    resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static/icons/${name}.svg`,
  },
  { default: true },
)

override('logo', '<svg viewBox="0 0 24 24">…</svg>')
```

```html
<ml-sigil name="rocket"></ml-sigil>
<!-- the pinned override -->
<ml-sigil name="logo"></ml-sigil>
```

The registry is one shared instance per page, so a separately loaded script can register or replace icons and every mounted `<ml-sigil>` (or Vue `<Sigil>`) follows.

## Docs

Every kind of source, resolution order, variants, the element and Vue component, other frameworks, third-party scripts and the full API: **https://munsonlabs.github.io/packages/sigil/getting-started/introduction**
