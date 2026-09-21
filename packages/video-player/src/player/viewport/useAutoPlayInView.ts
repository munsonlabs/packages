import { onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { PlaybackAdapter } from '@/types/playback'
import { observeViewportPriority } from '@/player/viewport/viewportObserver'
import { getShellEl } from '@/utils/shell'
import { resolveInitialMuted } from '@/player/adapterMount'

export function useAutoPlayInView(
  videoEl: Ref<HTMLVideoElement | null>,
  getPlayer: () => PlaybackAdapter | null,
  isFullscreen: Ref<boolean>,
  isFullscreenPending: Ref<boolean>,
  explicitMuted: boolean | undefined,
): void {
  let unobserve: (() => void) | null = null

  onMounted(() => {
    const shell = videoEl.value && getShellEl(videoEl.value)
    if (!shell) return

    unobserve = observeViewportPriority(shell, () => {
      const player = getPlayer()
      if (!player || !player.paused() || isFullscreen.value || isFullscreenPending.value) return
      player.setMuted(resolveInitialMuted(explicitMuted, true))
      void player.play().catch(() => {})
    })
  })

  onBeforeUnmount(() => unobserve?.())
}
