import type { CaptionTrackDef } from '@/types/player'

export interface SidecarTracks {
  dispose(): void
}

function isCaptionTrack(track: TextTrack): boolean {
  return track.kind === 'captions' || track.kind === 'subtitles'
}

/**
 * Adds caption files a source platform lists alongside its stream (Brightcove's `text_tracks`, JW's
 * `tracks`) as `<track>` elements. They are fetched and handed over as blob URLs rather than linked
 * directly: a cross-origin `<track>` only loads with `crossorigin` on the `<video>`, and that would
 * make every media and segment request need CORS too. A file that fails to fetch is left out.
 *
 * A stream can also carry the same captions itself (Brightcove's Dynamic Delivery writes them into its
 * manifests), and those renditions arrive later, once the manifest parses. When one turns up in a
 * language a sidecar track already covers, the sidecar copy is removed so the menu lists it once.
 */
export function attachSidecarTracks(videoEl: HTMLVideoElement, tracks: CaptionTrackDef[]): SidecarTracks {
  const controller = new AbortController()
  const elements: HTMLTrackElement[] = []
  const blobUrls: string[] = []

  function removeElement(el: HTMLTrackElement): void {
    el.remove()
    elements.splice(elements.indexOf(el), 1)
  }

  function isStreamTrack(track: TextTrack): boolean {
    return isCaptionTrack(track) && !!track.language && !elements.some((el) => el.track === track)
  }

  function streamCovers(language: string | undefined): boolean {
    if (!language) return false
    for (let i = 0; i < videoEl.textTracks.length; i++) {
      const track = videoEl.textTracks[i]
      if (isStreamTrack(track) && track.language === language) return true
    }
    return false
  }

  function onAddTrack(e: TrackEvent): void {
    const added = e.track as TextTrack | null
    if (!added || !isStreamTrack(added)) return
    for (const el of elements.filter((t) => t.srclang === added.language)) removeElement(el)
  }

  videoEl.textTracks.addEventListener('addtrack', onAddTrack)

  async function load(def: CaptionTrackDef): Promise<void> {
    const res = await fetch(def.src, { signal: controller.signal })
    if (!res.ok) return
    const blob = await res.blob()
    if (controller.signal.aborted || streamCovers(def.srclang)) return

    const url = URL.createObjectURL(blob)
    blobUrls.push(url)

    const el = document.createElement('track')
    el.kind = def.kind ?? 'captions'
    el.src = url
    if (def.srclang) el.srclang = def.srclang
    if (def.label) el.label = def.label
    if (def.default) el.default = true
    elements.push(el)
    videoEl.appendChild(el)
  }

  for (const def of tracks) void load(def).catch(() => {})

  return {
    dispose: () => {
      controller.abort()
      videoEl.textTracks.removeEventListener('addtrack', onAddTrack)
      for (const el of elements) el.remove()
      elements.length = 0
      for (const url of blobUrls) URL.revokeObjectURL(url)
      blobUrls.length = 0
    },
  }
}
