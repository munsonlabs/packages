export type Core = typeof import('@/index')

let core: Promise<Core> | undefined

/**
 * Imports splice's core, and Mediabunny with it, the first time an editor opens and reuses it after
 * that.
 */
export function loadCore(): Promise<Core> {
  core ??= import('@/index')
  return core
}
