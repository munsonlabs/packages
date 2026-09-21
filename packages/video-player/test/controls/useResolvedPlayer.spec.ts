import { describe, it, expect, vi, afterEach } from 'vite-plus/test'
import { defineComponent, h, provide, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/controls/useResolvedPlayer'
import { PlayerKey } from '@/player/playerContext'
import { exposePlayerOnElement } from '@/utils/exposePlayerOnElement'
import type { PlayerHandle } from '@/types/player'

function makeHandle(label: string): PlayerHandle {
  return { togglePlay: vi.fn(), isPlaying: false, label } as unknown as PlayerHandle
}

const Probe = defineComponent({
  props: { player: { type: Object, default: undefined }, for: { type: String, default: undefined } },
  setup(props) {
    const resolved = useResolvedPlayer(props as ResolvedPlayerProps)
    return () => h('span', (resolved.value as unknown as { label?: string } | null)?.label ?? 'none')
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useResolvedPlayer', () => {
  it('prefers an explicit player prop', () => {
    const wrapper = mount(Probe, { props: { player: makeHandle('prop') } })
    expect(wrapper.text()).toBe('prop')
  })

  it('falls back to the enclosing player context', () => {
    const Host = defineComponent({
      setup() {
        provide(PlayerKey, makeHandle('context') as never)
        return () => h(Probe)
      },
    })
    expect(mount(Host).text()).toBe('context')
  })

  it('resolves by id once the element carries a player surface', async () => {
    const host = document.createElement('div')
    host.id = 'target'
    exposePlayerOnElement(host, makeHandle('by-id'))
    document.body.appendChild(host)

    const wrapper = mount(Probe, { props: { for: 'target' }, attachTo: document.body })
    await nextTick()

    expect(wrapper.text()).toBe('by-id')
  })

  it('ignores an element that is not a player rather than returning it', async () => {
    const decoy = document.createElement('div')
    decoy.id = 'decoy'
    document.body.appendChild(decoy)

    const wrapper = mount(Probe, { props: { for: 'decoy' }, attachTo: document.body })
    await nextTick()

    expect(wrapper.text()).toBe('none')
  })

  it('picks up a player that only appears after the control mounted', async () => {
    const wrapper = mount(Probe, { props: { for: 'later' }, attachTo: document.body })
    await nextTick()
    expect(wrapper.text()).toBe('none')

    const host = document.createElement('div')
    host.id = 'later'
    exposePlayerOnElement(host, makeHandle('late'))
    document.body.appendChild(host)
    await vi.waitFor(() => expect(wrapper.text()).toBe('late'))
  })

  it('prefers the id over the surrounding context', async () => {
    const host = document.createElement('div')
    host.id = 'explicit'
    exposePlayerOnElement(host, makeHandle('by-id'))
    document.body.appendChild(host)

    const Host = defineComponent({
      setup() {
        provide(PlayerKey, makeHandle('context') as never)
        return () => h(Probe, { for: 'explicit' })
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    await nextTick()

    expect(wrapper.text()).toBe('by-id')
  })
})
