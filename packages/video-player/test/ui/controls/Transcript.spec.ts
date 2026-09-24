import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import Transcript from '@/ui/controls/Transcript.vue'
import type { PlayerHandle, TranscriptCue } from '@/types/player'

const CUES: TranscriptCue[] = [
  { time: 0, text: 'Intro' },
  { time: 10, text: 'First point' },
  { time: 30, end: 40, text: 'Second point' },
]

function makePlayer(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return reactive({
    currentTime: 0,
    duration: 100,
    isPlaying: true,
    seek: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    ...overrides,
  }) as unknown as PlayerHandle
}

describe('Transcript — rendering', () => {
  it('renders one button per cue with formatted time and text', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: CUES } })
    const cues = wrapper.findAll('.ml-video-transcript__cue')
    expect(cues).toHaveLength(3)
    expect(cues[1].text()).toContain('0:10')
    expect(cues[1].text()).toContain('First point')
  })

  it('parses a JSON string cues attribute (custom-element form)', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: JSON.stringify(CUES) } })
    expect(wrapper.findAll('.ml-video-transcript__cue')).toHaveLength(3)
  })

  it('renders nothing for invalid JSON instead of throwing', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: '{not json' } })
    expect(wrapper.findAll('.ml-video-transcript__cue')).toHaveLength(0)
  })
})

describe('Transcript — clicking a cue', () => {
  it('seeks to the cue as a percentage of total and plays', async () => {
    const player = makePlayer()
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.ml-video-transcript__cue')[1].trigger('click')
    expect(player.seek).toHaveBeenCalledWith(10)
    expect(player.play).toHaveBeenCalled()
  })

  it('also starts playback when paused', async () => {
    const player = makePlayer({ isPlaying: false })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.ml-video-transcript__cue')[1].trigger('click')
    expect(player.seek).toHaveBeenCalledWith(10)
    expect(player.play).toHaveBeenCalled()
  })

  it('still seeks to the cue time while duration is unknown', async () => {
    const player = makePlayer({ isPlaying: false, duration: 0 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.ml-video-transcript__cue')[1].trigger('click')
    expect(player.seek).toHaveBeenCalledWith(10)
    expect(player.play).toHaveBeenCalled()
  })
})

describe('Transcript — active cue highlighting', () => {
  it('highlights the last cue at or before the playhead, reactively', async () => {
    const player = makePlayer({ currentTime: 12 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    expect(wrapper.findAll('.ml-video-transcript__cue')[1].classes()).toContain('ml-video-transcript__cue--active')

    ;(player as unknown as { currentTime: number }).currentTime = 35
    await wrapper.vm.$nextTick()
    const cues = wrapper.findAll('.ml-video-transcript__cue')
    expect(cues[2].classes()).toContain('ml-video-transcript__cue--active')
    expect(cues[2].attributes('aria-current')).toBe('true')
    expect(cues[1].classes()).not.toContain('ml-video-transcript__cue--active')
  })

  it('highlights nothing in the gap past a cue with an explicit end', async () => {
    const player = makePlayer({ currentTime: 45 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    expect(wrapper.findAll('.ml-video-transcript__cue--active')).toHaveLength(0)
  })
})

describe('attribute fallthrough', () => {
  it('applies a class to the list instead of warning about multiple roots', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(Transcript, {
      props: { player: makePlayer(), cues: CUES },
      attrs: { class: 'my-transcript' },
    })

    expect(wrapper.find('ol').classes()).toContain('my-transcript')
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Extraneous non-props attributes')
    warn.mockRestore()
  })
})
