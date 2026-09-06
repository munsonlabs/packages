import { ref, watch } from 'vue'

function storedBool(key: string, fallback = false): boolean {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : raw === 'true'
}

export function usePersisted(key: string, fallback = false) {
  const val = ref(storedBool(key, fallback))
  // Watching rather than persisting only from toggle() covers v-model bindings too (e.g.
  // VideoStage's built-in "Auto" button flips this directly via v-model:auto-advance).
  watch(val, (v) => localStorage.setItem(key, String(v)))
  function toggle() {
    val.value = !val.value
  }
  return { val, toggle }
}

export function usePersistedCycle<T extends string>(key: string, options: readonly T[], fallback: T) {
  const stored = localStorage.getItem(key) as T | null
  const val = ref<T>(stored && options.includes(stored) ? stored : fallback)
  function cycle() {
    const idx = options.indexOf(val.value)
    val.value = options[(idx + 1) % options.length]
    localStorage.setItem(key, val.value)
  }
  return { val, cycle }
}
