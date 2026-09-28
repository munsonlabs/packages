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

type TapVm = {
  player: { hasStarted: boolean; isReady: boolean }
  hud: { isOpen: boolean; showHUD: boolean; openControls: () => void }
}

describe('the tap-to-reveal layer', () => {
  it('stays over the video while the controls popup is open, so an embed iframe never swallows the dismissing tap', async () => {
    const { wrapper } = await mountStarted()
    const vm = wrapper.vm as unknown as TapVm

    vm.player.hasStarted = true
    vm.hud.openControls()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.overlay__tap-capture').exists()).toBe(true)
    wrapper.unmount()
  })

  it('closes the open popup on tap without also firing a reveal tap', async () => {
    const { wrapper } = await mountStarted()
    const vm = wrapper.vm as unknown as TapVm

    vm.player.hasStarted = true
    vm.player.isReady = true
    vm.hud.openControls()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.controls').exists()).toBe(true)

    await wrapper.find('.overlay__tap-capture').trigger('click')

    expect(vm.hud.isOpen).toBe(false)
    const types = (wrapper.emitted('state-change') ?? []).map(([e]) => (e as { type: string }).type)
    expect(types).not.toContain('tap')
    wrapper.unmount()
  })

  it('still reveals the HUD on tap while the popup is closed', async () => {
    const { wrapper } = await mountStarted()
    const vm = wrapper.vm as unknown as TapVm

    vm.player.hasStarted = true
    await wrapper.vm.$nextTick()

    await wrapper.find('.overlay__tap-capture').trigger('click')

    const types = (wrapper.emitted('state-change') ?? []).map(([e]) => (e as { type: string }).type)
    expect(types).toContain('tap')
    wrapper.unmount()
  })
})
