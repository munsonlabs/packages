import { keepLibrary } from '@munsonlabs/sigil'
import type { ResolvedIcon } from '@munsonlabs/sigil'

/**
 * Every icon the built-in HUD and controls draw, as inline SVG, keyed by the name a page can override.
 * `<Icon>` always resolves these with `library="mlv"`, so an override pinned to the `mlv` library
 * (`override(name, svg, { library: 'mlv' })`) is what reaches them - a host's own unscoped override of
 * the same short name never collides, and the names need no prefix to stay out of its way.
 */
export const ICONS: Record<string, string> = {
  back: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
  captions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M9.5 10.5a2 2 0 0 0-3.5 1.3v.4a2 2 0 0 0 3.5 1.3"/><path d="M17.5 10.5a2 2 0 0 0-3.5 1.3v.4a2 2 0 0 0 3.5 1.3"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  controls:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2.5" fill="currentColor" stroke="none"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z"/></svg>',
  'fullscreen-enter':
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  'fullscreen-exit':
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  pip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  quality:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 14v-4M12 14V8M17 14v-2"/></svg>',
  replay:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
  'skip-next': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
  'volume-mute':
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  'volume-on':
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>',
}

let stop: (() => void) | undefined

/**
 * Registers the player's icons with the shared sigil registry as the `mlv` library, once per page.
 * The source answers synchronously from the inline strings, so icons paint in the same frame as the
 * controls and render during SSR.
 *
 * A page that registers its own `mlv` library keeps it, whether it did so before or after the player
 * loaded - that is the wholesale way to reskin the player, and `override('play', svg, { library: 'mlv' })`
 * the per-icon way. `keepLibrary` is what puts the built-ins back should that library be unregistered
 * again, so `unregister('mlv')` means "back to the player's own icons" rather than blank controls.
 */
export function registerIcons(): void {
  stop ??= keepLibrary('mlv', {
    resolveSync({ name }): ResolvedIcon | undefined {
      const html = ICONS[name]
      if (html === undefined) {
        return undefined
      }
      return { tag: 'span', className: 'icon-svg', html }
    },
  })
}
