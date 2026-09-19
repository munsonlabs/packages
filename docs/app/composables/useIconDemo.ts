/**
 * Loads the workspace build of @munsonlabs/sigil and registers every source the docs
 * examples use, once per page load. All example components share this registry.
 */
let pending: Promise<void> | undefined

// Heroicons v2 (24/solid, MIT) - real icon paths instead of hand-drawn placeholders.
export const DEMO_OVERRIDES = {
  logo: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clip-rule="evenodd"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>',
} satisfies Record<string, string>

export const BRAND_OVERRIDES = {
  rocket:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 0 1 .75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 0 1 9.75 22.5a.75.75 0 0 1-.75-.75v-4.131A15.838 15.838 0 0 1 6.382 15H2.25a.75.75 0 0 1-.75-.75 6.75 6.75 0 0 1 7.815-6.666ZM15 6.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" clip-rule="evenodd"/><path d="M5.26 17.242a.75.75 0 1 0-.897-1.203 5.243 5.243 0 0 0-2.05 5.022.75.75 0 0 0 .625.627 5.243 5.243 0 0 0 5.022-2.051.75.75 0 1 0-1.202-.897 3.744 3.744 0 0 1-3.008 1.51c0-1.23.592-2.323 1.51-3.008Z"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z"/><path fill-rule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clip-rule="evenodd"/></svg>',
} satisfies Record<string, string>

/** Matches the `register('app', { icons: { heart, lock, bell } })` example - a static SVG map. */
const APP_ICONS: Record<string, string | Record<string, string>> = {
  heart: DEMO_OVERRIDES.heart,
  lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clip-rule="evenodd"/></svg>',
  bell: {
    default: BRAND_OVERRIDES.bell,
    active:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z"/><path fill-rule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clip-rule="evenodd"/></svg>',
  },
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
  const EMOJI: Record<string, string> = { heart: '❤️', star: '⭐', check: '✅', bell: '🔔', home: '🏠' }
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
