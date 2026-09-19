import type { IconSource, LibraryConfig } from '../types/index'

/**
 * Whether a `register` argument is a ready-made source (something with `resolveSync` or `resolve`)
 * rather than a description of one. Ready sources are stored as they are; descriptions go through
 * `loadKind` to become sources.
 */
export function isSource(config: LibraryConfig): config is IconSource {
  return 'resolveSync' in config || 'resolve' in config
}

/**
 * Turns a library description into a source by picking the kind from the description's shape and
 * loading that kind's module on demand. The dynamic imports are the reason unused kinds never reach
 * a consumer's bundle: a page that only registers fonts never downloads the SVG code.
 *
 * Each shape must be unambiguous - `resolver` or `icons` means SVG, `className` means font - so a
 * new kind needs a key no other kind uses. Anything else is a programming error and rejects.
 */
export async function loadKind(name: string, config: Exclude<LibraryConfig, IconSource>): Promise<IconSource> {
  if ('resolver' in config || 'icons' in config) {
    const { svgLibrary } = await import('../sources/svg')
    return svgLibrary(config)
  }

  if ('className' in config) {
    const { fontLibrary } = await import('../sources/font')
    return fontLibrary(config)
  }

  throw new Error(`Unrecognised library config for "${name}"`)
}
