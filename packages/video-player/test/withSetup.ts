import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

export function withSetup<T>(composable: () => T, provide?: Record<string, unknown>) {
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
    { global: { provide: provide ?? {} } },
  )
  return { result, wrapper }
}
