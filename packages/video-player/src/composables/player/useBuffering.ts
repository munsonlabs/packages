import { ref, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { PlaybackAdapter } from '@/types/playback'
import type { StateChangeType } from '@/types/player'
import { BUFFERING_SPINNER_DELAY_MS } from '@/constants'

export interface UseBufferingReturn {
  isBuffering: Ref<boolean>
  attachPlayerEvents: (player: PlaybackAdapter) => void
  reset: () => void
}

export function useBuffering(fire: (type: StateChangeType) => void): UseBufferingReturn {
  const isBuffering = ref(false)
  let bufferingTimer: ReturnType<typeof setTimeout> | null = null

  function reset(): void {
    clearTimeout(bufferingTimer ?? undefined)
    if (isBuffering.value) fire('bufferend')
    isBuffering.value = false
  }

  function attachPlayerEvents(player: PlaybackAdapter): void {
    player.on('waiting', () => {
      clearTimeout(bufferingTimer ?? undefined)
      bufferingTimer = setTimeout(() => {
        isBuffering.value = true
        fire('bufferstart')
      }, BUFFERING_SPINNER_DELAY_MS)
    })

    player.on('playing', reset)
    player.on('canplay', reset)
  }

  onBeforeUnmount(() => clearTimeout(bufferingTimer ?? undefined))

  return { isBuffering, attachPlayerEvents, reset }
}
