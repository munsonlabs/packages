import { PLAYER_SHELL_CLASS } from '@/constants'

/** The element that goes fullscreen and that viewport observers watch: the player's own box, not the <video> inside it. */
export function getShellEl(videoEl: HTMLVideoElement): HTMLElement | null {
  return videoEl.closest(`.${PLAYER_SHELL_CLASS}`)
}
