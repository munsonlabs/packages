import type { PlayerContext, HudContext } from '@/composables/player/playerContext'
import { KEYBOARD_SEEK_STEP_S, KEYBOARD_VOLUME_STEP } from '@/constants'

export interface UseKeyboardShortcutsReturn {
  onKeydown: (e: KeyboardEvent) => void
}

const TEXT_ENTRY_SELECTOR = 'input:not([type="range"]), textarea, select, [contenteditable="true"]'
/** A range input (Scrubber/VolumeSlider) only actually consumes arrow/Home/End keys itself - m/f/c/digits/Space have no native effect there and should still fire. */
const RANGE_INPUT_SELECTOR = 'input[type="range"]'
const RANGE_INPUT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])
/** A plain button/link only conflicts with us on Space/Enter (its own activation keys) - every other shortcut should still fire while e.g. FullscreenButton has focus. */
const ACTIVATION_SELECTOR = 'button, a[href]'

export function useKeyboardShortcuts(player: PlayerContext, hud: HudContext): UseKeyboardShortcutsReturn {
  function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val))
  }

  function seekBy(deltaSeconds: number): void {
    if (!player.duration) return
    player.seek(clamp(player.currentTime + deltaSeconds, 0, player.duration))
  }

  function seekToFraction(fraction: number): void {
    if (!player.duration) return
    player.seek(player.duration * fraction)
  }

  function adjustVolume(delta: number): void {
    player.setVolume(clamp(player.volume + delta, 0, 1))
  }

  function toggleCaptions(): void {
    if (!player.supportsCaptions) return
    player.setCaptionTrack(player.activeCaptionIndex === null ? 0 : null)
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as HTMLElement
    if (target.closest(TEXT_ENTRY_SELECTOR)) return
    if (RANGE_INPUT_KEYS.has(e.key) && target.closest(RANGE_INPUT_SELECTOR)) return
    if ((e.key === ' ' || e.key === 'Enter') && target.closest(ACTIVATION_SELECTOR)) return

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault()
        player.togglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        seekBy(-KEYBOARD_SEEK_STEP_S)
        break
      case 'ArrowRight':
        e.preventDefault()
        seekBy(KEYBOARD_SEEK_STEP_S)
        break
      case 'ArrowUp':
        e.preventDefault()
        adjustVolume(KEYBOARD_VOLUME_STEP)
        break
      case 'ArrowDown':
        e.preventDefault()
        adjustVolume(-KEYBOARD_VOLUME_STEP)
        break
      case 'm':
        player.toggleMute()
        break
      case 'f':
        player.toggleFullscreen()
        break
      case 'c':
        toggleCaptions()
        break
      case 'Home':
        e.preventDefault()
        seekToFraction(0)
        break
      case 'End':
        e.preventDefault()
        seekToFraction(1)
        break
      default:
        if (!/^[0-9]$/.test(e.key)) return
        seekToFraction(Number(e.key) / 10)
    }

    hud.onMouseMove()
  }

  return { onKeydown }
}
