import { ref, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export const HUD_HIDE_DELAY_MS = 3500

export const HUD_MOUSE_LEAVE_HIDE_DELAY_MS = 600

export const HUD_SUPPRESS_MOUSE_LEAVE_MS = 400

export interface UseHudReturn {
  showHUD: Ref<boolean>
  isOpen: Ref<boolean>
  scheduleHide: (delay?: number) => void
  pauseHide: () => void
  onVideoTap: () => void
  onMouseMove: () => void
  onMouseLeave: () => void
  openControls: () => void
  closeControls: (immediate?: boolean) => void
  keepOpen: () => void
  suppressMouseLeave: (ms?: number) => void
}

function holdsKeyboardFocus(): boolean {
  const focused = document.activeElement
  if (!focused?.closest('.overlay__hud, .overlay__popup')) return false
  try {
    return focused.matches(':focus-visible')
  } catch {
    return true
  }
}

export function useHud(isPlaying: Ref<boolean>, isFullscreen: Ref<boolean>): UseHudReturn {
  const showHUD = ref(true)
  const isOpen = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let leaveSuppressedUntil = 0

  function suppressMouseLeave(ms = HUD_SUPPRESS_MOUSE_LEAVE_MS): void {
    leaveSuppressedUntil = Date.now() + ms
  }

  function scheduleHide(delay = HUD_HIDE_DELAY_MS): void {
    clearTimeout(timer ?? undefined)
    timer = setTimeout(() => {
      if (holdsKeyboardFocus()) {
        scheduleHide(delay)
        return
      }
      showHUD.value = false
      isOpen.value = false
    }, delay)
  }

  function pauseHide(): void {
    clearTimeout(timer ?? undefined)
  }

  function openControls(): void {
    isOpen.value = true
    showHUD.value = true
    scheduleHide()
  }

  /**
   * In fullscreen, `popupVisible` (see useOverlayVisibility) tracks `showHUD` rather than `isOpen` - there's no
   * separate collapsed-HUD fallback there, so closing has to drop `showHUD` too or the popup just stays up.
   *
   * `immediate` additionally drops `showHUD` outside fullscreen too - for an explicit "close controls" action
   * (as opposed to a click-elsewhere dismissal), leaving the collapsed HUD to reappear on its own a moment later
   * reads as the close having not really worked.
   */
  function closeControls(immediate = false): void {
    isOpen.value = false
    if (immediate || isFullscreen.value) showHUD.value = false
    if (isPlaying.value) scheduleHide()
  }

  function keepOpen(): void {
    if (isPlaying.value) scheduleHide()
  }

  function onVideoTap(): void {
    showHUD.value = true
    if (isPlaying.value) scheduleHide()
  }

  function onMouseMove(): void {
    showHUD.value = true
    scheduleHide()
  }

  function onMouseLeave(): void {
    if (Date.now() < leaveSuppressedUntil) return
    if (isPlaying.value) scheduleHide(HUD_MOUSE_LEAVE_HIDE_DELAY_MS)
  }

  watch(isPlaying, (playing) => {
    if (!playing) {
      clearTimeout(timer ?? undefined)
      showHUD.value = true
      return
    }
    scheduleHide()
  })

  onBeforeUnmount(() => clearTimeout(timer ?? undefined))

  return {
    showHUD,
    isOpen,
    scheduleHide,
    pauseHide,
    onVideoTap,
    onMouseMove,
    onMouseLeave,
    openControls,
    closeControls,
    keepOpen,
    suppressMouseLeave,
  }
}
