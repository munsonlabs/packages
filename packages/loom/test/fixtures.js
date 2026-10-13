import { computed, reactive, toValue } from 'vue'
import { vi } from 'vite-plus/test'
import { createKit, defineSource } from '@/kit'

/**
 * A small shop: the kind of thing a client would plug in. Nothing here is special to loom.
 *
 * @typedef {object} Product
 * @property {string} id
 * @property {'product' | 'bundle'} kind
 * @property {string} title
 * @property {string} [summary]
 * @property {string} [category]
 * @property {number} price
 * @property {number} [wasPrice]
 * @property {string} [image]
 * @property {Product[]} [related]
 */

/**
 * @typedef {object} Shop
 * @property {{ add: (product: Product) => void; has: (id: string) => boolean }} cart
 * @property {(product: Product) => void} open
 */

export function makeProducts() {
  const related = [
    { id: 'r1', kind: 'product', title: 'Matching mug', price: 8 },
    { id: 'r2', kind: 'product', title: 'Spare lid', price: 3 },
  ]
  return reactive([
    { id: 'p1', kind: 'product', title: 'Teapot', summary: 'Holds six cups.', category: 'Kitchen', price: 24, image: '/teapot.jpg', related },
    { id: 'p2', kind: 'product', title: 'Kettle', category: 'Kitchen', price: 30, wasPrice: 40 },
    { id: 'b1', kind: 'bundle', title: 'Tea set', price: 50 },
  ])
}

export function makeShop() {
  const added = reactive([])
  return {
    added,
    cart: { add: vi.fn((p) => void added.push(p.id)), has: (id) => added.includes(id) },
    open: vi.fn(),
  }
}

/** A client composable, written with no idea loom exists. `product` is a ref or a getter. */
export function useProduct(product, shop) {
  const p = computed(() => toValue(product))
  return {
    title: computed(() => p.value.title),
    summary: computed(() => p.value.summary),
    category: computed(() => p.value.category),
    image: computed(() => p.value.image),
    price: computed(() => `£${p.value.price}`),
    onSale: computed(() => p.value.wasPrice != null && p.value.wasPrice > p.value.price),
    inCart: computed(() => shop.cart.has(p.value.id)),
    related: computed(() => (p.value.related?.length ? p.value.related : undefined)),
  }
}

export const productSource = defineSource({
  id: 'product',
  label: 'Product',
  primary: true,
  fields: {
    title: { type: 'string' },
    summary: { type: 'string' },
    category: { type: 'string' },
    image: { type: 'string' },
    price: { type: 'string' },
    onSale: { type: 'boolean' },
    inCart: { type: 'boolean' },
    related: { type: 'list', item: { '': 'object', title: 'string' } },
  },
  setup: ({ data, context }) => useProduct(data, context),
})

export const actionsSource = defineSource({
  id: 'shop',
  label: 'Shop',
  fields: { addToCart: { type: 'action' }, open: { type: 'action', description: 'Open this product, or the one passed' } },
  setup: ({ data, context }) => ({
    addToCart: () => context.cart.add(data.value),
    open: (product) => context.open(product ?? data.value),
  }),
})

export const productCard = {
  version: 2,
  id: 'product-card',
  name: 'Product card',
  match: [{ path: 'kind', op: 'equals', value: 'product' }],
  vars: { '--w-accent': '#c2410c', '--w-radius': '12px' },
  root: {
    id: 'card',
    type: 'Stack',
    on: { click: 'shop.open' },
    children: [
      { id: 'image', type: 'Image', bind: { src: 'product.image', alt: 'product.title' } },
      {
        id: 'copy',
        type: 'Stack',
        children: [
          { id: 'category', type: 'Text', props: { variant: 'kicker' }, bind: { text: 'product.category' } },
          { id: 'title', type: 'Text', props: { variant: 'title', lines: 2 }, bind: { text: 'product.title' } },
          { id: 'summary', type: 'Text', bind: { text: 'product.summary' } },
        ],
      },
      {
        id: 'meta',
        type: 'Stack',
        props: { direction: 'row' },
        children: [
          { id: 'price', type: 'Text', bind: { text: 'product.price' } },
          {
            id: 'add',
            type: 'Button',
            props: { label: 'Add', activeLabel: 'In basket' },
            bind: { active: 'product.inCart' },
            on: { click: 'shop.addToCart' },
          },
        ],
      },
      {
        id: 'related',
        type: 'Stack',
        if: 'product.related',
        children: [
          {
            id: 'related-list',
            type: 'Repeat',
            bind: { items: 'product.related' },
            children: [{ id: 'related-title', type: 'Text', bind: { text: 'item.title' }, on: { click: { action: 'shop.open', arg: 'item' } } }],
          },
        ],
      },
    ],
  },
  variants: [
    {
      id: 'sale',
      label: 'On sale',
      when: { if: 'product.onSale' },
      vars: { '--w-accent': '#dc2626' },
      overrides: {
        card: { order: ['copy', 'image'] },
        category: { bind: { text: null }, props: { text: 'Sale' } },
        related: { hidden: true },
      },
    },
    {
      id: 'compact',
      label: 'Compact',
      when: { size: ['sm'] },
      overrides: {
        image: { hidden: true },
        summary: { hidden: true },
        related: { hidden: true },
        title: { props: { variant: 'subtitle' } },
      },
    },
  ],
}

export function makeKit() {
  return createKit({ sources: [productSource, actionsSource], describe: (p) => p.title })
}
