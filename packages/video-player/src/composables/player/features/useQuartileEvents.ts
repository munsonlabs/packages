import type { Ref } from 'vue'
import type { StateChangeType } from '@/types/player'
import { QUARTILES } from '@/constants'

export interface UseQuartileEventsReturn {
  checkQuartiles: () => void
  reset: () => void
}

export function useQuartileEvents(current: Ref<number>, total: Ref<number>, fire: (type: StateChangeType) => void): UseQuartileEventsReturn {
  const firedMilestones = new Set<number>()

  function checkQuartiles(): void {
    if (!total.value) return
    const frac = current.value / total.value
    for (const [threshold, type] of QUARTILES) {
      if (!firedMilestones.has(threshold) && frac >= threshold) {
        firedMilestones.add(threshold)
        fire(type)
      }
    }
  }

  function reset(): void {
    firedMilestones.clear()
  }

  return { checkQuartiles, reset }
}
