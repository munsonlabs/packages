import type { CaptionOptions } from '@/types/captions'
import type { EndCardOptions, StampOptions, WatermarkOptions } from '@/types/render'
import type { ClipSource, PlaylistCache, SourceInfo, TrackChoice } from '@/types/sources'

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
  aspect?: Aspect
  focus?: CropFocus
  height?: number
}

/**
 * How a clip will be written, as {@link planOutput} plans it. Every clip is an MP4 with H.264 video and
 * AAC audio, so only the audio varies.
 */
export interface OutputPlan {
  audio: 'copy' | 'encode' | 'none' | 'unavailable'
}

export interface ClipOptions {
  source: ClipSource
  start?: number
  end?: number
  crop?: CropOptions
  captions?: CaptionOptions
  track?: TrackChoice
  audio?: boolean
  origin?: ClipOrigin
  metadata?: boolean
  endCard?: EndCardOptions | boolean
  watermark?: WatermarkOptions
  stamp?: StampOptions
  onProgress?: (fraction: number) => void
  onWarning?: (warning: ClipWarning) => void
  signal?: AbortSignal
  cache?: PlaylistCache
}

/**
 * Something left out of a clip that was still made.
 */
export interface ClipWarning {
  reason: 'logo-unavailable' | 'captions-unavailable' | 'audio-unavailable'
  target: 'endCard' | 'stamp' | 'captions' | 'audio'
  message: string
}

/**
 * The page a clip was cut from, so the clip can point back at it.
 */
export interface ClipOrigin {
  url: string
  title?: string
  publisher?: string
  player?: string
}

/**
 * Why a source cannot be clipped. Every value is a hard stop, not a hint: the source, the page or the
 * browser rules the clip out.
 */
export type ClipBlocker =
  | 'no-webcodecs'
  | 'embed'
  | 'drm'
  | 'mse'
  | 'media-stream'
  | 'dash'
  | 'unreachable'
  | 'unsupported-container'
  | 'no-video'
  | 'undecodable-video'
  | 'no-video-encoder'

export type CanClipResult = { ok: true; info: SourceInfo; plan: OutputPlan } | { ok: false; reason: ClipBlocker; message: string }

export interface StoryboardOptions {
  source: ClipSource
  start?: number
  end?: number
  interval?: number
  tileWidth?: number
  columns?: number
  imageUrl?: string
  exact?: boolean
  track?: TrackChoice
  onTile?: (index: number, image: CanvasImageSource, time: number) => void
  signal?: AbortSignal
  cache?: PlaylistCache
}

export interface Storyboard {
  image: Blob
  vtt: string
  tileWidth: number
  tileHeight: number
  count: number
}
