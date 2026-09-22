import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import VideoCard from '@/ui/stage/VideoCard.vue'
import PlayButton from '@/ui/controls/PlayButton.vue'

vi.mock('@/adapters/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/adapters/index')>()
  return { ...actual, resolvePlatform: () => ({ key: 'html5', embed: false }) }
})

const VIDEO = { src: 'https://example.com/a.mp4', controls: false }

describe('a custom HUD passed to VideoCard', () => {
  it('reaches the player, and the control finds it through context', () => {
    const wrapper = mount(VideoCard, {
      props: { ...VIDEO, lazy: false },
      slots: { default: PlayButton },
      attachTo: document.body,
    })

    const button = wrapper.find('.mlv-play-button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-label')).toBe('Play')
    wrapper.unmount()
  })

  it('waits for the player rather than drawing over the lazy placeholder', () => {
    const wrapper = mount(VideoCard, {
      props: { ...VIDEO, lazy: true },
      slots: { default: PlayButton },
      attachTo: document.body,
    })

    expect(wrapper.find('.placeholder').exists()).toBe(true)
    expect(wrapper.find('.mlv-play-button').exists()).toBe(false)
    wrapper.unmount()
  })
})
