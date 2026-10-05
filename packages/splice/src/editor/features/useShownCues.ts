import { onBeforeUnmount, shallowRef, watch } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { stripCueMarkup } from '@/splice/captions'
import type { CaptionCue } from '@/types/splice'

/**
 * Keeps track of the cues for whatever captions the player is showing, read from its <video>. That
 * covers WebVTT tracks and HLS subtitles, since hls.js and Safari both add those as text tracks.
 * These are what get previewed and burned in. HLS cues load as segments arrive, so we listen for
 * cuechange.
 */
export function useShownCues(player: () => PlayerHandle | null, active: () => boolean) {
  const cues = shallowRef<CaptionCue[]>([])
  let watched: TextTrack | null = null

  const refresh = () => {
    cues.value = watched ? readCues(watched) : []
  }

  watch(
    () => [active(), player()?.activeCaptionIndex, player()?.mediaElement],
    () => {
      watched?.removeEventListener('cuechange', refresh)
      watched = active() ? findShownTrack(player()) : null
      watched?.addEventListener('cuechange', refresh)
      refresh()
    },
    { immediate: true },
  )
  onBeforeUnmount(() => watched?.removeEventListener('cuechange', refresh))

  return cues
}

/**
 * Finds the text track for the captions the player has picked, matching label and language. Falls
 * back to whatever caption track the browser is showing.
 */
function findShownTrack(player: PlayerHandle | null): TextTrack | null {
  const media = player?.mediaElement
  const chosen = player?.captionTracks.find((track) => track.index === player.activeCaptionIndex)
  if (!media || !chosen) return null

  const tracks = Array.from(media.textTracks).filter((track) => track.kind === 'captions' || track.kind === 'subtitles')
  const sameTrack = tracks.find((track) => track.label === chosen.label && track.language === chosen.language)
  return sameTrack ?? tracks.find((track) => track.mode === 'showing') ?? null
}

function readCues(track: TextTrack): CaptionCue[] {
  const cues = Array.from(track.cues ?? []) as VTTCue[]
  return cues.map((cue) => ({ start: cue.startTime, end: cue.endTime, text: stripCueMarkup(cue.text) })).filter((cue) => cue.text)
}
