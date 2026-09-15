import { ref, watch } from 'vue'
import type { VideoEntry } from '@munsonlabs/video-player'

const STORAGE_KEY = 'player:customVideos'

function loadStored(): VideoEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VideoEntry[]) : []
  } catch {
    return []
  }
}

// Module-scoped so every component that calls useCustomVideos() shares the same list.
const customVideos = ref<VideoEntry[]>(loadStored())

watch(
  customVideos,
  (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  },
  { deep: true },
)

function addCustomVideo(entry: VideoEntry): void {
  customVideos.value = [entry, ...customVideos.value]
}

function removeCustomVideo(index: number): void {
  customVideos.value = customVideos.value.filter((_, i) => i !== index)
}

function clearCustomVideos(): void {
  customVideos.value = []
}

export function useCustomVideos() {
  return { customVideos, addCustomVideo, removeCustomVideo, clearCustomVideos }
}
