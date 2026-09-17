import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { SEEK_CATCH_UP_TOLERANCE_S, SEEK_CATCH_UP_TIMEOUT_MS } from '@/constants'
import type { PlayerHandle } from '@/types/player'

export interface UseScrubberReturn {
  scrubbing: ComputedRef<boolean>
  displayPercent: ComputedRef<number>
  previewSeconds: ComputedRef<number>
  onInput: (e: Event) => void
  onChange: (e: Event) => void
  onTouchEnd: (e: TouchEvent) => void
}

export function useScrubber(player: Ref<PlayerHandle | null | undefined>): UseScrubberReturn {
  const dragging = ref(false)
  const previewPercent = ref<number | null>(null)
  let wasPlaying = false
  let catchUpTimer: ReturnType<typeof setTimeout> | null = null
  let changeHandled = false

  const liveProgress = computed(() => {
    const p = player.value
    return p?.total ? (p.current / p.total) * 100 : 0
  })

  const displayPercent = computed(() => previewPercent.value ?? liveProgress.value)
  const scrubbing = computed(() => previewPercent.value !== null)

  const previewSeconds = computed(() => {
    const total = player.value?.total ?? 0
    return (displayPercent.value / 100) * total
  })

  function cancelCatchUp(): void {
    if (catchUpTimer) clearTimeout(catchUpTimer)
    catchUpTimer = null
  }

  function clearPreview(): void {
    cancelCatchUp()
    previewPercent.value = null
  }

  function onInput(e: Event): void {
    const p = player.value
    if (!p?.total) return
    if (!dragging.value) {
      wasPlaying = p.isPlaying
      p.pause()
      dragging.value = true
    }
    cancelCatchUp()
    previewPercent.value = Number((e.target as HTMLInputElement).value)
  }

  function onChange(e: Event): void {
    if (!dragging.value) return
    dragging.value = false
    changeHandled = true
    const p = player.value
    if (!p) return
    const val = Number((e.target as HTMLInputElement).value)
    previewPercent.value = val
    p.seek(val)
    if (wasPlaying) void p.play().catch(() => {})
    cancelCatchUp()
    catchUpTimer = setTimeout(clearPreview, SEEK_CATCH_UP_TIMEOUT_MS)
  }

  /** iOS doesn't fire `change` on a range input after a simple tap (only after a drag).
   *  `touchend` is reliable there, so we handle tap-to-seek here. */
  function onTouchEnd(e: TouchEvent): void {
    if (dragging.value || changeHandled) return
    changeHandled = false
    const p = player.value
    if (!p?.total) return
    const val = Number((e.target as HTMLInputElement).value)
    previewPercent.value = val
    p.seek(val)
    if (wasPlaying) void p.play().catch(() => {})
    cancelCatchUp()
    catchUpTimer = setTimeout(clearPreview, SEEK_CATCH_UP_TIMEOUT_MS)
  }

  watch(
    () => player.value?.current,
    () => {
      const p = player.value
      if (previewPercent.value === null || !p?.total) return
      const targetTime = (previewPercent.value / 100) * p.total
      if (Math.abs(p.current - targetTime) < SEEK_CATCH_UP_TOLERANCE_S) clearPreview()
    },
  )

  onBeforeUnmount(clearPreview)

  return { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchEnd }
}
