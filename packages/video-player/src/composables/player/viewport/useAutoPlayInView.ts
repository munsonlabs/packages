import { onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { PlaybackAdapter } from '@/types/playback'
import { observeViewportPriority } from '@/composables/player/viewport/viewportObserver'
import { getShellEl } from '@/adapters/embeds/embedShared'
import { resolveInitialMuted } from '@/composables/player/useAdapterMount'

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
      /** Re-resolved here, not just at mount - the stored preference can change while this sat paused. */
      player.setMuted(resolveInitialMuted(explicitMuted, true))
      void player.play().catch(() => {})
    })
  })

  onBeforeUnmount(() => unobserve?.())
}
