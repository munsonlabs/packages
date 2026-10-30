import { ref, type ComputedRef } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { END_GAP, type Range, type RangeLimits } from '../utils'

/**
 * The clip's range and the limits its handles move in, kept in step with the player: while
 * editing, the player loops the range and seeks to what's being changed.
 */
export function useClipRange(player: ComputedRef<PlayerHandle | null>, isEditing: ComputedRef<boolean>) {
  const range = ref<Range>({ start: 0, end: 0 })
  const limits = ref<RangeLimits>({ min: 0, max: 0, shortest: 0, longest: 0 })

  function setPlan(plan: { range: Range; limits: RangeLimits }): void {
    range.value = plan.range
    limits.value = plan.limits
  }

  function setRange(next: Range, seekTo: number): void {
    range.value = next
    if (!isEditing.value) return
    player.value?.setClipRange(next, { end: 'loop' })
    player.value?.seek(seekTo)
  }

  function seekPreview(at: number): void {
    const { start, end } = range.value
    player.value?.seek(Math.min(Math.max(start, at), Math.max(start, end - END_GAP)))
  }

  return { range, limits, setPlan, setRange, seekPreview }
}
