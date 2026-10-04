import { computed, shallowRef, watch } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import type { CaptionCue, CaptionTrackInfo, ClipSource, PlaylistCache } from '@/types'
import { loadCore, type Core } from '@/ui/picker/features/core'

export interface TrackCuesDeps {
  player: () => PlayerHandle | null
  source: () => ClipSource | null
  window: () => { min: number; max: number }
  playlists: () => PlaylistCache | null
  signal: () => AbortSignal | null
  active: () => boolean
  report: (error: unknown) => void
}

const isHlsUrl = (source: ClipSource | null) => typeof source === 'string' && /\.m3u8(?:[?#]|$)/i.test(source)

/**
 * The core's rendition for the player's chosen track: same name first (hls.js and Safari both label a
 * rendition with its `NAME`), then same language.
 */
export function matchRendition(tracks: CaptionTrackInfo[], chosen: { label: string; language: string }): CaptionTrackInfo | undefined {
  const renditions = tracks.filter((track) => track.kind === 'hls')
  const language = chosen.language.toLowerCase()
  return (
    renditions.find((track) => track.label === chosen.label) ??
    renditions.find((track) => language !== '' && track.language.toLowerCase() === language)
  )
}

/**
 * The cues of the caption track the page's player shows, for the crop overlay and the export. The
 * player's tracks are the `<video>`'s own, read as `text:<n>` straight from the element (no second
 * fetch), or for an HLS source the renditions the player found, matched to the core's by name and
 * language. Loaded once per track per opening; a failed load is forgotten so the next showing asks
 * again.
 */
export function useTrackCues(deps: TrackCuesDeps) {
  const previewCues = shallowRef<CaptionCue[]>([])
  let cache = new Map<string, Promise<CaptionCue[]>>()
  let renditions: Promise<CaptionTrackInfo[]> | null = null

  function reset(): void {
    cache = new Map()
    renditions = null
    previewCues.value = []
  }

  async function trackId(core: Core, index: number, signal: AbortSignal): Promise<{ id: string; source: ClipSource }> {
    const player = deps.player()
    const source = deps.source()
    const chosen = player?.captionTracks.find((track) => track.index === index)
    if (!player || !source || !chosen) throw new Error('The captions on show are not one of the source’s tracks.')
    const media = player.mediaElement
    if (isHlsUrl(source)) {
      renditions ??= core.listCaptionTracks(source, { signal, cache: deps.playlists() ?? undefined }).catch((error: unknown) => {
        renditions = null
        throw error
      })
      const rendition = matchRendition(await renditions, chosen)
      if (rendition) return { id: rendition.id, source }
    }
    if (media) {
      const own = Array.from(media.textTracks)
      const n = own.findIndex((track) => track.label === chosen.label && track.language === chosen.language)
      if (n !== -1) return { id: `text:${n}`, source: media }
    }
    throw new Error('The captions on show are not one of the source’s tracks.')
  }

  async function trackCues(core: Core, index: number, signal: AbortSignal): Promise<CaptionCue[]> {
    const { id, source } = await trackId(core, index, signal)
    let cues = cache.get(id)
    if (!cues) {
      const { min, max } = deps.window()
      cues = core.loadCaptionTrack(source, id, { start: min, end: max, signal, cache: deps.playlists() ?? undefined })
      cache.set(id, cues)
      const loading = cues
      loading.catch(() => {
        if (cache.get(id) === loading) cache.delete(id)
      })
    }
    return cues
  }

  const shown = computed(() => (deps.active() ? (deps.player()?.activeCaptionIndex ?? null) : null))

  watch(shown, async (index) => {
    const signal = deps.signal()
    if (index === null || !signal) {
      previewCues.value = []
      return
    }
    try {
      const cues = await trackCues(await loadCore(), index, signal)
      if (shown.value === index && !signal.aborted) {
        previewCues.value = cues
        deps.report(null)
      }
    } catch (error) {
      if (signal.aborted || shown.value !== index) return
      previewCues.value = []
      deps.report(error)
    }
  })

  async function burnInCues(core: Core, signal: AbortSignal): Promise<CaptionCue[] | null> {
    const index = deps.player()?.activeCaptionIndex ?? null
    if (index === null) return []
    try {
      const cues = await trackCues(core, index, signal)
      if (signal.aborted) throw signal.reason
      return cues
    } catch (error) {
      if (signal.aborted) throw error
      deps.report(error)
      return null
    }
  }

  return { previewCues, burnInCues, reset }
}
