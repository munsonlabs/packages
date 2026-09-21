import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import MuteButton from '@/components/controls/MuteButton.vue'
import Buffering from '@/components/controls/Buffering.vue'
import Scrubber from '@/components/controls/Scrubber.vue'
import VolumeSlider from '@/components/controls/VolumeSlider.vue'
import type { PlayerHandle } from '@/types/player'

function handle(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return {
    isMuted: false,
    isAudible: true,
    isBuffering: true,
    isLive: false,
    duration: 100,
    currentTime: 0,
    currentVolume: 1,
    bufferedDisplay: 0,
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
    seek: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    ...overrides,
  } as unknown as PlayerHandle
}

describe('control accessibility', () => {
  it('reports mute as a pressed toggle', () => {
    const off = mount(MuteButton, { props: { player: handle() } })
    expect(off.attributes('aria-pressed')).toBe('false')

    const on = mount(MuteButton, { props: { player: handle({ isMuted: true }) } })
    expect(on.attributes('aria-pressed')).toBe('true')
  })

  it('announces buffering', () => {
    const wrapper = mount(Buffering, { props: { player: handle() } })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('Buffering')
  })

  it('lets a consumer relabel the range controls', () => {
    const scrubber = mount(Scrubber, { props: { player: handle() }, attrs: { 'aria-label': 'Chercher' } })
    expect(scrubber.find('input').attributes('aria-label')).toBe('Chercher')

    const volume = mount(VolumeSlider, { props: { player: handle() }, attrs: { 'aria-label': 'Volumen' } })
    expect(volume.find('input').attributes('aria-label')).toBe('Volumen')
  })
})
