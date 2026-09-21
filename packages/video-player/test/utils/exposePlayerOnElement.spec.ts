import { describe, it, expect, vi } from 'vite-plus/test'
import { defineComponent, h, ref, computed, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { exposePlayerOnElement } from '@/utils/exposePlayerOnElement'

function mountExposingPlayer() {
  const current = ref(0)
  const Child = defineComponent({
    setup(_, { expose }) {
      const togglePlay = vi.fn()
      expose({ current: computed(() => current.value), togglePlay })
      return () => h('div')
    },
  })

  const childRef = ref<Record<string, unknown> | null>(null)
  const Parent = defineComponent({ setup: () => () => h(Child, { ref: childRef }) })
  mount(Parent)
  return { player: () => childRef.value!, setCurrent: (v: number) => (current.value = v) }
}

describe('exposePlayerOnElement', () => {
  it('is a no-op when player is null/undefined', () => {
    const el = document.createElement('div')
    expect(() => exposePlayerOnElement(el, null)).not.toThrow()
    expect(() => exposePlayerOnElement(el, undefined)).not.toThrow()
    expect(Object.keys(el)).not.toContain('togglePlay')
  })

  it('copies methods directly onto the element', async () => {
    const el = document.createElement('div')
    const { player } = mountExposingPlayer()
    await nextTick()

    exposePlayerOnElement(el, player())
    ;(el as unknown as { togglePlay: () => void }).togglePlay()

    expect(player().togglePlay).toHaveBeenCalledOnce()
  })

  it('exposes state as a live getter, not a frozen snapshot at exposure time', async () => {
    const el = document.createElement('div')
    const { player, setCurrent } = mountExposingPlayer()
    await nextTick()

    exposePlayerOnElement(el, player())
    expect((el as unknown as { current: number }).current).toBe(0)

    setCurrent(42)
    await nextTick()

    expect((el as unknown as { current: number }).current).toBe(42)
  })

  it('works identically for a plain, non-reactive object (no Vue involved at all)', () => {
    const el = document.createElement('div')
    const seek = vi.fn()

    exposePlayerOnElement(el, { seek, total: 100 })
    ;(el as unknown as { seek: (v: number) => void }).seek(50)

    expect(seek).toHaveBeenCalledWith(50)
    expect((el as unknown as { total: number }).total).toBe(100)
  })

  it('defines state properties as enumerable and configurable, not locking the element down', async () => {
    const el = document.createElement('div')
    const { player } = mountExposingPlayer()
    await nextTick()

    exposePlayerOnElement(el, player())

    const descriptor = Object.getOwnPropertyDescriptor(el, 'current')
    expect(descriptor?.enumerable).toBe(true)
    expect(descriptor?.configurable).toBe(true)
  })
})
