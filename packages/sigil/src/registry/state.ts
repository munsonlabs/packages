import type { IconOverride, IconSource } from '../types/index'

/**
 * Everything a registry knows, in one record. Nothing outside the registry folder should hold a
 * reference to this.
 */
export interface State {
  readonly overrides: Map<string, IconOverride>
  readonly libraryOverrides: Map<string, Map<string, IconOverride>>
  readonly libraries: Map<string, IconSource>
  readonly listeners: Set<() => void>
  defaultLibrary: string | null
}

/**
 * A fresh, empty state: no overrides, no libraries, no listeners, no default.
 */
export function createState(): State {
  return {
    overrides: new Map(),
    libraryOverrides: new Map(),
    libraries: new Map(),
    listeners: new Set(),
    defaultLibrary: null,
  }
}

/**
 * Tells every subscriber that something changed.
 */
export function notify({ listeners }: State): void {
  for (const listener of listeners) {
    listener()
  }
}
