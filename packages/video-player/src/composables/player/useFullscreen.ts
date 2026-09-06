import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { MVP_FULLSCREEN_PENDING, MVP_FULLSCREEN_PENDING_DONE } from '@/constants'
import { onDocumentFullscreenChange } from '@/composables/registries/documentEventRegistry'
import type { PlaybackAdapter } from '@/types/playback'

export interface UseFullscreenReturn {
  isFullscreen: Ref<boolean>
  isFullscreenPending: Ref<boolean>
  toggleFullscreen: () => void
  markFullscreenPending: () => void
  attachPlayerEvents: (player: PlaybackAdapter) => void
}

export function useFullscreen(getPlayer: () => PlaybackAdapter | null): UseFullscreenReturn {
  const isFullscreen = ref(false)
  const isFullscreenPending = ref(false)
  let unregisterDocListener: (() => void) | null = null

  function onDocFullscreenChange(): void {
    const doc = document as Document & { webkitFullscreenElement?: Element }
    isFullscreen.value = !!(document.fullscreenElement || doc.webkitFullscreenElement)
    isFullscreenPending.value = false
  }

  /** Marks entering-fullscreen as pending itself, so any caller gets the pending-spinner behavior for free. */
  function toggleFullscreen(): void {
    const player = getPlayer()
    if (!player) return
    if (isFullscreen.value) {
      player.exitFullscreen()
      return
    }
    isFullscreenPending.value = true
    player.enterFullscreen()
  }

  /** Lets a caller flag a pending fullscreen request without going through toggleFullscreen() itself. */
  function markFullscreenPending(): void {
    isFullscreenPending.value = true
  }

  /** iOS's webkitEnterFullscreen path never touches document.fullscreenElement - these events cover that gap. */
  function attachPlayerEvents(player: PlaybackAdapter): void {
    player.on(MVP_FULLSCREEN_PENDING, () => {
      isFullscreenPending.value = true
    })
    player.on(MVP_FULLSCREEN_PENDING_DONE, () => {
      isFullscreenPending.value = false
    })
    player.on('nativefullscreenenter', () => {
      isFullscreen.value = true
      isFullscreenPending.value = false
    })
    player.on('nativefullscreenexit', () => {
      isFullscreen.value = false
      isFullscreenPending.value = false
    })
  }

  onMounted(() => {
    unregisterDocListener = onDocumentFullscreenChange(onDocFullscreenChange)
  })
  onBeforeUnmount(() => {
    unregisterDocListener?.()
  })

  return { isFullscreen, isFullscreenPending, toggleFullscreen, markFullscreenPending, attachPlayerEvents }
}
