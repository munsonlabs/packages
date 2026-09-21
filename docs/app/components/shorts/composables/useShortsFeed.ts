import { ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import { fetchShorts, type Short } from '../data/shorts'

export function useShortsFeed() {
  const baseURL = useRuntimeConfig().app.baseURL
  const shorts = ref<Short[]>([])
  const failed = ref(false)
  let next: number | null = 1
  let loading = false
  let generation = 0

  async function loadMore(): Promise<void> {
    if (loading || next === null) return
    loading = true
    const started = generation
    try {
      const page = await fetchShorts(baseURL, next)
      if (started !== generation) return
      shorts.value.push(...page.items)
      next = page.next
    } catch {
      if (started === generation) failed.value = true
    } finally {
      if (started === generation) loading = false
    }
  }

  function refresh(): void {
    generation++
    loading = false
    next = 1
    failed.value = false
    shorts.value = []
    void loadMore()
  }

  return { shorts, failed, loadMore, refresh }
}
