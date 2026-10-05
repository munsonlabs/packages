import type { InputAudioTrack } from 'mediabunny'

export type SpliceSource = Blob | string | URL | HTMLVideoElement

export interface SpliceOptions {
  source: SpliceSource
  start?: number
  end?: number
  crop?: CropOptions
  captions?: CaptionInput
  captionPosition?: CaptionPosition
  origin?: SpliceOrigin
  endCard?: EndCardOptions
  stamp?: StampOptions
  watermark?: WatermarkOptions
  audio?: boolean
  onProgress?: (fraction: number) => void
  onWarning?: (message: string) => void
  signal?: AbortSignal
}

export type ImageSource = Blob | string | URL

export interface EndCardTheme {
  background?: string
  color?: string
  accent?: string
}

export interface EndCardOptions {
  duration?: number
  title?: string
  publisher?: string
  displayUrl?: string
  cta?: string
  logo?: ImageSource
  theme?: EndCardTheme
}

export type StampPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface StampOptions {
  logo: ImageSource
  position?: StampPosition
  size?: number
  opacity?: number
}

export interface WatermarkOptions {
  text: string
  position?: 'top' | 'bottom'
}

export interface SpliceOrigin {
  url: string
  title?: string
  publisher?: string
  player?: string
}

export interface CaptionCue {
  start: number
  end: number
  text: string
}

export type CaptionInput = CaptionCue[] | string | URL

export type CaptionPosition = 'top' | 'middle' | 'bottom'

export interface CropOptions {
  aspect: `${number}:${number}`
  focus?: { x?: number; y?: number }
  height?: number
}

export interface SourceInfo {
  resolved: Blob | string
  width: number
  height: number
  duration: number
  videoCodec: string | null
  audioCodec: string | null
}

export interface PlanRequest {
  width: number
  height: number
  audioTrack: InputAudioTrack | null
  audio?: boolean
}

export interface OutputPlan {
  audio: 'copy' | 'encode' | 'none' | 'unavailable'
}

export type CanSpliceOptions = Pick<SpliceOptions, 'crop' | 'audio'>

export type CanSpliceResult = { ok: true; info: SourceInfo; plan: OutputPlan } | { ok: false; message: string }

export interface ThumbnailOptions {
  source: SpliceSource
  start?: number
  end?: number
  count?: number
  width?: number
  onThumbnail: (index: number, image: CanvasImageSource, time: number) => void
  signal?: AbortSignal
}
