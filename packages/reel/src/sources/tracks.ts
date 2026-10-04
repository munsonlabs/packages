import type { Input, InputAudioTrack, InputVideoTrack } from 'mediabunny'
import type { TrackChoice, VideoTrackInfo } from '@/types'

export interface VideoCandidate extends VideoTrackInfo {
  track: InputVideoTrack
}

/**
 * The source's video tracks with display size, peak bitrate and codec. For an HLS master each variant
 * is a track and the values come from `RESOLUTION`, `BANDWIDTH` and `CODECS`, so listing reads only the
 * playlist. I-frame-only playlists are left out while any regular track exists.
 */
export async function listVideoCandidates(input: Input): Promise<VideoCandidate[]> {
  const all = await input.getVideoTracks()
  const regular: InputVideoTrack[] = []
  for (const track of all) {
    if (!(await track.hasOnlyKeyPackets())) {
      regular.push(track)
    }
  }
  const tracks = regular.length > 0 ? regular : all
  const candidates: VideoCandidate[] = []
  for (const [index, track] of tracks.entries()) {
    candidates.push({
      track,
      index,
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      bitrate: await track.getBitrate(),
      codec: await track.getCodecParameterString(),
    })
  }
  return candidates
}

function bySize(a: VideoTrackInfo, b: VideoTrackInfo): number {
  return a.width * a.height - b.width * b.height || (a.bitrate ?? Infinity) - (b.bitrate ?? Infinity)
}

async function decoderSupports(config: VideoDecoderConfig): Promise<boolean> {
  try {
    return (await VideoDecoder.isConfigSupported(config)).supported === true
  } catch {
    return false
  }
}

/**
 * Whether this browser can decode a track, from its own decoder configuration. For a plain file that
 * is in the header; for an HLS variant it means reading its first segment, and a segment that fails
 * to download throws rather than counting as "cannot decode" (as `track.canDecode()` would), so a
 * broken stream is reported instead of quietly falling through to a bigger variant.
 */
export async function canDecodeTrack(track: InputVideoTrack): Promise<boolean> {
  const config = await track.getDecoderConfig()
  return config !== null && (await decoderSupports(config))
}

/**
 * Whether this browser can decode a candidate without reading its media. For HLS the codec string
 * comes from the playlist, so this downloads nothing; anything else is {@link canDecodeTrack}.
 */
export function canDecodeCandidate(candidate: VideoCandidate, hls: boolean): Promise<boolean> {
  if (hls && candidate.codec) {
    return decoderSupports({ codec: candidate.codec, codedWidth: candidate.width, codedHeight: candidate.height })
  }
  return canDecodeTrack(candidate.track)
}

/**
 * Candidates in preference order for `choice`. `'auto'`: the smallest that covers `need` (two pixels
 * of rounding allowed), then the rest largest first. `'smallest'`/`'largest'` ignore `need`.
 */
export function rankCandidates(candidates: VideoCandidate[], choice: TrackChoice, need: { width: number; height: number } | null): VideoCandidate[] {
  const ascending = [...candidates].sort(bySize)
  const descending = [...ascending].reverse()
  if (choice === 'smallest') {
    return ascending
  }
  if (choice === 'largest') {
    return descending
  }
  const covers = (track: VideoTrackInfo) => !need || (track.width + 2 >= need.width && track.height + 2 >= need.height)
  return [...ascending.filter(covers), ...descending.filter((track) => !covers(track))]
}

/**
 * The audio a video track is presented with: for an HLS variant, its own muxed audio or its `AUDIO`
 * group's default.
 */
export function pairedAudio(input: Input, video: InputVideoTrack | null): Promise<InputAudioTrack | null> {
  return video ? video.getPrimaryPairableAudioTrack() : input.getPrimaryAudioTrack()
}
