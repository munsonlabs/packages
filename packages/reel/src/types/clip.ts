import type { ClipSource } from '@/types/sources'

/**
 * How a clip will be written, as {@link planOutput} plans it. Every clip is an MP4 with H.264 video and
 * AAC audio, so only the audio varies.
 */
export interface OutputPlan {
  /**
   * `'copy'`: the source's AAC packets are copied untouched (no audio encoder needed). `'encode'`: the
   * source's audio is another codec, decoded and encoded as AAC. `'none'`: the source has no audio, or
   * `audio: false`. `'unavailable'`: the source's audio is not AAC and this browser has no AAC encoder
   * (Firefox), so the clip is silent and `createClip` warns `'audio-unavailable'`.
   */
  audio: 'copy' | 'encode' | 'none' | 'unavailable'
}

export interface ClipOptions {
  source: ClipSource
  /** Start of the clip on the source's timeline, in seconds. Defaults to `0`. */
  start?: number
  /** End of the clip on the source's timeline, in seconds. Defaults to the end of the source. */
  end?: number
  /**
   * Set to `false` to drop audio. Defaults to `true`: AAC is copied, other audio encoded as AAC, and
   * where this browser has no AAC encoder the clip is silent and `onWarning` gets `'audio-unavailable'`.
   */
  audio?: boolean
  /** Called with a fraction from 0 to 1 as the clip is written. */
  onProgress?: (fraction: number) => void
  /**
   * Called for anything left out of a clip that was still made: audio this browser cannot write as
   * AAC. Without it, warnings go to `console.warn`.
   */
  onWarning?: (warning: ClipWarning) => void
  /** Aborts the clip; the returned promise then rejects with the signal's reason. */
  signal?: AbortSignal
}

/** Something left out of a clip that was still made. */
export interface ClipWarning {
  /**
   * `'audio-unavailable'`: the source's audio is not AAC and this browser has no AAC encoder (Firefox),
   * so the clip is silent.
   */
  reason: 'audio-unavailable'
  /** What was left out: the audio. */
  target: 'audio'
  message: string
}

/**
 * Why a source cannot be clipped. Every value is a hard stop, not a hint: the source, the page or the
 * browser rules the clip out.
 */
export type ClipBlocker =
  /** No `VideoEncoder`/`VideoDecoder` (WebCodecs) or `OffscreenCanvas`, or not a secure context. */
  | 'no-webcodecs'
  /** A YouTube, Vimeo, Dailymotion, Brightcove or JW Player page URL: the pixels live in someone else's iframe. */
  | 'embed'
  /** The `<video>` is playing encrypted media through EME (`mediaKeys` is set). */
  | 'drm'
  /** The `<video>` is fed by a `MediaSource` (hls.js, dash.js, Shaka) rather than a file URL. */
  | 'mse'
  /** The `<video>` is fed a `MediaStream` (camera, screen, WebRTC). */
  | 'media-stream'
  /** A DASH manifest; reel reads files and HLS playlists, not MPDs. */
  | 'dash'
  /** The URL could not be read: a network error or, most often, a cross-origin file without CORS headers. */
  | 'unreachable'
  /** The bytes are not a container reel can read. */
  | 'unsupported-container'
  /** The source has no video track. */
  | 'no-video'
  /** This browser cannot decode the source's video codec (also what encrypted tracks look like). */
  | 'undecodable-video'
  /** This browser has no H.264 encoder at the clip's size; clips are always H.264 in MP4. */
  | 'no-video-encoder'
