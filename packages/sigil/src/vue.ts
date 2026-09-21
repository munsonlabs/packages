import { defineComponent, h, shallowRef, watch } from 'vue'
import type { ResolvedIcon } from './types/index'
import { watchIcon } from './watch'

/**
 * `<Sigil name="…" library="…" variant="…">`: renders the icon the registry resolves for those
 * props, updating live whenever a prop or the registry changes.
 */
export const Sigil = defineComponent({
  name: 'Sigil',
  inheritAttrs: false,
  props: {
    name: { type: String, required: true },
    library: { type: String, default: undefined },
    variant: { type: String, default: undefined },
  },
  setup(props, { attrs }) {
    const icon = shallowRef<ResolvedIcon | undefined>()

    watch(
      () => [props.name, props.library, props.variant] as const,
      ([name, library, variant], _previous, onCleanup) => {
        const stop = watchIcon(name, { library, variant }, (resolved) => {
          icon.value = resolved
        })
        onCleanup(stop)
      },
      { immediate: true },
    )

    return () => {
      const resolved = icon.value
      if (!resolved) {
        return null
      }

      const data = { ...attrs, class: [resolved.className, attrs.class], 'aria-hidden': 'true' }
      if (resolved.html !== undefined) {
        return h(resolved.tag, { ...data, innerHTML: resolved.html })
      }
      return h(resolved.tag, data, resolved.text)
    }
  },
})
