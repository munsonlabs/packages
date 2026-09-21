import { PLAYBACK_RATES } from '@/constants'
import type { PlayerHandle } from '@/types/player'

/**
 * Plain functions over a player handle, not composables: they hold no state, register no lifecycle
 * hooks and are safe to call from an event handler. Named with a `use` prefix they had to be built
 * inside a computed at every call site just to rebuild a bag of closures.
 */
export function cycleCaptionTrack(player: PlayerHandle): void {
  const tracks = player.captionTracks
  if (!tracks.length) return
  const position = tracks.findIndex((track) => track.index === player.activeCaptionIndex)
  const next = tracks[position + 1]
  player.setCaptionTrack(next ? next.index : null)
}

export function captionTrackLabel(player: PlayerHandle): string {
  return player.captionTracks.find((track) => track.index === player.activeCaptionIndex)?.label ?? 'Off'
}

/** Steps down the ladder from the highest level, then back to Auto. */
export function cycleQuality(player: PlayerHandle): void {
  const levels = player.qualityLevels
  if (!levels.length) return
  if (player.isAutoQuality) {
    player.setQuality(levels[levels.length - 1].height)
    return
  }
  const position = levels.findIndex((level) => level.height === player.currentQualityHeight)
  player.setQuality(position <= 0 ? null : levels[position - 1].height)
}

export function qualityLabel(player: PlayerHandle): string {
  if (player.isAutoQuality) return 'Auto'
  return player.qualityLevels.find((level) => level.height === player.currentQualityHeight)?.label ?? 'Auto'
}

/** A rate set by the prop need not be on the list, and indexOf's -1 would wrap to the slowest rate instead of stepping up. */
export function cyclePlaybackRate(player: PlayerHandle): void {
  const current = player.currentPlaybackRate
  const position = PLAYBACK_RATES.indexOf(current)
  if (position !== -1) {
    player.setPlaybackRate(PLAYBACK_RATES[(position + 1) % PLAYBACK_RATES.length])
    return
  }
  player.setPlaybackRate(PLAYBACK_RATES.find((rate) => rate > current) ?? PLAYBACK_RATES[0])
}

export function playbackRateLabel(rate: number): string {
  return `${rate}×`
}
