import { ref, watch, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

export const preferredQuality = ref<number | null>(null)

/** Remembers the height a viewer picks and toasts that pick, while staying quiet for Auto's own switches. */
export function useQualityPreference(handle: Ref<PlayerHandle | null>, onPick: (label: string) => void): void {
  watch(
    () => handle.value?.currentQualityHeight,
    (height, previous) => {
      const player = handle.value
      if (!player || previous === undefined) return

      const picked = player.isAutoQuality ? null : (height ?? null)
      if (picked === preferredQuality.value) return

      preferredQuality.value = picked
      const level = picked === null ? null : player.qualityLevels.find((q) => q.height === picked)
      if (level) onPick(level.label)
    },
  )
}
