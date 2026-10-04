/**
 * Reel's core, Mediabunny behind it: `import()`ed the first time any picker opens, then shared.
 */
export type Core = typeof import('@/index')

let core: Promise<Core> | undefined

export function loadCore(): Promise<Core> {
  core ??= import('@/index')
  return core
}
