import { pickBestSource, createCachedResolver } from '@/adapters/sourceHelpers'
import { HLS_MIME_TYPE, MP4_MIME_TYPE } from '@/constants'
import type { ResolvedSource } from '@/types/playback'
import type { CaptionTrackDef } from '@/types/player'

export const JW_MEDIA_API = 'https://cdn.jwplayer.com/v2/media'

function extractMediaId(src: string): string | null {
  return (
    src.match(/cdn\.jwplayer\.com\/videos\/([^-]+)/)?.[1] ??
    src.match(/cdn\.jwplayer\.com\/manifests\/([^.]+)/)?.[1] ??
    src.match(/^jwplayer:\/\/([^/]+)$/)?.[1] ??
    null
  )
}

function extractAdTagUrl(item: { advertising?: { schedule?: Array<{ tag?: string }>; tag?: string } }): string | null {
  const schedule = item?.advertising?.schedule
  if (Array.isArray(schedule) && schedule.length) return schedule[0].tag ?? null
  return item?.advertising?.tag ?? null
}

/** `tracks` mixes captions with chapter and thumbnail-strip files; JW names a caption file's label but not its language. */
function extractCaptionTracks(tracks: Array<{ file?: string; kind?: string; label?: string }> | undefined): CaptionTrackDef[] {
  return (tracks ?? [])
    .filter((t) => t.kind === 'captions' && !!t.file)
    .map((t) => ({ src: t.file as string, kind: 'captions' as const, ...(t.label && { label: t.label }) }))
}

const fetchMediaConfig = createCachedResolver(async (mediaId: string): Promise<ResolvedSource> => {
  const res = await fetch(`${JW_MEDIA_API}/${mediaId}`)
  if (!res.ok) throw new Error(`JW Platform API error: ${res.status}`)
  const data = await res.json()

  const item = data.playlist?.[0]
  if (!item) throw new Error('JW Platform: empty playlist')

  const sources = pickBestSource((item.sources ?? []).map((s: { file: string; type: string }) => ({ src: s.file, type: s.type })))

  if (!sources.length) throw new Error('JW Platform: no playable sources found')

  return {
    src: sources[0].src,
    type: sources[0].type,
    poster: item.image ?? null,
    adTagUrl: extractAdTagUrl(item),
    tracks: extractCaptionTracks(item.tracks),
  }
})

export async function resolveSource(src: string): Promise<ResolvedSource> {
  const mediaId = extractMediaId(src)
  if (!mediaId) throw new Error(`JW Platform: unrecognised source URL: ${src}`)

  const config = await fetchMediaConfig(mediaId)

  if (src.startsWith('jwplayer://')) return config

  const type = /\.mp4(\?|#|$)/.test(src) ? MP4_MIME_TYPE : HLS_MIME_TYPE
  return { ...config, src, type }
}
