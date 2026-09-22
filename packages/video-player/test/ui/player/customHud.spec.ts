import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'
import PlayButton from '@/ui/controls/PlayButton.vue'

vi.mock('@/adapters/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/adapters/index')>()
  return { ...actual, resolvePlatform: () => ({ key: 'html5', embed: false }) }
})

describe('custom HUD slot', () => {
  it('renders slot content and wires it to this player through context', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'https://example.com/a.mp4', controls: false },
      slots: { default: PlayButton },
      attachTo: document.body,
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-label')).toBe('Play')
    wrapper.unmount()
  })

  it('renders no custom HUD wrapper when nothing was passed', () => {
    const wrapper = mount(VideoPlayer, { props: { src: 'https://example.com/a.mp4', controls: false } })
    expect(wrapper.find('.player__custom-hud').exists()).toBe(false)
    wrapper.unmount()
  })
})
