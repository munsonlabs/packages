import { ref, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

export const HOLD_RATE = 2
const HOLD_DELAY_MS = 200

/**
 * Press-and-hold to fast-forward, TikTok-style. A tap shorter than the delay does nothing, and a
 * live stream is left alone. `rate` is meant to be bound straight to VideoCard's `playback-rate`.
 */
export function useHoldToFastForward(handle: Ref<PlayerHandle | null>) {
  const holding = ref(false)
  const rate = ref(1)
  let timer: ReturnType<typeof setTimeout> | undefined

  function onPointerDown(e: PointerEvent): void {
    if (handle.value?.isLive) return
    e.preventDefault()
    clearTimeout(timer)
    timer = setTimeout(() => {
      rate.value = HOLD_RATE
      holding.value = true
    }, HOLD_DELAY_MS)
  }

  function onPointerUp(): void {
    clearTimeout(timer)
    timer = undefined
    if (!holding.value) return
    rate.value = 1
    holding.value = false
  }

  return { holding, rate, onPointerDown, onPointerUp }
}
