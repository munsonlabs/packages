import type { CaptionTrackInfo } from '@/types/playback'

export interface CaptionSupport {
  getCaptionTracks(): CaptionTrackInfo[]
  setCaptionTrack(index: number | null): void
  getActiveCaptionTrack(): number | null
  dispose(): void
}

function isCaptionTrack(track: TextTrack): boolean {
  return track.kind === 'captions' || track.kind === 'subtitles'
}

/** Hiding a track fires `change`, which lands straight back here - re-entrant, and one behavioural change away from looping. */
let enforcing = false

/** Sources like HLS manifests can carry more than one caption/subtitle rendition the browser or hls.js
 * defaults to `showing` independently of each other (e.g. an in-band CEA-608 track alongside a
 * sideloaded WebVTT one), stacking their cues. Leaves the first `showing` track alone - that keeps a
 * `<track default>` element's own native default behaviour intact - and hides only the rest. */
function enforceSingleShowingTrack(videoEl: HTMLVideoElement): void {
  if (enforcing) return
  enforcing = true
  let kept = false
  for (let i = 0; i < videoEl.textTracks.length; i++) {
    const track = videoEl.textTracks[i]
    if (!isCaptionTrack(track) || track.mode !== 'showing') continue
    if (kept) track.mode = 'hidden'
    else kept = true
  }
  enforcing = false
}

/** Stamps `line` onto every cue already loaded on a track - HLS cues can arrive incrementally, so this
 * runs again on each `cuechange` to catch ones that weren't there yet the last time it ran. `snapToLines`
 * has to go false too, or a plain number on `line` is read as a line-count index rather than a percent. */
function applyCueLine(track: TextTrack, line: number): void {
  if (!track.cues) return
  for (let i = 0; i < track.cues.length; i++) {
    const cue = track.cues[i]
    if (!('line' in cue)) continue
    const vttCue = cue as VTTCue
    vttCue.snapToLines = false
    vttCue.line = line
  }
}

/** addtrack/removetrack fire for both explicit `<track>` elements and async HLS subtitle renditions, and
 * `change` fires whenever any track's `mode` flips for any reason (including the browser's own native CC
 * auto-selection, which can happen well after `addtrack` with no further add/remove event), so together
 * they cover every way a second track could end up showing without needing to poll. */
export function createCaptionSupport(videoEl: HTMLVideoElement, onChange: () => void, captionLine?: number): CaptionSupport {
  const cueChangeListeners = new Map<TextTrack, () => void>()

  function watchTrack(track: TextTrack): void {
    if (captionLine === undefined || !isCaptionTrack(track) || cueChangeListeners.has(track)) return
    const listener = () => applyCueLine(track, captionLine)
    track.addEventListener('cuechange', listener)
    cueChangeListeners.set(track, listener)
    listener()
  }

  function watchAllTracks(): void {
    for (let i = 0; i < videoEl.textTracks.length; i++) watchTrack(videoEl.textTracks[i])
  }

  watchAllTracks()
  enforceSingleShowingTrack(videoEl)

  function onAddTrack(): void {
    watchAllTracks()
    enforceSingleShowingTrack(videoEl)
    onChange()
  }

  function onModeChange(): void {
    enforceSingleShowingTrack(videoEl)
  }

  videoEl.textTracks.addEventListener('addtrack', onAddTrack)
  videoEl.textTracks.addEventListener('removetrack', onChange)
  videoEl.textTracks.addEventListener('change', onModeChange)

  function getCaptionTracks(): CaptionTrackInfo[] {
    const tracks: CaptionTrackInfo[] = []
    for (let i = 0; i < videoEl.textTracks.length; i++) {
      const track = videoEl.textTracks[i]
      if (isCaptionTrack(track)) tracks.push({ index: i, label: track.label || track.language || `Track ${i + 1}`, language: track.language })
    }
    return tracks
  }

  function setCaptionTrack(index: number | null): void {
    for (let i = 0; i < videoEl.textTracks.length; i++) {
      const track = videoEl.textTracks[i]
      if (isCaptionTrack(track)) track.mode = i === index ? 'showing' : 'hidden'
    }
  }

  function getActiveCaptionTrack(): number | null {
    for (let i = 0; i < videoEl.textTracks.length; i++) {
      const track = videoEl.textTracks[i]
      if (isCaptionTrack(track) && track.mode === 'showing') return i
    }
    return null
  }

  return {
    getCaptionTracks,
    setCaptionTrack,
    getActiveCaptionTrack,
    dispose: () => {
      videoEl.textTracks.removeEventListener('addtrack', onAddTrack)
      videoEl.textTracks.removeEventListener('removetrack', onChange)
      videoEl.textTracks.removeEventListener('change', onModeChange)
      /** TextTrack objects outlive the adapter, so leaving these attached accumulates a closure per remount. */
      for (const [track, listener] of cueChangeListeners) track.removeEventListener('cuechange', listener)
      cueChangeListeners.clear()
    },
  }
}
