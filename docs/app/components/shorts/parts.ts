import { inject, provide, type Component, type InjectionKey, type ShallowRef } from 'vue'

export type ShortsParts = Record<string, Component>

const PartsKey: InjectionKey<ShallowRef<ShortsParts | null>> = Symbol('shorts-parts')

export function provideShortsParts(parts: ShallowRef<ShortsParts | null>): void {
  provide(PartsKey, parts)
}

export function useShortsParts(): ShortsParts {
  const parts = inject(PartsKey)
  if (!parts?.value) throw new Error('[shorts] the player components have not loaded yet')
  return parts.value
}
