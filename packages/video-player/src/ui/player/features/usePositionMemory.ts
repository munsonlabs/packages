import { onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { savePosition, getPosition, clearPosition } from '@/preferences/positionMemory'
import { onVisibilityOrBlur } from '@/registries/documentEventRegistry'
import type { PlaybackAdapter } from '@/types/playback'

export interface UsePositionMemoryReturn {
  restoreOnce: (player: PlaybackAdapter) => void
  save: (player: PlaybackAdapter | null) => void
  clear: () => void
}

export function usePositionMemory(videoUrl: string, getPlayer: () => PlaybackAdapter | null, hasEnded: Ref<boolean>): UsePositionMemoryReturn {
  let hasRestored = false

  function restoreOnce(player: PlaybackAdapter): void {
    if (hasRestored) return
    const saved = getPosition(videoUrl)
    if (saved) player.setCurrentTime(saved)
    hasRestored = true
  }

  function save(player: PlaybackAdapter | null): void {
    if (!player || hasEnded.value) return
    savePosition(videoUrl, player.currentTime() ?? 0)
  }

  function clear(): void {
    clearPosition(videoUrl)
  }

  const unregister = onVisibilityOrBlur(() => {
    if (document.visibilityState === 'hidden') save(getPlayer())
  })

  onBeforeUnmount(() => {
    save(getPlayer())
    unregister()
  })

  return { restoreOnce, save, clear }
}
