import type { CaptionCue, CaptionInput } from '@/types'
import { captionUrl, isVttFile, parseVtt, toCues } from '@/captions/cues'

/**
 * Fetches and parses a WebVTT file. Rejects with an `Error` on a failed request (a network error, or
 * cross-origin without `Access-Control-Allow-Origin`), an HTTP error, or a body with no `WEBVTT` header
 * (an HTML error page served as 200, or SubRip); with `signal.reason` when aborted.
 */
export async function fetchCaptions(url: string | URL, options: { signal?: AbortSignal } = {}): Promise<CaptionCue[]> {
  const href = url instanceof URL ? url.href : url
  const { signal } = options
  let response: Response
  let text: string
  try {
    response = await globalThis.fetch(href, { signal })
    text = response.ok ? await response.text() : ''
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason
    }
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not fetch the captions at ${href}. If they are on another origin, it must send Access-Control-Allow-Origin. (${detail})`)
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {})
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
    throw new Error(`The captions at ${href} could not be loaded: the server answered ${status}.`)
  }
  if (!isVttFile(text)) {
    throw new Error(`The file at ${href} is not WebVTT captions (it has no WEBVTT header).`)
  }
  return parseVtt(text).sort((a, b) => a.start - b.start)
}

export async function loadCaptions(input: CaptionInput, options: { signal?: AbortSignal } = {}): Promise<CaptionCue[]> {
  const url = captionUrl(input)
  if (url) {
    return fetchCaptions(url, options)
  }
  return toCues(input as CaptionCue[] | string | TextTrack)
}
