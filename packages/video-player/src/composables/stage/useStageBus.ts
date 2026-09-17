import { onMounted, onBeforeUnmount } from 'vue'
import { WIN_VIDEO_SELECT, WIN_VIDEO_TOGGLE } from '@/constants'
import type { VideoSelectDetail, VideoToggleDetail } from '@/types/player'

interface StageBusEvents {
  [WIN_VIDEO_SELECT]: VideoSelectDetail
  [WIN_VIDEO_TOGGLE]: VideoToggleDetail
}

export function dispatchStageEvent<K extends keyof StageBusEvents>(name: K, detail: StageBusEvents[K]): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export function useStageEvent<K extends keyof StageBusEvents>(name: K, onEvent: (detail: StageBusEvents[K]) => void): void {
  const listener = (e: Event): void => onEvent((e as CustomEvent<StageBusEvents[K]>).detail)
  onMounted(() => window.addEventListener(name, listener))
  onBeforeUnmount(() => window.removeEventListener(name, listener))
}
