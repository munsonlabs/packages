import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'
import type { PlayerHandle } from '@/types/player'

vi.mock('@/adapters/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/adapters/index')>()
  return { ...actual, resolvePlatform: () => ({ key: 'html5', embed: false }) }
})

describe('setControls()', () => {
  it('hides the HUD over the controls prop and gives the prop back its say with null', async () => {
    const wrapper = mount(VideoPlayer, { props: { src: 'https://example.com/a.mp4' }, attachTo: document.body })
    const handle = wrapper.vm as unknown as PlayerHandle
    expect(wrapper.find('.overlay__hud').exists()).toBe(true)
    expect(handle.hasControls).toBe(true)

    handle.setControls(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.overlay__hud').exists()).toBe(false)
    expect(handle.hasControls).toBe(false)

    handle.setControls(null)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.overlay__hud').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the HUD over controls: false with true', async () => {
    const wrapper = mount(VideoPlayer, { props: { src: 'https://example.com/a.mp4', controls: false }, attachTo: document.body })
    const handle = wrapper.vm as unknown as PlayerHandle
    expect(wrapper.find('.overlay__hud').exists()).toBe(false)
    handle.setControls(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.overlay__hud').exists()).toBe(true)
    wrapper.unmount()
  })
})
