import { ref, computed, reactive } from 'vue'

const count = ref(0)

export const stageState = reactive<{ currentSrc: string | null; isPlaying: boolean }>({ currentSrc: null, isPlaying: false })

export const hasStage = computed(() => count.value > 0)
export const isStageTucked = ref(false)

export function registerStage(): void {
  count.value++
}

export function unregisterStage(): void {
  count.value--
}
