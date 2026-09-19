import type { IconOverride, IconSource } from '../types/index'

/**
 * Everything a registry knows, in one record. The maps are mutated in place by the functions in
 * `registry/index.ts`; nothing outside the registry folder should hold a reference to this. Keeping
 * the state separate from the behaviour is what lets `lookup.ts` and `lazy.ts` be plain functions
 * that take it as an argument.
 */
export interface State {
  readonly overrides: Map<string, IconOverride>
  readonly libraries: Map<string, IconSource>
  readonly listeners: Set<() => void>
  defaultLibrary: string | null
}

/**
 * A fresh, empty state: no overrides, no libraries, no listeners, no default. One is created per
 * registry instance, so `createSigil()` twice never shares anything.
 */
export function createState(): State {
  return {
    overrides: new Map(),
    libraries: new Map(),
    listeners: new Set(),
    defaultLibrary: null,
  }
}

/**
 * Tells every subscriber that something changed. Listeners get no payload: they re-resolve whatever
 * they render and compare for themselves, which keeps the registry ignorant of what depends on it.
 */
export function notify({ listeners }: State): void {
  for (const listener of listeners) {
    listener()
  }
}
