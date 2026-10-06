import { keepLibrary } from '@munsonlabs/sigil'
import type { ResolvedIcon } from '@munsonlabs/sigil'

const STROKE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

export const ICONS: Record<string, string> = {
  again: `<svg ${STROKE}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  cancel: `<svg ${STROKE}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  'caption-bottom': `<svg ${STROKE}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16h10"/></svg>`,
  'caption-middle': `<svg ${STROKE}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12h10"/></svg>`,
  'caption-top': `<svg ${STROKE}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10"/></svg>`,
  copy: `<svg ${STROKE}><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  download: `<svg ${STROKE}><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`,
  'end-card': `<svg ${STROKE}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>`,
  logo: `<svg ${STROKE}><path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13"/></svg>`,
  scissors: `<svg ${STROKE}><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>`,
  share: `<svg ${STROKE}><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>`,
}

let stop: (() => void) | undefined

/**
 * Registers the editor's icons with sigil as the splice library, once per page. A page can swap
 * one with override(name, svg, { library: 'splice' }) or register its own splice library to swap
 * them all, and unregistering it brings these back.
 */
export function registerIcons(): void {
  stop ??= keepLibrary('splice', {
    resolveSync({ name }): ResolvedIcon | undefined {
      const html = ICONS[name]
      return html === undefined ? undefined : { tag: 'span', className: 'icon-svg', html }
    },
  })
}
