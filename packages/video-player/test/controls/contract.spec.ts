import { describe, it, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import PlayButton from '@/controls/PlayButton.vue'
import MuteButton from '@/controls/MuteButton.vue'
import FullscreenButton from '@/controls/FullscreenButton.vue'
import LoopButton from '@/controls/LoopButton.vue'
import PipButton from '@/controls/PipButton.vue'
import CaptionsButton from '@/controls/CaptionsButton.vue'
import QualityButton from '@/controls/QualityButton.vue'
import PlaybackRateButton from '@/controls/PlaybackRateButton.vue'
import TimeDisplay from '@/controls/TimeDisplay.vue'
import Buffering from '@/controls/Buffering.vue'
import type { PlayerHandle } from '@/types/player'

function handle(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return {
    isPlaying: false,
    hasEnded: false,
    isError: false,
    isMuted: false,
    isAudible: true,
    isLooping: false,
    isFullscreen: false,
    isBuffering: false,
    isLive: false,
    currentTime: 0,
    duration: 0,
    supportsPip: false,
    isPipActive: false,
    supportsCaptions: false,
    captionTracks: [],
    activeCaptionIndex: null,
    supportsQuality: false,
    qualityLevels: [],
    currentQualityHeight: null,
    isAutoQuality: true,
    supportsPlaybackRate: false,
    currentPlaybackRate: 1,
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleLoop: vi.fn(),
    togglePip: vi.fn(),
    setCaptionTrack: vi.fn(),
    setQuality: vi.fn(),
    setPlaybackRate: vi.fn(),
    retry: vi.fn(),
    replay: vi.fn(),
    ...overrides,
  } as unknown as PlayerHandle
}

/** Each of these renders only when the player says it can do the thing, so an unsupported capability leaves no dead button behind. */
const CAPABILITY_GATED: Array<[string, Component, keyof PlayerHandle]> = [
  ['PipButton', PipButton, 'supportsPip'],
  ['CaptionsButton', CaptionsButton, 'supportsCaptions'],
  ['QualityButton', QualityButton, 'supportsQuality'],
  ['PlaybackRateButton', PlaybackRateButton, 'supportsPlaybackRate'],
]

describe('capability gating', () => {
  it.each(CAPABILITY_GATED)('%s renders nothing when unsupported', (_name, component, flag) => {
    const wrapper = mount(component, { props: { player: handle({ [flag]: false } as Partial<PlayerHandle>) } })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it.each(CAPABILITY_GATED)('%s renders once supported', (_name, component, flag) => {
    const wrapper = mount(component, { props: { player: handle({ [flag]: true } as Partial<PlayerHandle>) } })
    expect(wrapper.find('button').exists()).toBe(true)
  })
})

/** A control with no player at all must still render inertly rather than throwing on access. */
describe('no player attached', () => {
  it.each([
    ['PlayButton', PlayButton],
    ['MuteButton', MuteButton],
    ['FullscreenButton', FullscreenButton],
    ['LoopButton', LoopButton],
    ['TimeDisplay', TimeDisplay],
    ['Buffering', Buffering],
  ] as Array<[string, Component]>)('%s mounts and survives a click', async (_name, component) => {
    const wrapper = mount(component, { props: { player: null } })
    const button = wrapper.find('button')
    if (button.exists()) await button.trigger('click')
    expect(wrapper.html()).toBeTruthy()
  })
})

describe('clicking drives the player', () => {
  it.each([
    ['PlayButton', PlayButton, 'togglePlay', {}],
    ['MuteButton', MuteButton, 'toggleMute', {}],
    ['FullscreenButton', FullscreenButton, 'toggleFullscreen', {}],
    ['LoopButton', LoopButton, 'toggleLoop', {}],
    ['PipButton', PipButton, 'togglePip', { supportsPip: true }],
  ] as Array<[string, Component, keyof PlayerHandle, Partial<PlayerHandle>]>)('%s calls %s', async (_name, component, method, extra) => {
    const player = handle(extra)
    const wrapper = mount(component, { props: { player } })

    await wrapper.find('button').trigger('click')

    expect(player[method]).toHaveBeenCalled()
  })
})

describe('labels reflect state', () => {
  it('PlayButton reads Play, Pause, Replay and Retry', () => {
    const label = (overrides: Partial<PlayerHandle>) => mount(PlayButton, { props: { player: handle(overrides) } }).attributes('aria-label')

    expect(label({})).toBe('Play')
    expect(label({ isPlaying: true })).toBe('Pause')
    expect(label({ hasEnded: true })).toBe('Replay')
    expect(label({ isError: true })).toBe('Retry')
  })

  it('CaptionsButton names the active track, or Off', () => {
    const tracks = [{ index: 0, label: 'English', language: 'en' }]
    const off = mount(CaptionsButton, { props: { player: handle({ supportsCaptions: true, captionTracks: tracks }) } })
    expect(off.attributes('aria-label')).toBe('Captions: Off')

    const on = mount(CaptionsButton, { props: { player: handle({ supportsCaptions: true, captionTracks: tracks, activeCaptionIndex: 0 }) } })
    expect(on.attributes('aria-label')).toBe('Captions: English')
    expect(on.classes()).toContain('mlv-control-btn--active')
  })

  it('PlaybackRateButton shows the rate and marks anything but 1x active', () => {
    const normal = mount(PlaybackRateButton, { props: { player: handle({ supportsPlaybackRate: true }) } })
    expect(normal.text()).toBe('1×')
    expect(normal.classes()).not.toContain('mlv-control-btn--active')

    const fast = mount(PlaybackRateButton, { props: { player: handle({ supportsPlaybackRate: true, currentPlaybackRate: 1.5 }) } })
    expect(fast.text()).toBe('1.5×')
    expect(fast.classes()).toContain('mlv-control-btn--active')
  })

  it('TimeDisplay shows elapsed over duration, or a Live badge', () => {
    const timed = mount(TimeDisplay, { props: { player: handle({ currentTime: 65, duration: 3725 }) } })
    expect(timed.text().replace(/\s+/g, ' ')).toContain('1:05')
    expect(timed.text()).toContain('1:02:05')

    const live = mount(TimeDisplay, { props: { player: handle({ isLive: true }) } })
    expect(live.text()).toContain('Live')
    expect(live.classes()).toContain('mlv-time-display--live')
  })

  it('Buffering renders only while buffering', () => {
    expect(
      mount(Buffering, { props: { player: handle() } })
        .find('.mlv-buffering')
        .exists(),
    ).toBe(false)
    expect(
      mount(Buffering, { props: { player: handle({ isBuffering: true }) } })
        .find('.mlv-buffering')
        .exists(),
    ).toBe(true)
  })
})

describe('scoped slots expose the control state', () => {
  it('PlayButton hands out its status flags', () => {
    const render = (overrides: Partial<PlayerHandle>) =>
      mount(PlayButton, {
        props: { player: handle(overrides) },
        slots: { default: '<span class="probe">{{ params.isPlaying }}/{{ params.hasEnded }}/{{ params.isError }}</span>' as never },
      })
        .find('.probe')
        .text()

    expect(render({ isPlaying: true })).toBe('true/false/false')
    expect(render({ hasEnded: true })).toBe('false/true/false')
  })

  it('CaptionsButton hands out the track list and active index', () => {
    const tracks = [{ index: 0, label: 'English', language: 'en' }]
    const wrapper = mount(CaptionsButton, {
      props: { player: handle({ supportsCaptions: true, captionTracks: tracks, activeCaptionIndex: 0 }) },
      slots: { default: '<span class="probe">{{ params.currentLabel }}/{{ params.tracks.length }}/{{ params.activeIndex }}</span>' as never },
    })
    expect(wrapper.find('.probe').text()).toBe('English/1/0')
  })
})
