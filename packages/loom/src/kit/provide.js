import { inject, provide } from 'vue'

const KIT = Symbol('loom-kit')
const CONTEXT = Symbol('loom-context')

/**
 * Makes a kit (and optionally the context its sources get) the default for every `<Widget>` below.
 *
 * @param {Kit} kit
 * @param {unknown} [context]
 */
export function provideKit(kit, context) {
  provide(KIT, kit)
  if (context !== undefined) provide(CONTEXT, context)
}

export function injectKit() {
  return inject(KIT, undefined)
}

export function injectContext() {
  return inject(CONTEXT, undefined)
}
