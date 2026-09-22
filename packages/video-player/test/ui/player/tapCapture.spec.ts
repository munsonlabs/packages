import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'

vi.mock('@/adapters/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/adapters/index')>()
  return { ...actual, resolvePlatform: () => ({ key: 'html5', embed: false }) }
})

async function mountStarted() {
  const wrapper = mount(VideoPlayer, { props: { src: 'https://example.com/a.mp4' }, attachTo: document.body })
  const player = wrapper.vm as unknown as { hasStarted: boolean }
  Object.assign(wrapper.vm.$ as never, {})
  return { wrapper, player }
}

describe('the tap-to-reveal layer', () => {
  it('is gone while the controls popup is open, so dismissing it cannot reveal it again', async () => {
    const { wrapper } = await mountStarted()
    const vm = wrapper.vm as unknown as { player: { hasStarted: boolean }; hud: { isOpen: boolean; openControls: () => void } }

    vm.player.hasStarted = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.overlay__tap-capture').exists()).toBe(true)

    vm.hud.openControls()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.overlay__tap-capture').exists()).toBe(false)
    wrapper.unmount()
  })
})
