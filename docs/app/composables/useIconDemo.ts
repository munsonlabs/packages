// Heroicons v2 (24/solid, MIT).
import logo from '~/assets/icons/logo.svg?raw'
import heart from '~/assets/icons/heart.svg?raw'
import check from '~/assets/icons/check.svg?raw'
import rocket from '~/assets/icons/rocket.svg?raw'
import camera from '~/assets/icons/camera.svg?raw'
import bell from '~/assets/icons/bell.svg?raw'
import bellActive from '~/assets/icons/bell-active.svg?raw'
import lock from '~/assets/icons/lock.svg?raw'

/**
 * Loads the workspace build of @munsonlabs/sigil and registers every source the docs
 * examples use, once per page load. All example components share this registry.
 */
let pending: Promise<void> | undefined

export const DEMO_OVERRIDES = { logo, heart, check } satisfies Record<string, string>

export const BRAND_OVERRIDES = { rocket, camera, bell } satisfies Record<string, string>

/** Matches the `register('app', { icons: { heart, lock, bell } })` example - a static SVG map. */
const APP_ICONS: Record<string, string | Record<string, string>> = {
  heart,
  lock,
  bell: { default: bell, active: bellActive },
}

/** Stands in for a fetched icons.json: names to a URL, or to a variant → URL map. */
const ICONS_JSON: Promise<Record<string, string | Record<string, string>>> = Promise.resolve({
  anchor: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/anchor.svg`,
  bell: {
    default: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/bell.svg`,
    active: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/bell-ring.svg`,
    muted: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/bell-off.svg`,
  },
  bookmark: {
    default: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/bookmark.svg`,
    active: `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/bookmark-check.svg`,
  },
})

const LUCIDE = (name: string) => `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/${name}.svg`
const strip = (svg: SVGSVGElement) => {
  svg.removeAttribute('width')
  svg.removeAttribute('height')
}

async function registerDemoSources() {
  const { sigil, register, override, use } = await import('@munsonlabs/sigil')
  await import('@munsonlabs/sigil/element')
  if (sigil.libraries.includes('lucide')) return

  const style = document.createElement('style')
  style.textContent =
    '@font-face{font-family:"Material Icons Demo";src:url("https://fonts.gstatic.com/s/materialicons/v143/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2") format("woff2");font-display:block}' +
    '.demo-material{font-family:"Material Icons Demo";font-feature-settings:"liga";line-height:1}'
  document.head.appendChild(style)

  override(DEMO_OVERRIDES)
  const EMOJI: Record<string, string> = { search: '🔍', heart: '❤️', star: '⭐', check: '✅', bell: '🔔', home: '🏠' }
  void register('emoji', { resolveSync: ({ name }) => (name in EMOJI ? { tag: 'span', className: 'demo-glyph', text: EMOJI[name] } : undefined) })

  await Promise.all([
    register('lucide', { resolver: LUCIDE, mutator: strip }, { default: true }),
    register('glyphs', { className: 'demo-glyph', glyphs: { sun: '☀', moon: '☾', star: '★' } }),
    register('toggle', { className: 'demo-glyph', glyphs: (_name, variant) => (variant === 'active' ? '★' : '☆') }),
    register('json', { icons: ICONS_JSON, mutator: strip }),
    register('app', { icons: APP_ICONS }),
    register('material', {
      className: 'demo-material',
      glyphs: { home: 'home', search: 'search', settings: 'settings', heart: 'favorite', star: 'star', bell: 'notifications' },
    }),
  ])
  use('lucide')
}

export function useIconDemo() {
  const ready = ref(false)
  const failed = ref(false)
  onMounted(async () => {
    try {
      pending ??= registerDemoSources()
      await pending
      ready.value = true
    } catch {
      failed.value = true
    }
  })
  return { ready, failed }
}
