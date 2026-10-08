import type { ChapterInfo } from '@/types/playback'

export interface ChapterSupport {
  getChapters(): ChapterInfo[]
  dispose(): void
}

/**
 * Reads the chapters from a WebVTT track with kind="chapters". Browsers leave a chapters track
 * disabled, which means its file is never loaded, so it's switched to hidden: loaded and readable,
 * but never drawn. The cues only exist once the file has loaded, so the track element's load event
 * reports the change.
 */
export function createChapterSupport(videoEl: HTMLVideoElement, onChange: () => void): ChapterSupport {
  const watched = new Set<HTMLTrackElement>()

  function watchTracks(): void {
    for (const element of videoEl.querySelectorAll('track')) {
      if (element.kind !== 'chapters') continue
      if (element.track.mode === 'disabled') element.track.mode = 'hidden'
      if (watched.has(element)) continue
      element.addEventListener('load', onChange)
      watched.add(element)
    }
  }

  function onAddTrack(): void {
    watchTracks()
    onChange()
  }

  watchTracks()
  videoEl.textTracks.addEventListener('addtrack', onAddTrack)
  videoEl.textTracks.addEventListener('removetrack', onChange)

  function getChapters(): ChapterInfo[] {
    const track = Array.from(videoEl.textTracks).find((candidate) => candidate.kind === 'chapters')
    return Array.from(track?.cues ?? []).map((cue) => ({
      start: cue.startTime,
      end: cue.endTime,
      title: (cue as VTTCue).text,
    }))
  }

  return {
    getChapters,
    dispose: () => {
      videoEl.textTracks.removeEventListener('addtrack', onAddTrack)
      videoEl.textTracks.removeEventListener('removetrack', onChange)
      for (const element of watched) element.removeEventListener('load', onChange)
      watched.clear()
    },
  }
}
