import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerHandle } from '@/types/player'

export const SEEK_CATCH_UP_TOLERANCE_S = 1

export const SEEK_CATCH_UP_TIMEOUT_MS = 3000

export interface UseScrubberReturn {
  scrubbing: ComputedRef<boolean>
  displayPercent: ComputedRef<number>
  previewSeconds: ComputedRef<number>
  onInput: (e: Event) => void
  onChange: (e: Event) => void
  onTouchStart: () => void
  onTouchEnd: (e: TouchEvent) => void
  onPointerCancel: () => void
}

export function useScrubber(player: Ref<PlayerHandle | null | undefined>): UseScrubberReturn {
  const dragging = ref(false)
  const previewPercent = ref<number | null>(null)
  let wasPlaying = false
  let catchUpTimer: ReturnType<typeof setTimeout> | null = null
  let changeHandled = false

  const liveProgress = computed(() => {
    const p = player.value
    return p?.duration ? (p.currentTime / p.duration) * 100 : 0
  })

  const displayPercent = computed(() => previewPercent.value ?? liveProgress.value)
  const scrubbing = computed(() => previewPercent.value !== null)

  const previewSeconds = computed(() => {
    const total = player.value?.duration ?? 0
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

  function beginDrag(p: PlayerHandle): void {
    if (dragging.value) return
    wasPlaying = p.isPlaying
    p.pause()
    dragging.value = true
  }

  function readPercent(e: Event): number {
    return Number((e.target as HTMLInputElement).value)
  }

  function commitSeek(percent: number): void {
    const p = player.value
    if (p && !dragging.value) beginDrag(p)
    dragging.value = false
    if (!p) return
    previewPercent.value = percent
    p.seek((percent * (p.duration || 0)) / 100)
    if (wasPlaying) void p.play().catch(() => {})
    cancelCatchUp()
    catchUpTimer = setTimeout(clearPreview, SEEK_CATCH_UP_TIMEOUT_MS)
  }

  function onInput(e: Event): void {
    const p = player.value
    if (!p?.duration) return
    beginDrag(p)
    cancelCatchUp()
    previewPercent.value = readPercent(e)
  }

  function onChange(e: Event): void {
    if (!dragging.value) return
    changeHandled = true
    commitSeek(readPercent(e))
  }

  function onTouchStart(): void {
    changeHandled = false
  }

  /**
   * iOS doesn't fire `change` on a range input after a simple tap, only after a drag, so touchend is
   * the reliable commit there. It commits a pending drag too rather than bailing out: bailing left
   * the video paused with the preview stuck on screen whenever `change` never arrived.
   *
   * TODO: Look into the webkit events for fullscreen, that may be a better solution?
   */
  function onTouchEnd(e: TouchEvent): void {
    if (changeHandled) {
      changeHandled = false
      return
    }
    const p = player.value
    if (!p?.duration) return
    commitSeek(readPercent(e))
  }

  function onPointerCancel(): void {
    if (!dragging.value) return
    dragging.value = false
    if (wasPlaying) void player.value?.play().catch(() => {})
    clearPreview()
  }

  watch(
    () => player.value?.currentTime,
    () => {
      const p = player.value
      if (previewPercent.value === null || !p?.duration) return
      const targetTime = (previewPercent.value / 100) * p.duration
      if (Math.abs(p.currentTime - targetTime) < SEEK_CATCH_UP_TOLERANCE_S) clearPreview()
    },
  )

  onBeforeUnmount(clearPreview)

  return { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchStart, onTouchEnd, onPointerCancel }
}
