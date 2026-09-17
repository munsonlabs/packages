import { describe, it, expect, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { useQuartileEvents } from '@/composables/player/features/useQuartileEvents'

describe('checkQuartiles', () => {
  it('does nothing when total is 0', () => {
    const fire = vi.fn()
    const { checkQuartiles } = useQuartileEvents(ref(50), ref(0), fire)

    checkQuartiles()

    expect(fire).not.toHaveBeenCalled()
  })

  it('fires each milestone once as playback crosses it', () => {
    const fire = vi.fn()
    const current = ref(0)
    const total = ref(100)
    const { checkQuartiles } = useQuartileEvents(current, total, fire)

    current.value = 25
    checkQuartiles()
    expect(fire).toHaveBeenLastCalledWith('firstQuartile')

    current.value = 50
    checkQuartiles()
    expect(fire).toHaveBeenLastCalledWith('midpoint')

    current.value = 75
    checkQuartiles()
    expect(fire).toHaveBeenLastCalledWith('thirdQuartile')

    expect(fire).toHaveBeenCalledTimes(3)
  })

  it('does not re-fire a milestone already passed', () => {
    const fire = vi.fn()
    const current = ref(30)
    const total = ref(100)
    const { checkQuartiles } = useQuartileEvents(current, total, fire)

    checkQuartiles()
    checkQuartiles()
    checkQuartiles()

    expect(fire).toHaveBeenCalledOnce()
  })

  it('fires every milestone already passed when checked for the first time past them all', () => {
    const fire = vi.fn()
    const { checkQuartiles } = useQuartileEvents(ref(90), ref(100), fire)

    checkQuartiles()

    expect(fire).toHaveBeenCalledTimes(3)
  })
})

describe('reset', () => {
  it('lets milestones fire again after a reset', () => {
    const fire = vi.fn()
    const current = ref(25)
    const total = ref(100)
    const { checkQuartiles, reset } = useQuartileEvents(current, total, fire)

    checkQuartiles()
    reset()
    checkQuartiles()

    expect(fire).toHaveBeenCalledTimes(2)
  })
})
