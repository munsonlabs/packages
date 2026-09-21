import type { IconSource, LibraryConfig } from '../types/index'

/**
 * Whether a `register` argument is a ready-made source (something with `resolveSync` or
 * `resolve`) rather than a description of one.
 */
export function isSource(config: LibraryConfig): config is IconSource {
  return 'resolveSync' in config || 'resolve' in config
}

/**
 * Turns a library description into a source by picking the kind from the description's shape
 * and loading that kind's module on demand.
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
