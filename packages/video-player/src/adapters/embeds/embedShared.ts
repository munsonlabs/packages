import { MVP_FULLSCREEN_PENDING, MVP_FULLSCREEN_PENDING_DONE, MVP_TECH_CLASS } from '@/constants'
import { isIOS, requestFullscreen, exitFullscreen as exitDocFullscreen } from '@/utils/platform'
import { createEmitter } from '@/composables/player/emitter'
import type { Emitter } from '@/composables/player/emitter'
import type { PlaybackAdapter, MediaErrorLike } from '@/types/playback'

type EmbedUnsupportedFeatures = Pick<
  PlaybackAdapter,
  | 'supportsCaptions'
  | 'getCaptionTracks'
  | 'setCaptionTrack'
  | 'getActiveCaptionTrack'
  | 'supportsQuality'
  | 'getQualityLevels'
  | 'getCurrentQuality'
  | 'isAutoQuality'
  | 'setQuality'
  | 'supportsPip'
  | 'isPipActive'
  | 'togglePip'
>

/** None of the embed techs (YouTube, Vimeo, Dailymotion) expose captions, quality selection, or PiP through their SDKs. */
export const EMBED_UNSUPPORTED_FEATURES: EmbedUnsupportedFeatures = {
  supportsCaptions: () => false,
  getCaptionTracks: () => [],
  setCaptionTrack: () => {},
  getActiveCaptionTrack: () => null,
  supportsQuality: () => false,
  getQualityLevels: () => [],
  getCurrentQuality: () => null,
  isAutoQuality: () => true,
  setQuality: () => {},
  supportsPip: () => false,
  isPipActive: () => false,
  togglePip: () => {},
}

export interface EmbedAdapterOptions {
  src: string
  poster?: string
  autoplay?: boolean
  muted?: boolean
  volume?: number
  nativeUi?: boolean
  customVars?: Record<string, unknown>
}

let mountCounter = 0

export interface EmbedMount {
  techId: string
  wrapper: HTMLDivElement
  innerDiv: HTMLDivElement
}

/** YouTube replaces its target element with the iframe itself; Vimeo/Dailymotion insert one as a descendant instead - watching the wrapper (which persists either way) covers both shapes. Self-disconnects once found, since none of the three SDKs replace the iframe node again after that. */
function excludeIframeFromTabOrder(wrapper: HTMLDivElement): void {
  const existing = wrapper.querySelector('iframe')
  if (existing) {
    existing.tabIndex = -1
    return
  }
  const observer = new MutationObserver(() => {
    const iframe = wrapper.querySelector('iframe')
    if (!iframe) return
    iframe.tabIndex = -1
    observer.disconnect()
  })
  observer.observe(wrapper, { childList: true, subtree: true })
}

/** Wrapper starts hidden so the embed SDK's own transient loading chrome never flashes through - the `<video>`'s poster shows instead until revealEmbed() swaps them. */
export function createEmbedMount(videoEl: HTMLVideoElement, cssClass: string, nativeUi?: boolean): EmbedMount {
  videoEl.parentElement?.classList.add(cssClass)

  const techId = `${cssClass}-${++mountCounter}`
  const innerDiv = document.createElement('div')
  innerDiv.id = techId
  innerDiv.className = MVP_TECH_CLASS
  innerDiv.style.cssText = 'width:100%;height:100%;top:0;left:0;position:absolute'

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity 0.2s'
  wrapper.appendChild(innerDiv)

  videoEl.parentElement?.insertBefore(wrapper, videoEl)

  /** Left alone when nativeUi is on - the platform's own accessible controls live inside that iframe, and this would block keyboard access to them entirely. */
  if (!nativeUi) excludeIframeFromTabOrder(wrapper)

  return { techId, wrapper, innerDiv }
}

export function revealEmbed(videoEl: HTMLVideoElement, wrapper: HTMLDivElement): void {
  videoEl.style.display = 'none'
  wrapper.style.opacity = '1'
  wrapper.style.pointerEvents = ''
}

export function teardownEmbedMount(videoEl: HTMLVideoElement, wrapper: HTMLDivElement, cssClass: string): void {
  wrapper.remove()
  videoEl.parentElement?.classList.remove(cssClass)
  videoEl.style.display = ''
}

export function getShellEl(videoEl: HTMLVideoElement): HTMLElement | null {
  return videoEl.closest('.player__shell')
}

/** iframes can't be fullscreened on iOS - `iosFallback` handles that case itself, or returns `false` to fall through to the shell path. */
export function enterFullscreenWithIosFallback(videoEl: HTMLVideoElement, iosFallback: () => boolean | void): void {
  if (isIOS()) {
    const handled = iosFallback()
    if (handled !== false) return
  }
  const shell = getShellEl(videoEl)
  if (shell) requestFullscreen(shell)
}

export function exitEmbedFullscreen(): void {
  exitDocFullscreen()
}

export interface TimerScheduler {
  schedule: (fn: () => void, delay?: number) => void
  clearAll: () => void
}

/** Tracks setTimeout ids so an adapter can clear all of them together on dispose. */
export function createTimerScheduler(): TimerScheduler {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  return {
    schedule(fn, delay = 0) {
      const id = setTimeout(() => {
        timers.delete(id)
        fn()
      }, delay)
      timers.add(id)
    },
    clearAll() {
      timers.forEach(clearTimeout)
      timers.clear()
    },
  }
}

