# @munsonlabs/loom

Widgets as data. A widget is a JSON **definition**, a tree of blocks whose props bind to values and actions your app provides, and `<Widget>` renders it. Loom knows nothing about your data: you plug in a **kit** of sources (your composables) and extra blocks. Each widget says which data it's for.

```ts
import { createKit, defineSource, Widget, provideKit } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'

const kit = createKit({
  sources: [
    defineSource({
      id: 'product',
      label: 'Product',
      fields: { name: { type: 'string' }, price: { type: 'string' }, add: { type: 'action' } },
      setup: ({ data, context }) => useProduct(data, context.cart),
    }),
  ],
})

provideKit(kit, { cart })
```

```vue
<Widget :definition="productCard" :data="product" />
```

```json
{
  "version": 2,
  "id": "product-card",
  "name": "Product card",
  "root": {
    "id": "card",
    "type": "Stack",
    "children": [
      { "id": "name", "type": "Text", "bind": { "text": "product.name" } },
      { "id": "add", "type": "Button", "props": { "label": "Add" }, "on": { "click": "product.add" } }
    ]
  }
}
```

| You get        |                                                                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bindings       | `bind`, `on`, `if` and `style` on any node, type-checked against what your sources declare                                                                                                                                 |
| Sixteen blocks | Layout (`Stack`, `Box`, `Grid`, `Carousel`, `Repeat`) and content (`Text`, `Image`, `Avatar`, `Button`, `Link`, `Badge`, `Rating`, `Progress`, `Divider`, `Spacer`), `Widget` to draw another widget inside, plus your own |
| Matching       | Each widget says which data it's for (`match`) and which sources it uses; `<Widget :definitions>` renders the first that matches                                                                                           |
| Variants       | Diffs on the base tree, applied by a rule on the data or the widget's measured width                                                                                                                                       |
| Design tokens  | A palette, type, space and shape scales, and role tokens; blocks read only tokens                                                                                                                                          |
| Themes         | Token sets per kit (light, dark, a brand, a host's own variables), overridden per widget and variant                                                                                                                       |
| Light and dark | Paired themes; `<Widget scheme>` follows the device or the host's setting, live; variants can target a scheme                                                                                                              |
| Validation     | `validateDefinition(kit, definition)` reports every problem before render                                                                                                                                                  |
| Libraries      | `createLibrary` puts every widget for a kit in one JSON file; `loadLibrary` loads what renders with this kit and says what it skipped and why                                                                              |
| Video          | `@munsonlabs/loom/video`: a `Video` block on [`@munsonlabs/video-player`](../video-player)                                                                                                                                 |
| Icons          | `@munsonlabs/loom/icon`: an `Icon` block on [`@munsonlabs/sigil`](../sigil)                                                                                                                                                |

Edit definitions with [`@munsonlabs/loom-studio`](../loom-studio). Full docs: [Loom](https://munsonlabs.pages.dev/loom/getting-started/introduction).

Editors get the lower-level helpers (what a field can bind to, variant diffs, token scales) from `@munsonlabs/loom/editor`; an app that only renders widgets never needs it.

To see how loom was built, one commit at a time, run [`apps/demos/loom-steps`](../../apps/demos/loom-steps): a chapter per step, each with the files to read and a live example.
