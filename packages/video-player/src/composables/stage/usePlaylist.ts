/** Pure playlist-position logic for VideoStage's optional `playlist` prop, kept separate so it's testable without mounting VideoStage's DOM setup. */
import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { VideoEntry, VideoSelectDetail } from '@/types/player'

export interface UsePlaylistReturn {
  hasNext: ComputedRef<boolean>
  hasPrevious: ComputedRef<boolean>
  nextEntry: ComputedRef<VideoEntry | null>
  previousEntry: ComputedRef<VideoEntry | null>
}

export function usePlaylist(playlist: Ref<VideoEntry[] | undefined>, current: Ref<VideoSelectDetail | null>): UsePlaylistReturn {
  const currentIndex = computed(() => {
    if (!playlist.value || !current.value) return -1
    return playlist.value.findIndex((entry) => entry.src === current.value?.src)
  })

  const nextEntry = computed(() => {
    if (currentIndex.value === -1 || !playlist.value) return null
    return playlist.value[currentIndex.value + 1] ?? null
  })

  const previousEntry = computed(() => {
    if (currentIndex.value <= 0 || !playlist.value) return null
    return playlist.value[currentIndex.value - 1] ?? null
  })

  const hasNext = computed(() => nextEntry.value !== null)
  const hasPrevious = computed(() => previousEntry.value !== null)

  return { hasNext, hasPrevious, nextEntry, previousEntry }
}
