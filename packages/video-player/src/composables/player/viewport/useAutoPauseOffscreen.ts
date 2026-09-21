import { onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { PlaybackAdapter } from '@/types/playback'
import { observeViewport } from '@/composables/player/viewport/viewportObserver'
import { getShellEl } from '@/utils/shell'
import { PAUSE_BELOW_RATIO } from '@/constants'

export function useAutoPauseOffscreen(
  videoEl: Ref<HTMLVideoElement | null>,
  getPlayer: () => PlaybackAdapter | null,
  isFullscreen: Ref<boolean>,
  isFullscreenPending: Ref<boolean>,
  pinWhenOutOfView: Ref<boolean>,
): void {
  let unobserve: (() => void) | null = null

  onMounted(() => {
    const shell = videoEl.value && getShellEl(videoEl.value)
    if (!shell) return

    unobserve = observeViewport(shell, (entry) => {
      const player = getPlayer()
      if (
        entry.intersectionRatio < PAUSE_BELOW_RATIO &&
        player &&
        !player.paused() &&
        !isFullscreen.value &&
        !isFullscreenPending.value &&
        !pinWhenOutOfView.value
      ) {
        player.pause()
      }
    })
  })

  onBeforeUnmount(() => unobserve?.())
}
