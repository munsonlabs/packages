import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { PlayerContext, HudContext } from '@/composables/player/playerContext'
import { COMPACT_CONTROLS_WIDTH_PX } from '@/constants'

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

export function useElementCompact(el: Ref<HTMLElement | null>, thresholdPx = COMPACT_CONTROLS_WIDTH_PX): Ref<boolean> {
  const compact = ref(false)
  let observer: ResizeObserver | null = null

  watch(
    el,
    (node) => {
      observer?.disconnect()
      observer = null
      if (!node) return
      observer = new ResizeObserver(([entry]) => {
        compact.value = entry.contentRect.width < thresholdPx
      })
      observer.observe(node)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => observer?.disconnect())

  return compact
}
