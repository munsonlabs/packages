import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

/**
 * Follows the player's time frame by frame while it plays, with requestVideoFrameCallback or rAF,
 * so the playhead and caption preview keep up with the picture. Otherwise time just follows
 * currentTime. It waits until currentTime has actually moved after play, because per-frame work on
 * a stalled stream makes WebKit fail with "Media failed to decode".
 */
export function useFrameClock(player: () => PlayerHandle | null, active: () => boolean): Ref<number | null> {
  const time = ref<number | null>(null)
  let cancel: (() => void) | null = null
  let visible = document.visibilityState !== 'hidden'
  let playedFrom: number | null = null
  let isAdvancing = false

  const stop = () => {
    cancel?.()
    cancel = null
  }

  const sync = () => {
    const handle = player()
    const media = handle?.mediaElement ?? null

    if (!handle?.isPlaying) {
      playedFrom = null
      isAdvancing = false
    } else if (playedFrom === null) {
      playedFrom = handle.currentTime
    } else if (handle.currentTime !== playedFrom) {
      isAdvancing = true
    }

    const isRunning = handle && media && active() && visible && handle.isPlaying && isAdvancing
    if (!isRunning) {
      stop()
      time.value = handle ? handle.currentTime : null
      return
    }
    if (cancel) return

    cancel = requestFrame(media, () => {
      cancel = null
      time.value = media.currentTime
      sync()
    })
  }

  const onVisibility = () => {
    visible = document.visibilityState !== 'hidden'
    sync()
  }

  watch(() => [player(), player()?.mediaElement, player()?.isPlaying, player()?.currentTime, active()], sync, { immediate: true })
  document.addEventListener('visibilitychange', onVisibility)
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return time
}

/**
 * Asks for a callback on the next video frame, or the next animation frame if that isn't supported,
 * and returns a function to cancel it.
 */
function requestFrame(media: HTMLVideoElement, callback: () => void): () => void {
  if (typeof media.requestVideoFrameCallback === 'function') {
    const id = media.requestVideoFrameCallback(callback)
    return () => media.cancelVideoFrameCallback(id)
  }
  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}
