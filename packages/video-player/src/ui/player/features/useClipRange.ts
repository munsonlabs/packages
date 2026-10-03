import { onBeforeUnmount, watch } from 'vue'
import type { ClipRange, ClipRangeEnd, ClipRangeOptions } from '@/types/player'
import type { PlayerState } from '@/ui/player/playerState'

/** Seconds outside the range a playhead may land before a loop lets go: a seek away, not drift. */
const LEAVE_TOLERANCE_S = 1

export interface ClipRangeDeps {
  seek: (seconds: number) => void
  pause: () => void
  play: () => Promise<void>
  /** Stops position memory from restoring over the range on first play. */
  forgoRestore: () => void
}

export interface UseClipRangeReturn {
  setClipRange: (range: ClipRange | null, options?: ClipRangeOptions) => void
}

/** A per-frame callback on a media element, cancellable: `requestVideoFrameCallback` where there is one, else `requestAnimationFrame`. */
export function requestMediaFrame(media: HTMLVideoElement, callback: () => void): () => void {
  if (typeof media.requestVideoFrameCallback === 'function') {
    const id = media.requestVideoFrameCallback(callback)
    return () => media.cancelVideoFrameCallback(id)
  }
  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}

/**
 * The range a player highlights on its scrubber and holds playback to: `clipRange` on the handle,
 * set with `setClipRange()` by a host (reel's picker loops its preview through it) or by a deep link.
 *
 * Setting a range does not seek: the caller decides where playback is. Once the playhead is inside
 * the range, reaching its end pauses once (`end: 'pause'`, the default), seeks back to the start
 * until the viewer seeks more than a second outside it (`'loop'`, which then clears the range), or
 * plays on (`'continue'`). A range with `end: null` (an open link like `#ml-t=42`) is only highlighted.
 *
 * On the native path the end is checked on every presented frame while playing
 * (`requestVideoFrameCallback`, else `requestAnimationFrame`), so a loop or a pause lands within
 * about a frame of the end rather than up to a `timeupdate` (a quarter of a second) late. The frame
 * loop runs only while playing inside an armed range and is cancelled on pause, end, a cleared range
 * and unmount. It starts only once `timeupdate` has shown the clock moving since play: per-frame
 * work on a stream whose clock has stalled (WebKit's native MPEG-TS HLS in Playwright) makes WebKit
 * fail it with "Media failed to decode", so a stalled stream keeps the `timeupdate` path. `timeupdate`
 * still checks too, which is all an embed has, and covers a hidden tab where frame callbacks stop. A range that runs to the end of the media loops from the `ended` event,
 * since the last check can come before the range's end does.
 */
export function useClipRange(state: PlayerState, deps: ClipRangeDeps): UseClipRangeReturn {
  let mode: ClipRangeEnd = 'pause'
  let armed = false
  let entered = false
  let cancelFrame: (() => void) | null = null
  /** Where playback was when it last started, and whether the clock has moved since. */
  let playedFrom: number | null = null
  let advancing = false

  function setClipRange(range: ClipRange | null, options: ClipRangeOptions = {}): void {
    mode = options.end ?? 'pause'
    entered = false
    if (!range) {
      armed = false
      state.clipRange.value = null
      syncFrameLoop()
      return
    }
    deps.forgoRestore()
    const end = range.end ?? null
    state.clipRange.value = { start: range.start, end }
    armed = end !== null
    syncFrameLoop()
  }

  function loopToStart(start: number): void {
    deps.seek(start)
    if (!state.isPlaying.value) void deps.play().catch(() => {})
  }

  /** Applies the range's end behaviour to the playhead at `time`, from a frame callback or `timeupdate`. */
  function check(time: number): void {
    const range = state.clipRange.value
    if (!range || range.end === null) return
    if (!entered) {
      // Until a seek lands, the playhead is still wherever it was before the range was set.
      if (time < range.start - LEAVE_TOLERANCE_S || time > range.end) return
      entered = true
    }
    if (mode === 'loop' && (time < range.start - LEAVE_TOLERANCE_S || time > range.end + LEAVE_TOLERANCE_S)) {
      // The viewer went elsewhere; the range stops holding them.
      armed = false
      state.clipRange.value = null
      syncFrameLoop()
      return
    }
    if (!armed || time < range.end) return
    if (mode === 'pause') {
      armed = false
      deps.pause()
    } else if (mode === 'loop') {
      // At the very end of the media, the `ended` watcher below does it once.
      if (!state.hasEnded.value) loopToStart(range.start)
    } else {
      armed = false
    }
    syncFrameLoop()
  }

  function stopFrameLoop(): void {
    cancelFrame?.()
    cancelFrame = null
  }

  /** Runs the per-frame check exactly while it can matter: native media, playing, inside an armed range with an end. */
  function syncFrameLoop(): void {
    const media = state.mediaElement.value
    const range = state.clipRange.value
    const wanted = media !== null && advancing && armed && range !== null && range.end !== null && state.isPlaying.value && !state.hasEnded.value
    if (!wanted) {
      stopFrameLoop()
      return
    }
    if (cancelFrame) return
    const onFrame = () => {
      cancelFrame = null
      if (media.paused || media.ended) {
        // The `pause`/`ended` events will follow and stop the loop for good; nothing to check until then.
        syncFrameLoop()
        return
      }
      check(media.currentTime)
      syncFrameLoop()
    }
    cancelFrame = requestMediaFrame(media, onFrame)
  }

  watch(state.currentTime, (time) => {
    if (!advancing && state.isPlaying.value && playedFrom !== null && time !== playedFrom) advancing = true
    check(time)
    syncFrameLoop()
  })
  watch(state.isPlaying, (playing) => {
    playedFrom = playing ? state.currentTime.value : null
    advancing = false
  })
  watch([state.isPlaying, state.hasEnded, state.mediaElement], syncFrameLoop)

  watch(state.hasEnded, (ended) => {
    const range = state.clipRange.value
    if (ended && range && range.end !== null && armed && mode === 'loop') loopToStart(range.start)
  })

  onBeforeUnmount(stopFrameLoop)

  return { setClipRange }
}
