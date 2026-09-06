import { describe, it, expect, vi } from 'vite-plus/test'
import { useCaptions } from '@/composables/overlay/useCaptions'
import type { PlayerContext } from '@/composables/player/playerContext'
import type { CaptionTrackInfo } from '@/types/playback'

function makePlayer(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    captionTracks: [] as CaptionTrackInfo[],
    activeCaptionIndex: null,
    setCaptionTrack: vi.fn(),
    ...overrides,
  } as unknown as PlayerContext
}

describe('useCaptions', () => {
  it('is a no-op when there are no caption tracks', () => {
    const player = makePlayer()
    const { cycleCaptionTrack, currentCaptionLabel } = useCaptions(player)

    cycleCaptionTrack()

    expect(player.setCaptionTrack).not.toHaveBeenCalled()
    expect(currentCaptionLabel()).toBe('Off')
  })

  it('cycles from off to the first track, then the next, then back to off', () => {
    const tracks: CaptionTrackInfo[] = [
      { index: 0, label: 'English', language: 'en' },
      { index: 1, label: 'French', language: 'fr' },
    ]
    const player = makePlayer({ captionTracks: tracks, activeCaptionIndex: null })
    const { cycleCaptionTrack } = useCaptions(player)

    cycleCaptionTrack()
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(0)

    player.activeCaptionIndex = 0
    cycleCaptionTrack()
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(1)

    player.activeCaptionIndex = 1
    cycleCaptionTrack()
    expect(player.setCaptionTrack).toHaveBeenLastCalledWith(null)
  })

  it('reports the active track label', () => {
    const tracks: CaptionTrackInfo[] = [{ index: 0, label: 'English', language: 'en' }]
    const player = makePlayer({ captionTracks: tracks, activeCaptionIndex: 0 })
    const { currentCaptionLabel } = useCaptions(player)

    expect(currentCaptionLabel()).toBe('English')
  })
})
