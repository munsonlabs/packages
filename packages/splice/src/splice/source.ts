import { ALL_FORMATS, BlobSource, HlsInputFormat, Input, UrlSource } from 'mediabunny'
import { runScoped } from '@/utils/scope'
import { ERROR_ENCRYPTED_VIDEO, ERROR_MEDIA_SOURCE, ERROR_MEDIA_STREAM, ERROR_NO_VIDEO_TRACK, ERROR_UNDECODABLE_VIDEO } from '@/constants'
import type { SourceInfo, SpliceSource } from '@/types/splice'
import type { OpenedSource, SelectedTracks, VideoTrackInfo } from '@/types/internal'

/**
 * Resolves and opens a source. It needs a video track this browser can decode, and info describes
 * the biggest one (the top variant for HLS). Only the header is read, or just the playlists for
 * HLS. If anything fails the input is disposed.
 */
export async function openSource(source: SpliceSource): Promise<OpenedSource> {
  const resolved = await resolveSource(source)
  const input = createInput(resolved)

  return runScoped(async (scope) => {
    scope.onError(() => input.dispose())

    const isHls = (await input.getFormat()) instanceof HlsInputFormat
    const tracks = await listVideoTracks(input)
    const largest = await findDecodable([...tracks].reverse(), isHls)

    if (tracks.length === 0) throw new Error(ERROR_NO_VIDEO_TRACK)
    if (!largest) throw new Error(ERROR_UNDECODABLE_VIDEO(tracks[0].codec))

    const video = largest.track
    const audio = await video.getPrimaryPairableAudioTrack()
    /**
     * For HLS the playlist already says how long it is. Working it out would mean reading the last
     * segment of every variant.
     */
    const duration = isHls
      ? ((await input.getDurationFromMetadata([video])) ?? (await input.computeDuration([video])))
      : await input.computeDuration()

    const info: SourceInfo = {
      resolved,
      width: largest.width,
      height: largest.height,
      duration,
      videoCodec: largest.codec,
      audioCodec: audio ? await audio.getCodecParameterString() : null,
    }

    return { input, video, audio, info, tracks, isHls }
  })
}

/**
 * Picks the track to read: the smallest one this browser can decode that still covers need,
 * otherwise the biggest. A small output reads a small HLS variant, and only that track's media gets
 * downloaded.
 */
export async function selectTracks(source: OpenedSource, need: { width: number; height: number }): Promise<SelectedTracks> {
  const covers = (track: VideoTrackInfo) => track.width + 2 >= need.width && track.height + 2 >= need.height
  const covering = source.tracks.filter(covers)
  const chosen = await findDecodable(covering, source.isHls)

  if (!chosen) return { video: source.video, audio: source.audio }
  const audio = await chosen.track.getPrimaryPairableAudioTrack()
  return { video: chosen.track, audio }
}

/**
 * Lists the source's video tracks, smallest first. For an HLS master each variant is a track,
 * described from its playlist entry. I-frame only playlists are skipped as long as there's a
 * regular one.
 */
async function listVideoTracks(input: Input): Promise<VideoTrackInfo[]> {
  const all = await input.getVideoTracks()
  const regular: typeof all = []
  for (const track of all) {
    if (!(await track.hasOnlyKeyPackets())) regular.push(track)
  }

  const tracks: VideoTrackInfo[] = []
  for (const track of regular.length > 0 ? regular : all) {
    const width = await track.getDisplayWidth()
    const height = await track.getDisplayHeight()
    const bitrate = (await track.getBitrate()) ?? Infinity
    const codec = await track.getCodecParameterString()
    tracks.push({ track, width, height, bitrate, codec })
  }
  return tracks.sort((a, b) => a.width * a.height - b.width * b.height || a.bitrate - b.bitrate)
}

/**
 * Finds the first track this browser can decode. HLS variants are checked by their playlist codec,
 * which doesn't download anything. Anything else asks the track.
 */
async function findDecodable(tracks: VideoTrackInfo[], isHls: boolean): Promise<VideoTrackInfo | undefined> {
  for (const info of tracks) {
    const { track, codec, width, height } = info
    const config = { codec: codec ?? '', codedWidth: width, codedHeight: height }
    const checkPlaylist = isHls && codec && typeof VideoDecoder !== 'undefined'
    const canDecode = checkPlaylist
      ? await VideoDecoder.isConfigSupported(config).then(
          (result) => result.supported === true,
          () => false,
        )
      : await track.canDecode()
    if (canDecode) return info
  }
  return undefined
}

async function resolveSource(source: SpliceSource): Promise<Blob | string> {
  if (source instanceof Blob) return source
  if (typeof source === 'string') return source
  if (source instanceof URL) return source.href
  return readVideoUrl(source)
}

/**
 * Gets a <video>'s file URL, refusing the cases where there's no file to read: encrypted media, a
 * live MediaStream, or a MediaSource like hls.js and dash.js use, whose blob: URL can't be fetched.
 */
async function readVideoUrl(video: HTMLVideoElement): Promise<string> {
  const url = video.currentSrc || video.src
  const isStream = typeof MediaStream !== 'undefined' && video.srcObject instanceof MediaStream
  const isMediaSource = (Boolean(video.srcObject) && !isStream) || (url.startsWith('blob:') && !(await isFileUrl(url)))

  if (video.mediaKeys) throw new Error(ERROR_ENCRYPTED_VIDEO)
  if (isStream) throw new Error(ERROR_MEDIA_STREAM)
  if (isMediaSource) throw new Error(ERROR_MEDIA_SOURCE)
  return url
}

/**
 * Checks whether a blob: URL was made from a file. One made from a MediaSource can't be fetched,
 * and fetching is the only way to tell. The body is cancelled without reading it.
 */
async function isFileUrl(url: string): Promise<boolean> {
  const response = await fetch(url).catch(() => null)
  void response?.body?.cancel()
  return response?.ok ?? false
}

/**
 * Opens a Mediabunny Input for a file or URL. URLs never retry, because a CORS failure looks like a
 * network error and would retry forever.
 */
function createInput(resolved: Blob | string): Input {
  const source = resolved instanceof Blob ? new BlobSource(resolved) : new UrlSource(resolved, { getRetryDelay: () => null })
  return new Input({ source, formats: ALL_FORMATS })
}
