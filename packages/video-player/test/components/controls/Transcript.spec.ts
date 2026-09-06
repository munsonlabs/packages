import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import Transcript from '@/components/controls/Transcript.vue'
import type { PlayerHandle, TranscriptCue } from '@/types/player'

const CUES: TranscriptCue[] = [
  { time: 0, text: 'Intro' },
  { time: 10, text: 'First point' },
  { time: 30, end: 40, text: 'Second point' },
]

function makePlayer(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return reactive({
    current: 0,
    total: 100,
    isPlaying: true,
    seek: vi.fn(),
    togglePlay: vi.fn(),
    ...overrides,
  }) as unknown as PlayerHandle
}

describe('Transcript — rendering', () => {
  it('renders one button per cue with formatted time and text', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: CUES } })
    const cues = wrapper.findAll('.mlv-transcript__cue')
    expect(cues).toHaveLength(3)
    expect(cues[1].text()).toContain('0:10')
    expect(cues[1].text()).toContain('First point')
  })

  it('parses a JSON string cues attribute (custom-element form)', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: JSON.stringify(CUES) } })
    expect(wrapper.findAll('.mlv-transcript__cue')).toHaveLength(3)
  })

  it('renders nothing for invalid JSON instead of throwing', () => {
    const wrapper = mount(Transcript, { props: { player: makePlayer(), cues: '{not json' } })
    expect(wrapper.findAll('.mlv-transcript__cue')).toHaveLength(0)
  })
})

describe('Transcript — clicking a cue', () => {
  it('seeks to the cue as a percentage of total', async () => {
    const player = makePlayer()
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.mlv-transcript__cue')[1].trigger('click')
    expect(player.seek).toHaveBeenCalledWith(10)
    expect(player.togglePlay).not.toHaveBeenCalled()
  })

  it('also starts playback when paused', async () => {
    const player = makePlayer({ isPlaying: false })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.mlv-transcript__cue')[1].trigger('click')
    expect(player.seek).toHaveBeenCalledWith(10)
    expect(player.togglePlay).toHaveBeenCalled()
  })

  it('only starts playback while duration is still unknown', async () => {
    const player = makePlayer({ isPlaying: false, total: 0 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    await wrapper.findAll('.mlv-transcript__cue')[1].trigger('click')
    expect(player.seek).not.toHaveBeenCalled()
    expect(player.togglePlay).toHaveBeenCalled()
  })
})

describe('Transcript — active cue highlighting', () => {
  it('highlights the last cue at or before the playhead, reactively', async () => {
    const player = makePlayer({ current: 12 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    expect(wrapper.findAll('.mlv-transcript__cue')[1].classes()).toContain('mlv-transcript__cue--active')

    ;(player as unknown as { current: number }).current = 35
    await wrapper.vm.$nextTick()
    const cues = wrapper.findAll('.mlv-transcript__cue')
    expect(cues[2].classes()).toContain('mlv-transcript__cue--active')
    expect(cues[2].attributes('aria-current')).toBe('true')
    expect(cues[1].classes()).not.toContain('mlv-transcript__cue--active')
  })

  it('highlights nothing in the gap past a cue with an explicit end', async () => {
    const player = makePlayer({ current: 45 })
    const wrapper = mount(Transcript, { props: { player, cues: CUES } })
    expect(wrapper.findAll('.mlv-transcript__cue--active')).toHaveLength(0)
  })
})
