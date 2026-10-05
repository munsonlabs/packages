import type { UnwrapNestedRefs } from 'vue'
import type { UsePlayerReturn } from '@/ui/player/usePlayer'
import type { PlayerMethodKey, PlayerStateKey } from '@/ui/player/playerSurface'

export type BuiltinAction = 'mute' | 'loop' | 'autoplay'

export interface CustomAction {
  icon: string
  label: string
  onClick: () => void
}

export type PlayerAction = BuiltinAction | CustomAction

export type StateChangeType =
  | 'loaded'
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
  captionIndex?: number | null
  qualityHeight?: number | null
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
  label?: string
  poster?: string
  aspectRatio?: string
  adTagUrl?: string
  adMacroParams?: Record<string, string>
  headerBidding?: HeaderBiddingConfig
  tracks?: CaptionTrackDef[]
  captionLine?: number
  autoplay?: boolean
  muted?: boolean
  /** 0-1. */
  volume?: number
  playbackRate?: number
  /** A target height in pixels (the 720 in 720p); the nearest level the source offers wins. `null` leaves Auto. */
  quality?: number | null
  nativeUi?: boolean
  payload?: Record<string, unknown> | string
  action?: PlayerAction | null
  disableTapCapture?: boolean
  disableKeyboardShortcuts?: boolean
  controls?: boolean
  /** Play when at least half visible, pause when not. Implies muted unless `muted` is set. */
  playInView?: boolean
  pin?: PinCorner
  loop?: boolean
  /** Native `<video preload>`. `'none'` also holds hls.js back until first play. Embeds ignore it. */
  preload?: PreloadMode
  /**
   * Answer a page URL that points at a moment: `#t=42,52`, `#ml-t=42,52` or `?ml-t=42,52`. `true` takes
   * links without an `ml-player` id (the first such player on the page wins); a string is this
   * player's id and also takes links with `ml-player=<id>`. The player scrolls into view, seeks to the
   * start and highlights the range on the scrubber.
   */
  deepLink?: boolean | string
  /** What happens when a deep-linked range ends: pause once (default), loop until the viewer seeks away, or play on. */
  deepLinkEnd?: DeepLinkEnd
}

/** What playback does at the end of a clip range: pause once, loop until the viewer seeks away, or play on. */
export type ClipRangeEnd = 'pause' | 'loop' | 'continue'

export type DeepLinkEnd = ClipRangeEnd

/**
 * A stretch of the media in seconds, highlighted on the scrubber and held by `setClipRange()`'s `end`
 * behaviour; `end` is `null` for an open range like the deep link `#t=42`, which is only highlighted.
 */
export interface ClipRange {
  start: number
  end: number | null
}

export interface ClipRangeOptions {
  /** What happens when playback reaches the range's end. Defaults to `'pause'`. */
  end?: ClipRangeEnd
}

export type PinCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export type PreloadMode = 'none' | 'metadata' | 'auto'

export interface VideoToggleDetail {
  src: string
}

export interface VideoEntry extends PlayerProps {
  lazy?: boolean
  autoStage?: boolean
}

/** Same shape as `VideoEntry` plus `fromGesture` - explicitly whether a real user gesture triggered this, distinct from `autoplay`. */
export interface VideoSelectDetail extends VideoEntry {
  fromGesture?: boolean
}

export interface TranscriptCue {
  time: number
  end?: number
  text: string
}

export type PlayerHandle = Pick<UnwrapNestedRefs<UsePlayerReturn>, PlayerMethodKey | PlayerStateKey>
