import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createKit } from '@/kit'
import { themeForScheme } from '@/theme/scheme'
import { darkTheme, defineTheme, lightTheme } from '@/theme/tokens'
import { hasErrors, validateDefinition } from '@/definitions/validate'
import Widget from '@/Widget.vue'
import { actionsSource, makeKit, makeProducts, makeShop, productCard, productSource } from '@test/fixtures'
import { lightDark, parseLightDark } from '@/theme/lightDark'

enableAutoUnmount(afterEach)

/** A device whose colour scheme the test can flip. */
let deviceDark = true
const changeListeners = new Set()
beforeAll(() => {
  vi.stubGlobal('matchMedia', (query) => ({
    get matches() {
      return query.includes('dark') && deviceDark
    },
    addEventListener: (_, fn) => changeListeners.add(fn),
    removeEventListener: (_, fn) => changeListeners.delete(fn),
  }))
})

const brand = defineTheme({ id: 'brand', label: 'Brand', scheme: 'light', dark: 'brand-dark', values: { accent: '#4f46e5' } })
const brandDark = defineTheme({ id: 'brand-dark', label: 'Brand dark', scheme: 'dark', values: { accent: '#818cf8', bg: '#111' } })
const plain = defineTheme({ id: 'plain', label: 'Plain', values: {} })

describe('themeForScheme', () => {
  const kit = createKit({ themes: [brand, brandDark, plain, darkTheme] })

  it('follows a theme’s named counterpart either way', () => {
    expect(themeForScheme(kit, 'brand', 'dark').id).toBe('brand-dark')
    expect(themeForScheme(kit, 'brand-dark', 'light').id).toBe('brand')
    expect(themeForScheme(kit, 'brand', 'light').id).toBe('brand')
  })

  it('keeps a named theme with no counterpart, and falls back by scheme only for the default', () => {
    expect(themeForScheme(kit, 'plain', 'dark').id).toBe('plain')
    expect(themeForScheme(createKit({ themes: [plain, darkTheme] }), undefined, 'dark').id).toBe('dark')
    expect(themeForScheme(createKit({ themes: [lightTheme, darkTheme] }), undefined, 'dark').id).toBe('dark')
  })
})

describe('<Widget scheme>', () => {
  const kit = createKit({ sources: [productSource], themes: [brand, brandDark] })
  const render = (scheme) =>
    mount(Widget, {
      props: { kit, definition: { ...productCard, vars: undefined, variants: undefined }, data: makeProducts()[0], context: makeShop(), scheme },
    })
  const accent = (wrapper) => wrapper.element.style.getPropertyValue('--w-accent')

  it('forces a scheme, switching to the theme’s counterpart', () => {
    const light = render('light')
    expect(accent(light)).toBe('#4f46e5')
    expect(light.attributes('data-scheme')).toBe('light')
    const dark = render('dark')
    expect(accent(dark)).toBe('#818cf8')
    expect(dark.attributes()).toMatchObject({ 'data-scheme': 'dark', 'data-theme': 'brand-dark' })
  })

  it('follows the device by default, live', async () => {
    deviceDark = true
    const wrapper = render()
    expect(wrapper.attributes('data-scheme')).toBe('dark')
    deviceDark = false
    changeListeners.forEach((fn) => fn())
    await nextTick()
    expect(wrapper.attributes('data-scheme')).toBe('light')
    expect(accent(wrapper)).toBe('#4f46e5')
  })

  it('picks variants by scheme', () => {
    const definition = {
      ...productCard,
      variants: [{ id: 'night', label: 'Night', when: { scheme: 'dark' }, overrides: { image: { hidden: true } } }],
    }
    const wrapper = (scheme) => mount(Widget, { props: { kit, definition, data: makeProducts()[0], context: makeShop(), scheme } })
    expect(wrapper('dark').attributes('data-variant')).toBe('night')
    expect(wrapper('light').attributes('data-variant')).toBe('base')
  })
})

describe('dark mode warnings', () => {
  const withDark = createKit({ sources: [productSource, actionsSource], themes: [lightTheme, darkTheme] })
  const pinned = {
    ...productCard,
    vars: { '--w-bg': '#ffffff', '--w-accent': '#c2410c' },
    variants: [
      { id: 'loud', label: 'Loud', when: { size: ['sm'] }, vars: { '--w-text': '#000' } },
      { id: 'night', label: 'Night', when: { scheme: 'dark' }, vars: { '--w-text': '#eee' } },
    ],
  }

  it('warn when a widget pins colours its kit’s dark theme changes, but not for accents or scheme variants', () => {
    const issues = validateDefinition(withDark, pinned)
    expect(issues.map((i) => [i.severity, i.variant, i.message.slice(0, 14)])).toEqual([
      ['warning', undefined, 'Sets --w-bg it'],
      ['warning', 'loud', 'Sets --w-text '],
    ])
    expect(hasErrors(issues)).toBe(false)
  })

  it('are silenced by fixedColors, and absent when the kit has no dark theme', () => {
    expect(validateDefinition(withDark, { ...pinned, fixedColors: true })).toEqual([])
    expect(validateDefinition(makeKit(), pinned)).toEqual([])
  })

  it('reject unknown schemes in rules', () => {
    const issues = validateDefinition(withDark, { ...productCard, variants: [{ id: 'x', label: 'X', when: { scheme: 'dusk' } }] })
    expect(issues.map((i) => i.message)).toContain('Unknown scheme "dusk"')
    expect(hasErrors(issues)).toBe(true)
  })
})

describe('light-dark()', () => {
  it('parses and builds values, respecting nested commas', () => {
    expect(parseLightDark('light-dark(#fff, #111)')).toEqual(['#fff', '#111'])
    expect(parseLightDark('light-dark(var(--w-text, #000), rgb(1, 2, 3))')).toEqual(['var(--w-text, #000)', 'rgb(1, 2, 3)'])
    expect(parseLightDark('#fff')).toBeUndefined()
    expect(parseLightDark('light-dark(#fff)')).toBeUndefined()
    expect(lightDark('#fff', '#111')).toBe('light-dark(#fff, #111)')
  })

  it('works inside widgets, which set color-scheme on their root', () => {
    const kit = createKit({ sources: [productSource] })
    const definition = { ...productCard, variants: undefined }
    const scheme = (s) =>
      mount(Widget, { props: { kit, definition, data: makeProducts()[0], context: makeShop(), scheme: s } }).element.style.getPropertyValue(
        'color-scheme',
      )
    expect(scheme('dark')).toBe('dark')
    expect(scheme('light')).toBe('light')
  })

  it('counts as following dark mode, so pinned colours written with it don’t warn', () => {
    const kit = createKit({ sources: [productSource, actionsSource], themes: [lightTheme, darkTheme] })
    expect(validateDefinition(kit, { ...productCard, vars: { '--w-bg': lightDark('#fff', '#18181b') } })).toEqual([])
  })
})
