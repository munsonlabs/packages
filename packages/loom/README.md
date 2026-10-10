# @munsonlabs/loom

Widgets as data. A widget is a JSON **definition**, a tree of blocks whose props bind to values your app provides, and `<Widget>` renders it. Loom knows nothing about your data: you plug in a **kit** of sources (your composables).

```ts
import { createKit, defineSource, Widget, provideKit } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'

const kit = createKit({
  sources: [
    defineSource({
      id: 'product',
      label: 'Product',
      fields: { name: { type: 'string' }, price: { type: 'string' } },
      setup: (ctx) =>
        useProduct(
          {
            get product() {
              return ctx.data
            },
          },
          ctx.context.cart,
        ),
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
      { "id": "price", "type": "Text", "bind": { "text": "product.price" } }
    ]
  }
}
```

| You get     |                                                                                  |
| ----------- | -------------------------------------------------------------------------------- |
| Bindings    | `bind` and `style` on any node, read through the fields your sources declare     |
| Four blocks | Layout (`Stack`) and content (`Text`, `Image`, `Button`)                         |
| Variables   | Every block reads `--w-*` variables, which a definition's `vars` set on its root |

Full docs: [Loom](https://munsonlabs.pages.dev/loom/getting-started/introduction).

To see how loom was built, one commit at a time, run [`apps/demos/loom-steps`](../../apps/demos/loom-steps): a chapter per step, each with the files to read and a live example.
