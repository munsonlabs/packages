import type { ClipSource } from '@/types/sources'

/**
 * A target aspect ratio as `'width:height'`, e.g. `'9:16'` for vertical shorts, or `'source'` to keep
 * the frame uncropped.
 */
export type Aspect = '9:16' | '4:5' | '1:1' | '16:9' | 'source' | `${number}:${number}`

/**
 * Where the crop window sits inside the source frame. Each axis runs from 0 (left/top edge) to 1
 * (right/bottom edge) and names the centre of the window, clamped so the window never leaves the
 * frame. A plain number is the horizontal position, which is the only axis a 9:16 crop of a landscape
 * video can move along.
 */
export type CropFocus = number | { x?: number; y?: number }

export interface CropOptions {
  /** Target aspect ratio. Defaults to `'9:16'`. */
  aspect?: Aspect
  /** Centre of the crop window. Defaults to the middle of the frame. */
  focus?: CropFocus
  /**
   * Output height in pixels. Defaults to the height of the crop window itself, so nothing is upscaled;
   * a 720p source gives a 404x720 9:16 clip. Set `1920` to always produce 1080x1920.
   */
  height?: number
}

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
  /** Crop window. Defaults to a centred 9:16 window at the crop's own resolution. */
  crop?: CropOptions
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
