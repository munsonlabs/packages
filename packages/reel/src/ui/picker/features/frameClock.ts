import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

function requestFrame(media: HTMLVideoElement, callback: () => void): () => void {
  if (typeof media.requestVideoFrameCallback === 'function') {
    const id = media.requestVideoFrameCallback(callback)
    return () => media.cancelVideoFrameCallback(id)
  }
  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}

export interface FrameClock {
  time: Ref<number | null>
}

/**
 * The preview's position per presented frame while it plays (`requestVideoFrameCallback`, else rAF),
 * so the playhead and overlay move with the picture, not `timeupdate`. Runs only while `active()`,
 * playing and visible; otherwise `time` follows `currentTime`, which covers seeks and embeds without a
 * `mediaElement`. It starts only once `currentTime` has moved since play: per-frame work on a stream
 * whose clock has stalled (WebKit's native MPEG-TS HLS in Playwright) makes WebKit fail it with "Media
 * failed to decode".
 */
export function useFrameClock(player: () => PlayerHandle | null, active: () => boolean): FrameClock {
  const time = ref<number | null>(null)
  let cancel: (() => void) | null = null
  let visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
  let playedFrom: number | null = null
  let advancing = false

  function stop(): void {
    cancel?.()
    cancel = null
  }

  function sync(): void {
    const handle = player()
    const media = handle?.mediaElement ?? null
    if (!handle?.isPlaying) {
      playedFrom = null
      advancing = false
    } else if (playedFrom === null) {
      playedFrom = handle.currentTime
    } else if (handle.currentTime !== playedFrom) {
      advancing = true
    }
    if (!handle || !media || !active() || !visible || !handle.isPlaying || !advancing) {
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

  function onVisibility(): void {
    visible = document.visibilityState !== 'hidden'
    sync()
  }

  watch(() => [player(), player()?.mediaElement, player()?.isPlaying, player()?.currentTime, active()], sync, { immediate: true })
  document.addEventListener('visibilitychange', onVisibility)
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { time }
}
