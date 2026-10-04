import { ALL_FORMATS, BlobSource, Input, UrlSource } from 'mediabunny'
import { ClipError } from '@/utils/errors'
import type { ClipSource, PlaylistCache } from '@/types'

const embedHosts =
  /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|dailymotion\.com|dai\.ly|brightcove\.net|players\.brightcove\.net|jwplayer\.com|jwplatform\.com)$/i

/**
 * True when `url` is the page or player URL of an embed platform. Those URLs point at an HTML page
 * whose video plays inside a cross-origin iframe, so there is no file to read.
 */
export function isEmbedUrl(url: string): boolean {
  try {
    return embedHosts.test(new URL(url, globalThis.location?.href).hostname)
  } catch {
    return false
  }
}

/**
 * Any {@link ClipSource} as what is actually read: a `Blob` or an absolute URL. A `<video>` is refused
 * for the playback modes that hide the file (EME, MediaSource, MediaStream) and otherwise read through
 * its `currentSrc`. Throws a {@link ClipError} naming the blocker.
 */
export async function resolveSource(source: ClipSource): Promise<Blob | string> {
  if (source instanceof Blob) {
    return source
  }

  let url: string
  if (typeof source === 'string') {
    url = source
  } else if (source instanceof URL) {
    url = source.href
  } else {
    if (source.mediaKeys) {
      throw new ClipError('drm', 'The video is encrypted (EME); its decoded frames are not readable.')
    }
    if (source.srcObject) {
      if (typeof MediaStream !== 'undefined' && source.srcObject instanceof MediaStream) {
        throw new ClipError('media-stream', 'The video is a live MediaStream, not a file.')
      }
      throw new ClipError('mse', 'The video is fed by a MediaSource object, not a file.')
    }
    url = source.currentSrc || source.src
    if (!url) {
      throw new ClipError('unreachable', 'The video element has no source.')
    }
    if (url.startsWith('blob:') && !(await blobUrlIsFile(url))) {
      throw new ClipError('mse', 'The video is fed by a MediaSource (e.g. hls.js or dash.js), so there is no file behind its blob: URL.')
    }
  }

  const absolute = new URL(url, globalThis.location?.href).href
  if (isEmbedUrl(absolute)) {
    throw new ClipError('embed', 'This is an embed page URL; the video plays in a cross-origin iframe and cannot be read.')
  }
  if (/\.mpd(\?|#|$)/i.test(new URL(absolute).pathname)) {
    throw new ClipError('dash', 'DASH manifests are not supported; reel reads MP4/WebM/MOV files and HLS playlists.')
  }
  return absolute
}

/**
 * A `blob:` URL made from a `MediaSource` cannot be fetched, while one made from a `File` or `Blob`
 * can. Fetching is the only way to tell them apart from the outside. It has to be a GET: the Fetch
 * spec makes any other method on a `blob:` URL a network error. The body is cancelled unread.
 */
async function blobUrlIsFile(url: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    void response.body?.cancel()
    return response.ok
  } catch {
    return false
  }
}

/**
 * Opens a Mediabunny `Input` over a resolved source. URL sources never retry: Mediabunny's default
 * backoff would retry a network error forever, and a CORS failure looks like a network error, so one
 * failed request is reported straight away as `'unreachable'`. With a `cache`, HLS playlists are
 * read through it (see `createPlaylistCache`).
 */
export function openInput(resolved: Blob | string, cache?: PlaylistCache): Input {
  if (resolved instanceof Blob) {
    return new Input({ source: new BlobSource(resolved), formats: ALL_FORMATS })
  }
  return new Input({
    source: new UrlSource(resolved, { getRetryDelay: () => null, ...(cache ? { fetchFn: cache.fetch } : {}) }),
    formats: ALL_FORMATS,
  })
}

/**
 * Turns a failure while reading a source's header into a {@link ClipError}. A failed `fetch` is a
 * `TypeError` in every browser, and browsers deliberately do not say whether CORS or the network was
 * to blame, so both become `'unreachable'` with a message that names CORS as the usual cause.
 */
export function readError(error: unknown, resolved: Blob | string): ClipError {
  if (error instanceof ClipError) {
    return error
  }
  if (error instanceof TypeError && typeof resolved === 'string') {
    return new ClipError(
      'unreachable',
      `Could not fetch ${resolved}. If it is on another origin it must send Access-Control-Allow-Origin (and allow Range requests). (${error.message})`,
    )
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/unsupported|unrecognized|format/i.test(message) || (error instanceof Error && error.name === 'UnsupportedInputFormatError')) {
    return new ClipError('unsupported-container', `The source is not a container reel can read. (${message})`)
  }
  return new ClipError('unreachable', `Could not read the source. (${message})`)
}
