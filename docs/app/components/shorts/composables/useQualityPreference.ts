import { ref, watch, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

export const preferredQuality = ref<number | null>(null)

export function useQualityPreference(handle: Ref<PlayerHandle | null>, onPick: (label: string) => void): void {
  watch(
    () => handle.value?.currentQualityIndex,
    (index, previous) => {
      const h = handle.value
      if (!h || previous === undefined) return
      const level = index == null || h.isAutoQuality ? null : h.qualityLevels.find((q) => q.index === index)
      const height = level?.height ?? null
      if (height === preferredQuality.value) return
      preferredQuality.value = height
      if (level) onPick(level.label)
    },
  )
}
