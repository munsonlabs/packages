import { requestFullscreen, exitFullscreen as exitDocFullscreen } from '@/utils/platform'
import { getShellEl } from '@/adapters/embeds/embedShared'

export interface FullscreenSupport {
  enterFullscreen(): void
  exitFullscreen(): void
  dispose(): void
}

type IosVideoEl = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitExitFullscreen?: () => void }

/** iOS's video-only fullscreen never touches document.fullscreenElement - forward its own webkit events instead so useFullscreen.ts stays accurate. */
export function createFullscreenSupport(videoEl: HTMLVideoElement, onEnter: () => void, onExit: () => void): FullscreenSupport {
  const forwarders = [
    ['webkitbeginfullscreen', onEnter],
    ['webkitendfullscreen', onExit],
  ] as const
  for (const [name, fn] of forwarders) videoEl.addEventListener(name, fn)

  function enterFullscreen(): void {
    const iosVideoEl = videoEl as IosVideoEl
    if (typeof iosVideoEl.webkitEnterFullscreen === 'function') {
      iosVideoEl.webkitEnterFullscreen()
      return
    }
    const shell = getShellEl(videoEl)
    if (shell) requestFullscreen(shell)
  }

  /** document.exitFullscreen() is a no-op for iOS's webkitEnterFullscreen path - needs the matching webkit call. */
  function exitFullscreen(): void {
    const iosVideoEl = videoEl as IosVideoEl
    if (typeof iosVideoEl.webkitExitFullscreen === 'function') {
      iosVideoEl.webkitExitFullscreen()
      return
    }
    exitDocFullscreen()
  }

  return {
    enterFullscreen,
    exitFullscreen,
    dispose: () => {
      for (const [name, fn] of forwarders) videoEl.removeEventListener(name, fn)
    },
  }
}
