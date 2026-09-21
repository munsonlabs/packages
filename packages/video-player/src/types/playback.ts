import type { PlaybackListener } from '@/composables/player/emitter'

export interface MediaErrorLike {
  code: number
  message: string
}

export interface CaptionTrackInfo {
  index: number
  label: string
  language: string
}

export interface QualityLevelInfo {
  index: number
  height: number
  bitrate: number
  label: string
}

export interface AudioPreference {
  muted: boolean
  volume: number
}

/**
 * What an adapter can do is expressed by which capability objects it provides, not by a dozen
 * `supportsX()` methods answering "no". An embed simply omits the ones it has no SDK for, instead of
 * stubbing twelve members apiece.
 */
export interface AdapterCaptions {
  tracks(): CaptionTrackInfo[]
  /** Can't be inferred from our own select() calls - a `default`-attribute track can be shown by the browser directly. */
  active(): number | null
  select(index: number | null): void
}

export interface AdapterQuality {
  levels(): QualityLevelInfo[]
  current(): number | null
  isAuto(): boolean
  select(index: number | null): void
}

export interface AdapterPip {
  /** Picture-in-Picture can be disabled per element and per document, so this stays a question, not a presence check. */
  isSupported(): boolean
  isActive(): boolean
  toggle(): void
}

/** Every event an adapter emits. Typed so a misspelling in a consumer is a compile error rather than a listener that never fires. */
export type PlaybackEvent =
  | 'play'
  | 'pause'
  | 'playing'
  | 'ended'
  | 'error'
  | 'timeupdate'
  | 'durationchange'
  | 'progress'
  | 'volumechange'
  | 'ratechange'
  | 'seeked'
  | 'waiting'
  | 'canplay'
  | 'qualitychange'
  | 'captionschange'
  | 'pipchange'
  | 'adstart'
  | 'adend'
  | 'nativefullscreenenter'
  | 'nativefullscreenexit'
  | 'fullscreen-pending'
  | 'fullscreen-pending-done'

export interface PlaybackAdapter {
  readonly el: HTMLElement
  play(): Promise<void>
  pause(): void
  paused(): boolean
  currentTime(): number
  setCurrentTime(seconds: number): void
  duration(): number
  volume(): number
  setVolume(vol: number): void
  muted(): boolean
  setMuted(muted: boolean): void
  playbackRate(): number
  setPlaybackRate(rate: number): void
  bufferedEnd(): number
  error(): MediaErrorLike | null
  /** Swaps the source. `type` steers the streaming engine and is ignored by embeds, which read it from the URL. */
  load(src: string, type?: string): void
  /** Re-attempts the current source after an error. Distinct from `load`: embeds reconnect rather than swap, and there is nothing to swap to. */
  retry(): void
  /** A method, not a static property - some SDKs (YouTube) only know this after their own async ready callback fires. */
  supportsPlaybackRate(): boolean
  captions?: AdapterCaptions
  quality?: AdapterQuality
  pip?: AdapterPip
  /** Embeds hide a placeholder <video> behind their iframe and reveal it on first play; native playback has nothing to reveal. */
  reveal?(videoEl: HTMLVideoElement): void
  enterFullscreen(): void
  exitFullscreen(): void
  on(event: PlaybackEvent, listener: PlaybackListener): void
  off(event: PlaybackEvent, listener: PlaybackListener): void
  dispose(): void
}

export interface ResolvedSource {
  src: string
  type?: string
  poster?: string | null
  adTagUrl?: string | null
}

export interface Matcher {
  test: (src: string) => boolean
  key: string
  embed: boolean
}

export interface EmbedAdapterOptions {
  src: string
  poster?: string
  autoplay?: boolean
  muted?: boolean
  volume?: number
  nativeUi?: boolean
}

export type EmbedAdapterFactory = (videoEl: HTMLVideoElement, options: EmbedAdapterOptions) => PlaybackAdapter

export type SourceResolver = (url: string) => ResolvedSource | Promise<ResolvedSource>

export type PlatformConfig = Pick<Matcher, 'key' | 'test'> &
  ({ embed: true; createAdapter: EmbedAdapterFactory } | { embed: false; resolveSource?: SourceResolver })
