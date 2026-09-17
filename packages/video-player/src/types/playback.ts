import type { PlaybackListener } from '@/composables/player/emitter'
import type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'

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
  play(): void | Promise<void>
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
  /** Same reasoning as supportsPlaybackRate — HLS manifests parse asynchronously. */
  supportsCaptions(): boolean
  getCaptionTracks(): CaptionTrackInfo[]
  /** null turns captions off. */
  setCaptionTrack(index: number | null): void
  /** Can't be inferred from our own setCaptionTrack() calls - a `default`-attribute track can be shown by the browser directly. */
  getActiveCaptionTrack(): number | null
  /** Only meaningful for HLS via hls.js or DASH via dash.js. */
  supportsQuality(): boolean
  getQualityLevels(): QualityLevelInfo[]
  /** null means "Auto" (the current level, whatever it is, is still reported via getCurrentQuality()). */
  getCurrentQuality(): number | null
  isAutoQuality(): boolean
  /** null re-enables automatic (ABR) selection. */
  setQuality(index: number | null): void
  /** Whether this backend has a real <video> element to request Picture-in-Picture on. */
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

export type EmbedAdapterFactory = (videoEl: HTMLVideoElement, options: EmbedAdapterOptions) => PlaybackAdapter

export type SourceResolver = (url: string) => ResolvedSource | Promise<ResolvedSource>

export type PlatformConfig = Pick<Matcher, 'key' | 'test'> &
  ({ embed: true; createAdapter: EmbedAdapterFactory } | { embed: false; resolveSource?: SourceResolver })
