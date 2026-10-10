import { onScopeDispose, ref } from 'vue'

/**
 * `auto` follows the device; `light` and `dark` force one.
 *
 * @typedef {ColorScheme | 'auto'} SchemePreference
 */

const QUERY = '(prefers-color-scheme: dark)'

let preferred
let listeners = 0
let media
const onChange = () => {
  if (preferred && media) preferred.value = media.matches ? 'dark' : 'light'
}

/**
 * The device's colour scheme, kept live. One media query listener is shared by every widget,
 * and removed when the last one goes. Outside a browser it's `light`.
 *
 * @returns {Ref<ColorScheme>}
 */
export function usePreferredScheme() {
  if (!preferred) preferred = ref('light')
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (listeners++ === 0) {
      media = window.matchMedia(QUERY)
      onChange()
      media.addEventListener('change', onChange)
    }
    onScopeDispose(() => {
      if (--listeners === 0) media?.removeEventListener('change', onChange)
    })
  }
  return preferred
}

export const resolveScheme = (preference, device) => (preference === 'light' || preference === 'dark' ? preference : device)

/** A theme's scheme: dark when it says so or another theme names it as its `dark`, otherwise light. */
export const themeScheme = (kit, theme) => theme.scheme ?? (kit.themes.some((t) => t.dark === theme.id) ? 'dark' : 'light')

/**
 * The theme to render with for a scheme. Starting from `id` (or the kit's default):
 * - its own scheme matches: use it;
 * - it has a partner for that scheme (its `dark`, or the light theme naming it as `dark`): use that;
 * - otherwise, when no theme was named, the kit's first theme of that scheme;
 * - otherwise the theme as it is: a named theme with no partner isn't swapped for an unrelated one.
 *
 * @param {Kit} kit
 * @param {string | undefined} id
 * @param {ColorScheme} scheme
 * @returns {Theme}
 */
export function themeForScheme(kit, id, scheme) {
  const base = (id && kit.themes.find((t) => t.id === id)) || kit.themes[0]
  if (themeScheme(kit, base) === scheme) return base
  const partner = scheme === 'dark' ? kit.themes.find((t) => t.id === base.dark) : kit.themes.find((t) => t.dark === base.id)
  return partner ?? (id ? undefined : kit.themes.find((t) => themeScheme(kit, t) === scheme)) ?? base
}
