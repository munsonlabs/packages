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
  setSrc(src: string, type?: string): void
  /** A method, not a static property - some SDKs (YouTube) only know this after their own async ready callback fires. */
  supportsPlaybackRate(): boolean
  supportsCaptions(): boolean
  getCaptionTracks(): CaptionTrackInfo[]
  setCaptionTrack(index: number | null): void
  /** Can't be inferred from our own setCaptionTrack() calls - a `default`-attribute track can be shown by the browser directly. */
  getActiveCaptionTrack(): number | null
  supportsQuality(): boolean
  getQualityLevels(): QualityLevelInfo[]
  getCurrentQuality(): number | null
  isAutoQuality(): boolean
  setQuality(index: number | null): void
  supportsPip(): boolean
  isPipActive(): boolean
  togglePip(): void
  enterFullscreen(): void
  exitFullscreen(): void
  on(event: string, listener: PlaybackListener): void
  off(event: string, listener: PlaybackListener): void
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
