import { describe, it, expect, vi } from 'vite-plus/test'
import { cycleCaptionTrack, captionTrackLabel, cycleQuality, qualityLabel, cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
import { PLAYBACK_RATES } from '@/constants'
import type { PlayerHandle } from '@/types/player'
import type { CaptionTrackInfo, QualityLevelInfo } from '@/types/playback'

function makePlayer(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return {
    captionTracks: [] as CaptionTrackInfo[],
    activeCaptionIndex: null,
    setCaptionTrack: vi.fn(),
    qualityLevels: [] as QualityLevelInfo[],
    currentQualityHeight: null,
    isAutoQuality: true,
    setQuality: vi.fn(),
    currentPlaybackRate: 1,
    setPlaybackRate: vi.fn(),
    ...overrides,
  } as unknown as PlayerHandle
}

const TRACKS: CaptionTrackInfo[] = [
  { index: 0, label: 'English', language: 'en' },
  { index: 1, label: 'French', language: 'fr' },
]

const LEVELS: QualityLevelInfo[] = [
  { index: 0, height: 480, bitrate: 800_000, label: '480p' },
  { index: 1, height: 1080, bitrate: 3_000_000, label: '1080p' },
]

describe('caption actions', () => {
  it('is a no-op when there are no caption tracks', () => {
    const player = makePlayer()

    cycleCaptionTrack(player)

    expect(player.setCaptionTrack).not.toHaveBeenCalled()
    expect(captionTrackLabel(player)).toBe('Off')
  })

  it('cycles from off to the first track, then the next, then back to off', () => {
    const player = makePlayer({ captionTracks: TRACKS, activeCaptionIndex: null })

    cycleCaptionTrack(player)
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(0)

    player.activeCaptionIndex = 0
    cycleCaptionTrack(player)
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(1)

    player.activeCaptionIndex = 1
    cycleCaptionTrack(player)
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(null)
  })

  it('reports the active track label', () => {
    const player = makePlayer({ captionTracks: TRACKS, activeCaptionIndex: 1 })

    expect(captionTrackLabel(player)).toBe('French')
  })
})

describe('quality actions', () => {
  it('is a no-op when there are no quality levels', () => {
    const player = makePlayer()

    cycleQuality(player)

    expect(player.setQuality).not.toHaveBeenCalled()
    expect(qualityLabel(player)).toBe('Auto')
  })

  it('cycles from Auto to the highest level, down to the lowest, then back to Auto', () => {
    const player = makePlayer({ qualityLevels: LEVELS, isAutoQuality: true, currentQualityHeight: null })

    cycleQuality(player)
    expect(player.setQuality).toHaveBeenLastCalledWith(1080)

    player.isAutoQuality = false
    player.currentQualityHeight = 1080
    cycleQuality(player)
    expect(player.setQuality).toHaveBeenLastCalledWith(480)

    player.currentQualityHeight = 480
    cycleQuality(player)
    expect(player.setQuality).toHaveBeenLastCalledWith(null)
  })

  it('reports Auto or the selected level label', () => {
    const player = makePlayer({ qualityLevels: LEVELS, isAutoQuality: false, currentQualityHeight: 480 })

    expect(qualityLabel(player)).toBe('480p')

    player.isAutoQuality = true
    expect(qualityLabel(player)).toBe('Auto')
  })
})

describe('playback rate actions', () => {
  it('cycles forward through the listed rates, wrapping back to the first', () => {
    const player = makePlayer({ currentPlaybackRate: PLAYBACK_RATES[0] })

    cyclePlaybackRate(player)
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(PLAYBACK_RATES[1])

    player.currentPlaybackRate = PLAYBACK_RATES[PLAYBACK_RATES.length - 1]
    cyclePlaybackRate(player)
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(PLAYBACK_RATES[0])
  })

  it('steps up to the next higher rate when the current one is not on the list', () => {
    const player = makePlayer({ currentPlaybackRate: 1.75 })

    cyclePlaybackRate(player)

    expect(player.setPlaybackRate).toHaveBeenCalledWith(2)
  })

  it('wraps to the slowest rate when the current one is above every listed rate', () => {
    const player = makePlayer({ currentPlaybackRate: 3 })

    cyclePlaybackRate(player)

    expect(player.setPlaybackRate).toHaveBeenCalledWith(PLAYBACK_RATES[0])
  })

  it('formats a rate for display', () => {
    expect(playbackRateLabel(1.5)).toBe('1.5×')
  })
})
