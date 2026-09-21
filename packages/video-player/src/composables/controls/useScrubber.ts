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
    dragging.value = false
    const p = player.value
    if (!p) return
    previewPercent.value = percent
    p.seek(percent)
    if (wasPlaying) void p.play().catch(() => {})
    cancelCatchUp()
    catchUpTimer = setTimeout(clearPreview, SEEK_CATCH_UP_TIMEOUT_MS)
  }

  function onInput(e: Event): void {
    const p = player.value
    if (!p?.total) return
    beginDrag(p)
    cancelCatchUp()
    previewPercent.value = readPercent(e)
  }

  function onChange(e: Event): void {
    if (!dragging.value) return
    changeHandled = true
    commitSeek(readPercent(e))
  }

  /** Each touch starts a fresh gesture: the flag used to latch on the first drag and never clear, which left the tap path below dead for the rest of the component's life. */
  function onTouchStart(): void {
    changeHandled = false
  }

  /**
   * iOS doesn't fire `change` on a range input after a simple tap, only after a drag, so touchend is
   * the reliable commit there. It commits a pending drag too rather than bailing out: bailing left
   * the video paused with the preview stuck on screen whenever `change` never arrived.
   */
  function onTouchEnd(e: TouchEvent): void {
    if (changeHandled) {
      changeHandled = false
      return
    }
    const p = player.value
    if (!p?.total) return
    commitSeek(readPercent(e))
  }

  /** An interrupted gesture (a call, a system sheet) never commits, so put playback back the way it was. */
  function onPointerCancel(): void {
    if (!dragging.value) return
    dragging.value = false
    if (wasPlaying) void player.value?.play().catch(() => {})
    clearPreview()
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

  return { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchStart, onTouchEnd, onPointerCancel }
}
