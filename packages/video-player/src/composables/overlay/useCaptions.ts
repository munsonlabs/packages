import type { PlayerHandle } from '@/types/player'

export interface UseCaptionsReturn {
  cycleCaptionTrack: () => void
  currentCaptionLabel: () => string
}

export function useCaptions(player: PlayerHandle): UseCaptionsReturn {
  function cycleCaptionTrack(): void {
    const tracks = player.captionTracks
    if (!tracks.length) return
    const currentPos = tracks.findIndex((t) => t.index === player.activeCaptionIndex)
    const next = tracks[currentPos + 1]
    player.setCaptionTrack(next ? next.index : null)
  }

  function currentCaptionLabel(): string {
    const active = player.captionTracks.find((t) => t.index === player.activeCaptionIndex)
    return active?.label ?? 'Off'
  }

  return { cycleCaptionTrack, currentCaptionLabel }
}
