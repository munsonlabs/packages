import type { Ref } from 'vue'
import type { StateChangeType } from '@/types/player'

export const QUARTILES: Array<[number, StateChangeType]> = [
  [0.25, 'firstQuartile'],
  [0.5, 'midpoint'],
  [0.75, 'thirdQuartile'],
]

export interface QuartileEvents {
  checkQuartiles: () => void
  reset: () => void
}

export function createQuartileEvents(current: Ref<number>, total: Ref<number>, fire: (type: StateChangeType) => void): QuartileEvents {
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
