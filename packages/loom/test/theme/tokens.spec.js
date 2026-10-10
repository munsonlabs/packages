import { afterEach, describe, expect, it } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineTheme, scaleForRole, scaleTokens, tokenVars, tokens } from '@/theme/tokens'
import { createKit, getTheme } from '@/kit'
import Widget from '@/Widget.vue'
import { makeProducts, makeShop, productCard, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

// From disk: Vitest blanks CSS imports, `?raw` included. Tests run from the package root.
const css = readFileSync(resolve(process.cwd(), 'src/theme/styles.css'), 'utf8')
/** Each block's own rules: the `<style>` of every SFC under `src/blocks/`. */
const blockCss = readdirSync(resolve(process.cwd(), 'src/blocks'), { recursive: true })
  .filter((file) => file.endsWith('.vue'))
  .map((file) => /<style>([\s\S]*?)<\/style>/.exec(readFileSync(resolve(process.cwd(), 'src/blocks', file), 'utf8'))?.[1] ?? '')
  .join('\n')

/** The `--w-*` declarations in `:where(.w-root) { … }`. */
function declaredDefaults() {
  const block = css.slice(css.indexOf(':where(.w-root)'), css.indexOf('}', css.indexOf(':where(.w-root)')))
  return Object.fromEntries([...block.matchAll(/--w-([a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}

describe('tokens', () => {
  it('are all declared in styles.css with their defaults, and nothing else is', () => {
    expect(declaredDefaults()).toEqual(Object.fromEntries(tokens.map((t) => [t.name, t.default])))
  })

  it('only reference tokens that exist', () => {
    const names = new Set(tokens.map((t) => t.name))
    const referenced = [...(css + blockCss).matchAll(/var\(--w-([a-z0-9-]+)\)/g)].map(([, name]) => name)
    expect(referenced.filter((name) => !names.has(name))).toEqual([])
    for (const t of tokens) {
      for (const [, name] of t.default.matchAll(/var\(--w-([a-z0-9-]+)\)/g)) expect(names.has(name), `${t.name} → ${name}`).toBe(true)
    }
  })

  it('offer scales for editors', () => {
    expect(scaleTokens('space').map((t) => t.name)).toEqual([
      'space-0',
      'space-1',
      'space-2',
      'space-3',
      'space-4',
      'space-5',
      'space-6',
      'space-7',
      'space-8',
    ])
    for (const scale of Object.values(scaleForRole)) expect(scaleTokens(scale).length, scale).toBeGreaterThan(0)
  })

  it('turn token names into custom properties', () => {
    expect(tokenVars({ accent: 'red', '--w-gap': '4px' })).toEqual({ '--w-accent': 'red', '--w-gap': '4px' })
  })
})

describe('themes', () => {
  const brand = defineTheme({ id: 'brand', label: 'Brand', values: { accent: '#4f46e5', radius: 'var(--w-radius-lg)' } })
  const darkTheme = defineTheme({ id: 'dark', label: 'Dark', values: { bg: '#18181b', text: '#fafafa' } })

  it('default to light, and pick by id', () => {
    expect(getTheme(createKit()).id).toBe('light')
    const kit = createKit({ themes: [brand, darkTheme] })
    expect(getTheme(kit).id).toBe('brand')
    expect(getTheme(kit, 'dark').id).toBe('dark')
    expect(getTheme(kit, 'nope').id).toBe('brand')
  })

  it('apply under the definition’s vars and the variant’s', () => {
    const kit = createKit({ sources: [productSource], themes: [brand, darkTheme] })
    const [teapot, kettle] = makeProducts()
    const style = (data, theme) => {
      const el = mount(Widget, { props: { kit, definition: productCard, data, context: makeShop(), theme } }).element
      return {
        accent: el.style.getPropertyValue('--w-accent'),
        radius: el.style.getPropertyValue('--w-radius'),
        bg: el.style.getPropertyValue('--w-bg'),
        theme: el.dataset.theme,
      }
    }
    // productCard sets --w-accent and --w-radius itself; its sale variant overrides the accent again.
    expect(style(teapot)).toEqual({ accent: '#c2410c', radius: '12px', bg: '', theme: 'brand' })
    expect(style(kettle)).toMatchObject({ accent: '#dc2626' })
    expect(style(teapot, 'dark')).toMatchObject({ bg: '#18181b', theme: 'dark' })
  })
})