/** Off-screen host for an iOS clone player's mount point; `reveal` (clone ready) and `finish` (teardown) are separate so the overlay isn't removed before native fullscreen engages. */
export function spawnIosFullscreenOverlay(emitter: Emitter): {
  overlay: HTMLDivElement
  reveal: () => void
  finish: (onTeardown?: () => void) => void
} {
  emitter.trigger(MVP_FULLSCREEN_PENDING)

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;opacity:0;pointer-events:none'
  document.body.appendChild(overlay)

  let done = false
  function reveal(): void {
    if (done) return
    emitter.trigger(MVP_FULLSCREEN_PENDING_DONE)
  }
  function finish(onTeardown?: () => void): void {
    if (done) return
    done = true
    emitter.trigger(MVP_FULLSCREEN_PENDING_DONE)
    overlay.remove()
    onTeardown?.()
  }

  return { overlay, reveal, finish }
}

/** Mirrored playback state both stateful embeds keep, since the SDKs don't expose queryable getters for everything. */
export interface EmbedMirrorState {
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  paused: boolean
  /** A play()/autoplay request landed before the SDK player existed; consumed via consumeQueuedPlay(). */
  playQueued: boolean
  errorState: MediaErrorLike | null
}

/** What connect() and the overridable impl callbacks get to work with. */
export interface StatefulEmbedCore {
  techId: string
  wrapper: HTMLDivElement
  emitter: Emitter
  state: EmbedMirrorState
  /** Tracked setTimeout - cleared together on dispose, same contract as createTimerScheduler. */
  schedule: TimerScheduler['schedule']
  /** False once dispose() has run - async connect steps re-check after every await. */
  isDisposed: () => boolean
  /** Runs `play` iff a play()/autoplay request was queued while the SDK player was still connecting. */
  consumeQueuedPlay: (play: () => void) => void
}

export interface StatefulEmbedImpl {
  cssClass: string
  /** Must not reject - catch failures into `state.errorState` + `emitter.trigger('error')` instead. */
  connect: (core: StatefulEmbedCore) => Promise<void> | void
  hasPlayer: () => boolean
  play: () => void
  pause: () => void
  seekToSdk?: (seconds: number) => void
  volumeToSdk: (vol: number) => void
  muteToSdk: (core: StatefulEmbedCore, muted: boolean) => void
  /** Override when seek semantics differ from the default (e.g. Vimeo defers to its own 'seeked' event). */
  setCurrentTime?: (core: StatefulEmbedCore, seconds: number) => void
  rate?: (core: StatefulEmbedCore) => Pick<PlaybackAdapter, 'playbackRate' | 'setPlaybackRate'>
  sdkFullscreenEnter?: () => void
  sdkFullscreenExit?: () => void
  destroyPlayer: () => void
}

/** Shared skeleton for Vimeo and Dailymotion - the two "stateful" embed SDKs that need mirrored playback state and queued play() requests, unlike YouTube's event-driven IFrame API. */
export function createStatefulEmbedAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions, impl: StatefulEmbedImpl): PlaybackAdapter {
  const emitter = createEmitter()
  const { techId, wrapper } = createEmbedMount(videoEl, impl.cssClass, options.nativeUi)
  const { schedule, clearAll: clearTimers } = createTimerScheduler()

  const state: EmbedMirrorState = {
    currentTime: 0,
    duration: 0,
    volume: options.volume ?? 1,
    muted: false,
    paused: true,
    playQueued: false,
    errorState: null,
  }

  let disposed = false

  const core: StatefulEmbedCore = {
    techId,
    wrapper,
    emitter,
    state,
    schedule,
    isDisposed: () => disposed,
    consumeQueuedPlay(play) {
      if (!state.playQueued) return
      state.playQueued = false
      play()
    },
  }

  void impl.connect(core)

  function enterFullscreen(): void {
    enterFullscreenWithIosFallback(videoEl, () => {
      if (!impl.sdkFullscreenEnter) return false
      impl.sdkFullscreenEnter()
    })
  }

  function exitFullscreen(): void {
    if (isIOS() && impl.sdkFullscreenExit) {
      impl.sdkFullscreenExit()
      return
    }
    exitDocFullscreen()
  }

  return {
    el: wrapper,
    play: () => {
      if (impl.hasPlayer()) impl.play()
      else state.playQueued = true
    },
    pause: () => impl.pause(),
    paused: () => state.paused,
    currentTime: () => state.currentTime,
    setCurrentTime: (seconds) => {
      if (impl.setCurrentTime) {
        impl.setCurrentTime(core, seconds)
        return
      }
      state.currentTime = seconds
      impl.seekToSdk?.(seconds)
      emitter.trigger('seeking')
    },
    duration: () => state.duration,
    volume: () => state.volume,
    setVolume: (vol) => {
      state.volume = vol
      impl.volumeToSdk(vol)
    },
    muted: () => state.muted,
    setMuted: (muted) => {
      state.muted = muted
      impl.muteToSdk(core, muted)
    },
    ...(impl.rate ? impl.rate(core) : { playbackRate: () => 1, setPlaybackRate: () => {} }),
    bufferedEnd: () => state.currentTime,
    error: (): MediaErrorLike | null => state.errorState,
    /** Only meaningful as a Retry after a failed connect (usePlayer.retry() routes through here) - a live player keeps its source. Mutates `options.src` because each impl's connect() closes over that same object. */
    setSrc: (src) => {
      if (impl.hasPlayer() && !state.errorState) return
      options.src = src
      state.errorState = null
      impl.destroyPlayer()
      void impl.connect(core)
    },
    supportsPlaybackRate: () => false,
    ...EMBED_UNSUPPORTED_FEATURES,
    enterFullscreen,
    exitFullscreen,
    on: emitter.on,
    off: emitter.off,
    dispose: () => {
      disposed = true
      clearTimers()
      impl.destroyPlayer()
      teardownEmbedMount(videoEl, wrapper, impl.cssClass)
      emitter.dispose()
    },
  }
}
