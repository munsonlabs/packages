import type { CanvasSource, Conversion, Input, InputAudioTrack, InputVideoTrack, Output } from 'mediabunny'
import type { EndCardTheme, SourceInfo } from '@/types/splice'

export interface VideoTrackInfo {
  track: InputVideoTrack
  width: number
  height: number
  bitrate: number
  codec: string | null
}

export interface SelectedTracks {
  video: InputVideoTrack
  audio: InputAudioTrack | null
}

export interface OpenedSource extends SelectedTracks {
  input: Input
  info: SourceInfo
  tracks: VideoTrackInfo[]
  isHls: boolean
}

export interface ClipRange {
  start: number
  end: number
}

export interface DrawRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CropPlan {
  width: number
  height: number
  draw: DrawRect
}

export interface ClipPlan extends CropPlan, SelectedTracks {
  hasAudio: boolean
}

export interface EncoderWatchdog {
  wait: <T>(work: Promise<T>) => Promise<T>
  packet: () => void
  readonly hasStalled: boolean
}

export type AvcProfile = 'high' | 'baseline'

export interface Pipeline {
  ctx: OffscreenCanvasRenderingContext2D
  videoSource: CanvasSource
  watchdog: EncoderWatchdog
  output: Output
  conversion?: Conversion
}

export type Painter = (ctx: OffscreenCanvasRenderingContext2D, time: number) => void

export interface EndCard {
  duration: number
  draw: (ctx: OffscreenCanvasRenderingContext2D, time: number, lastFrame: OffscreenCanvas) => void
}

export interface EndCardContent {
  title?: string
  publisher?: string
  address?: string
  cta: string
  theme: Required<EndCardTheme>
  logo: ImageBitmap | null
}

export interface Overlays {
  paint: Painter
  endCard?: EndCard
  dispose: () => void
}

export interface EncodeVideoOptions {
  video: InputVideoTrack
  videoSource: CanvasSource
  watchdog: EncoderWatchdog
  ctx: OffscreenCanvasRenderingContext2D
  draw: DrawRect
  paint: Painter
  endCard?: EndCard
  start: number
  end: number
  onTime: (time: number) => void
  signal?: AbortSignal
}

export type Task = () => unknown

export interface Scope {
  onError: (task: Task) => void
  always: (task: Task) => void
  track: <T>(promise: Promise<T>) => Promise<T>
}
