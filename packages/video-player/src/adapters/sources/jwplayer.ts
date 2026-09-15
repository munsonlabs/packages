import { pickBestSource, createCachedResolver } from '@/utils/sourceHelpers'
import { JW_MEDIA_API, HLS_MIME_TYPE, MP4_MIME_TYPE } from '@/constants'
import type { ResolvedSource } from '@/types/playback'

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
