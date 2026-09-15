import type { CaptionTrackInfo, QualityLevelInfo } from '@/types/playback'

export type BuiltinAction = 'mute' | 'loop' | 'autoplay'

export interface CustomAction {
  icon: string
  label: string
  onClick: () => void
}

export type PlayerAction = BuiltinAction | CustomAction

export type StateChangeType =
  | 'play'
  | 'pause'
  | 'ended'
  | 'seeked'
  | 'error'
  | 'adstart'
  | 'adend'
  | 'volumechange'
  | 'ratechange'
  | 'captionchange'
  | 'qualitychange'
  | 'pipchange'
  | 'loopchange'
  | 'firstQuartile'
  | 'midpoint'
  | 'thirdQuartile'
  | 'controlsopen'
  | 'controlsclose'
  | 'stageopen'
  | 'stageclose'
  | 'bufferstart'
  | 'bufferend'
  | 'timeupdate'
  | 'tap'

export interface StateChangeEvent {
  type: StateChangeType
  currentTime: number
  duration: number
  src: string
  error?: { code: number; message: string } | null
  isMuted?: boolean
  playbackRate?: number
  /** null means captions/quality are off (captionIndex) or Auto (qualityIndex). */
  captionIndex?: number | null
  qualityIndex?: number | null
  isPipActive?: boolean
  isLooping?: boolean
  element?: HTMLElement | null
  payload?: Record<string, unknown>
}

export interface HeaderBiddingAdUnit {
  code: string
  mediaTypes: { video: Record<string, unknown> }
  bids: Array<{ bidder: string; params?: Record<string, unknown> }>
}

export interface HeaderBiddingConfig {
  /** A standard Prebid.js video ad unit — the same object you'd otherwise pass to `pbjs.addAdUnits()` yourself. */
  adUnit: HeaderBiddingAdUnit
  /** Extra params for `pbjs.adServers.gam.buildVideoUrl()`, e.g. `{ iu: '/network/adunit' }`. */
  params?: Record<string, string>
  /** Passed to `pbjs.requestBids()` and also used as this step's own fail-open timeout. Defaults to 1000ms. */
  timeoutMs?: number
}

export interface CaptionTrackDef {
  /** A WebVTT file URL — <track> only understands VTT, not SRT or other subtitle formats. */
  src: string
  kind?: 'captions' | 'subtitles'
  srclang?: string
  label?: string
  default?: boolean
}

export interface PlayerProps {
  src: string
  title?: string
  poster?: string
  aspectRatio?: string
  adTagUrl?: string
  adMacroParams?: Record<string, string>
  headerBidding?: HeaderBiddingConfig
  /** WebVTT caption/subtitle tracks for plain HTML5/HLS sources - embed platforms ignore this entirely and render their own. */
  tracks?: CaptionTrackDef[]
  autoplay?: boolean
  muted?: boolean
  /** Initial volume, 0-1. Defaults to 1 (full volume) - see VideoStage's withCarriedMute for carrying the viewer's own choice across a playlist swap. */
  volume?: number
  playbackRate?: number
  nativeUi?: boolean
  autoStage?: boolean
  lazy?: boolean
  /** A raw JSON string is also accepted, since a custom element attribute like `payload='{"a":1}'` otherwise arrives as a literal string, not an object. */
  payload?: Record<string, unknown> | string
  action?: PlayerAction | null
  disableTapCapture?: boolean
  /** Disables Space/K/arrows/M/F/C/0-9 hotkeys while the player shell has focus. */
  disableKeyboardShortcuts?: boolean
  controls?: boolean
  /** Auto-play once at least half the player is visible, and auto-pause once it isn't - e.g. for a scroll-snap feed. Implies muted unless `muted` is set explicitly. */
  playInView?: boolean
  /** Pins the player to this screen corner once scrolled out of view while playing, instead of auto-pausing. Pausing while pinned does not unpin it. Omit to disable. */
  pin?: PinCorner
  /** Start with looping on. Reactive - changing it later is the same as calling `toggleLoop()`. */
  loop?: boolean
  /** How much media to fetch before playback - the native `<video preload>` attribute. Unset leaves the browser default. `'none'` also holds hls.js back until the first play (DASH is not deferred); other values leave HLS loading as normal. Embed platforms ignore it. */
  preload?: PreloadMode
}

export type PinCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

/** The native `<video preload>` values. */
export type PreloadMode = 'none' | 'metadata' | 'auto'

export interface VideoStateDetail {
  currentSrc: string | null
  isPlaying: boolean
}

export interface VideoToggleDetail {
  src: string
}

export type VideoEntry = PlayerProps

/** Same shape as `VideoEntry` plus `fromGesture` - explicitly whether a real user gesture triggered this, distinct from `autoplay`. */
export interface VideoSelectDetail extends VideoEntry {
  fromGesture?: boolean
}

/** One entry in a `Transcript`'s cue list. */
export interface TranscriptCue {
  /** Start time in seconds. */
  time: number
  /** Optional end time in seconds - between it and the next cue's start, no cue is highlighted. */
  end?: number
  text: string
}

/** The curated subset a headless control needs - narrow so any player-shaped ref satisfies it structurally, without importing usePlayer. */
export interface PlayerHandle {
  isPlaying: boolean
  togglePlay(): void
  hasEnded: boolean
  isError: boolean
  /** Re-attempts loading the current source after an error. */
  retry(): void
  isMuted: boolean
  toggleMute(): void
  /** False whenever muted OR volume is dragged to 0 without hitting mute - the single "should this look/sound silent" read. */
  isAudible: boolean
  isFullscreen: boolean
  toggleFullscreen(): void
  current: number
  total: number
  /** Percentage (0-100) of total duration, not absolute seconds. */
  seek(percent: number): void
  /** Percentage (0-100) buffered ahead - at least as far as `progress`, for a scrubber's buffered-fill display. */
  bufferedDisplay: number
  isBuffering: boolean
  isLive: boolean
  /** 0-1. */
  vol: number
  /** 0-1. */
  setVolume(vol: number): void
  isLooping: boolean
  toggleLoop(): void
  supportsPip: boolean
  isPipActive: boolean
  togglePip(): void
  supportsCaptions: boolean
  captionTracks: CaptionTrackInfo[]
  activeCaptionIndex: number | null
  setCaptionTrack(index: number | null): void
  supportsQuality: boolean
  qualityLevels: QualityLevelInfo[]
  currentQualityIndex: number | null
  isAutoQuality: boolean
  setQuality(index: number | null): void
  supportsPlaybackRate: boolean
  /** Named `currentPlaybackRate`, not `playbackRate` - see `UsePlayerReturn`'s doc comment on the same field for why. */
  currentPlaybackRate: number
  setPlaybackRate(rate: number): void
}
