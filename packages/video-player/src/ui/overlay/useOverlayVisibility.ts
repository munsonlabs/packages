import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { PlayerContext, HudContext } from '@/ui/player/playerContext'

export interface UseOverlayVisibilityReturn {
  hudVisible: ComputedRef<boolean>
  popupVisible: ComputedRef<boolean>
}

export function useOverlayVisibility(player: PlayerContext, hud: HudContext): UseOverlayVisibilityReturn {
  const canShowOverlay = computed(() => player.isReady && !player.isError)

  const hudVisible = computed(() => canShowOverlay.value && hud.showHUD)

  const popupVisible = computed(() => {
    if (!canShowOverlay.value) return false
    if (player.isFullscreen) return hud.showHUD
    return hud.isOpen
  })

  return { hudVisible, popupVisible }
}
