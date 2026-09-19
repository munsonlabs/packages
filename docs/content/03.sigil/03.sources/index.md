---
title: Overview
description: Every way to register icons, at a glance.
navigation:
  icon: i-lucide:list
---

Six ways to get icons into the registry - pick per library, mix freely on one page.

## Direct overrides

Pin a name to markup, ahead of every library. See [Overrides](/sigil/sources/overrides).

```ts
import { override } from '@munsonlabs/sigil'

override('logo', '<svg …>') // markup
override('star', ({ variant }) => (variant === 'active' ? '<svg …filled/>' : '<svg …outline/>')) // a factory, per variant
override({ heart: '<svg …>', check: '<svg …>' }) // several at once
override('logo', null) // remove
```

```html
<ml-sigil name="logo"></ml-sigil>
<!-- the factory, asked for its active variant -->
<ml-sigil name="star" variant="active"></ml-sigil>
```

::icon-example{names="logo,heart,check"}
::

## SVG libraries - resolver

An SVG per name from a URL, a string, or a bundled import. See [SVG libraries](/sigil/sources/svg).

```ts
import { register, use } from '@munsonlabs/sigil'

register('lucide', {
  resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static/icons/${name}.svg`,
  mutator: (svg) => svg.setAttribute('stroke', 'currentColor'),
})

use('lucide') // set as the default library
```

```html
<ml-sigil name="rocket"></ml-sigil>
<!-- or, without use(), name the library per element -->
<ml-sigil name="rocket" library="lucide"></ml-sigil>
```

::icon-example{names="rocket,camera,bell,bike" library="lucide"}
::

## SVG libraries - a map

Skip the resolver when you already have the SVGs. See [SVG libraries](/sigil/sources/svg).

```ts
import { register, use } from '@munsonlabs/sigil'

register('app', {
  icons: {
    heart: '<svg …>',
    lock: '<svg …>',
    bell: {
      default: '<svg …>',
      active: '<svg …>',
    },
  },
})

use('app')
```

```html
<ml-sigil name="heart"></ml-sigil>
<!-- a variant from the nested map -->
<ml-sigil name="bell" variant="active"></ml-sigil>
```

::icon-example{names="heart@app,lock@app,bell@app" toggle}
::

## From a JSON file

A `{ icons }` map, or a promise of one - handy for a fetched file. Same shape as the map above, just loaded over the network. See [From a JSON file](/sigil/sources/json).

**`icons.json`**

```json
{
  "anchor": "https://cdn.example.com/icons/anchor.svg",
  "bell": { "default": "…/bell.svg", "active": "…/bell-ring.svg" }
}
```

```ts
import { register, use } from '@munsonlabs/sigil'

register('json', {
  icons: fetch('/icons.json').then((r) => r.json()),
})

use('json')
```

```html
<ml-sigil name="anchor"></ml-sigil> <ml-sigil name="bell" variant="active"></ml-sigil>
```

::icon-example{names="anchor@json,bell@json,bookmark@json" toggle}
::

## Icon fonts

A CSS class per name, or a codepoint/ligature for fonts with no per-icon class. See [Icon fonts](/sigil/sources/fonts).

```ts
import { register, use } from '@munsonlabs/sigil'

register('fa', {
  className: 'fa',
  mapping: { heart: 'fa-heart' }, // by class
})

register('mi', {
  className: 'mi',
  glyphs: { heart: 'e001' }, // by glyph
})

use('fa')
```

```html
<ml-sigil name="heart"></ml-sigil>
<!-- <i class="fa fa-heart" aria-hidden="true"></i> -->
```

::icon-example{names="home,search,settings" library="material"}
::

::icon-example{names="sun,moon,star" library="glyphs"}
::

## Your own source

Any object with `resolveSync` and/or `resolve` is a valid library. See [Your own source](/sigil/sources/custom).

```ts
import { register, use } from '@munsonlabs/sigil'

const EMOJI = {
  heart: '❤️',
  star: '⭐',
  check: '✅',
}

register('emoji', {
  resolveSync: ({ name }) => (name in EMOJI ? { tag: 'span', text: EMOJI[name] } : undefined),
})

use('emoji')
```

```html
<ml-sigil name="heart"></ml-sigil>
<ml-sigil name="star"></ml-sigil>
<ml-sigil name="check"></ml-sigil>
```

::icon-example{names="heart,star,check" library="emoji"}
::

## Resolution order

See [Resolution](/sigil/core-concepts/resolution) for how a name picks a library among these.
