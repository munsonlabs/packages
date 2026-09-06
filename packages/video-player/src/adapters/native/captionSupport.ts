import type { CaptionTrackInfo } from '@/types/playback'

export interface CaptionSupport {
  supportsCaptions(): boolean
  getCaptionTracks(): CaptionTrackInfo[]
  setCaptionTrack(index: number | null): void
  getActiveCaptionTrack(): number | null
  dispose(): void
}

function isCaptionTrack(track: TextTrack): boolean {
  return track.kind === 'captions' || track.kind === 'subtitles'
}

/** addtrack/removetrack fire for both explicit `<track>` elements and async HLS subtitle renditions, so onChange reacts to either without polling. */
export function createCaptionSupport(videoEl: HTMLVideoElement, onChange: () => void): CaptionSupport {
  videoEl.textTracks.addEventListener('addtrack', onChange)
  videoEl.textTracks.addEventListener('removetrack', onChange)

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
    supportsCaptions: () => getCaptionTracks().length > 0,
    getCaptionTracks,
    setCaptionTrack,
    getActiveCaptionTrack,
    dispose: () => {
      videoEl.textTracks.removeEventListener('addtrack', onChange)
      videoEl.textTracks.removeEventListener('removetrack', onChange)
    },
  }
}
